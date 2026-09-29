// src/reminderScheduler.js — varre periodicamente os usuários inscritos em
// push e dispara notificações reais (funcionam com o app fechado) para
// eventos da agenda, o lembrete diário de hábitos pendentes e missões com
// prazo. Espelha a lógica que já existe no frontend (LifeQuest.jsx,
// isEventAlertDue / lembrete de hábitos) mas roda no servidor, então
// funciona mesmo sem o app aberto.
//
// Anti-spam: cada gatilho (evento/dia, lembrete diário, missão/dia) só pode
// gerar um envio por dia por usuário — garantido pela PRIMARY KEY de
// notification_log, não por estado em memória (sobrevive a restart do PM2).
const { getDb } = require('./db');
const { webpush, vapidReady } = require('./webpush');

const CHECK_INTERVAL_MS = 60 * 1000;
const WEEK_DAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const WEEKDAY_TO_IDX = { Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4, Saturday: 5, Sunday: 6 };

function nowInTz(tz) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false, weekday: 'long',
  });
  const parts = Object.fromEntries(fmt.formatToParts(new Date()).map((p) => [p.type, p.value]));
  return {
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
    minutesOfDay: (parts.hour === '24' ? 0 : Number(parts.hour)) * 60 + Number(parts.minute),
    hour: parts.hour === '24' ? 0 : Number(parts.hour),
    weekdayIdx: WEEKDAY_TO_IDX[parts.weekday],
  };
}

// Mesma regra de LifeQuest.jsx:isEventAlertDue, mas com ">=" em vez de "==="
// no minuto exato — o agendador roda a cada 60s (pode não bater o segundo 0
// certinho), então é mais seguro considerar "já passou do horário de aviso,
// hoje" e deixar o notification_log garantir que só sai uma vez.
function isEventAlertDue(ev, tzNow) {
  if (ev.alertMinutes == null || Number(ev.alertMinutes) < 0 || !ev.time) return false;
  const isRightDay = ev.recurring === false ? ev.date === tzNow.dateKey : ev.day === WEEK_DAYS[tzNow.weekdayIdx];
  if (!isRightDay) return false;
  const [h, m] = ev.time.split(':').map(Number);
  const alertAt = h * 60 + m - Number(ev.alertMinutes);
  return tzNow.minutesOfDay >= alertAt;
}

function collectDueNotifications(state, tzNow) {
  const settings = state.settings || {};
  const due = [];

  for (const ev of state.events || []) {
    if (isEventAlertDue(ev, tzNow)) {
      // "alarm" — evento marcado na agenda é o único gatilho tratado como
      // alarme (vibração insistente + notificação que não some sozinha),
      // bem diferente do sino normal de hábito/missão.
      due.push({ kind: 'event', itemKey: String(ev.id), type: 'alarm', title: '⏰ LifeQuest', body: `${ev.title} em ${ev.alertMinutes} min` });
    }
  }

  if (settings.notifHabits !== false && tzNow.hour >= 20) {
    const pending = (state.habits || []).filter((h) => (h.type === 'counter' ? h.progress < h.total : !h.done));
    if (pending.length > 0) {
      const body = pending.length === 1
        ? `Ainda falta 1 hábito hoje: "${pending[0].name}".`
        : `Ainda faltam ${pending.length} hábitos hoje.`;
      due.push({ kind: 'habit-digest', itemKey: 'digest', type: 'reminder', title: '🔔 LifeQuest', body });
    }
  }

  if (settings.notifGoals !== false) {
    for (const m of state.missions || []) {
      if (m.dueDate && !m.done && m.dueDate <= tzNow.dateKey) {
        const body = m.dueDate === tzNow.dateKey ? `Prazo hoje: "${m.title}".` : `Missão "${m.title}" venceu.`;
        due.push({ kind: 'mission', itemKey: String(m.id), type: 'reminder', title: '🔔 LifeQuest', body });
      }
    }
  }

  return due;
}

async function sendToUser(db, userId, subs, notif) {
  const payload = JSON.stringify({ title: notif.title, body: notif.body, type: notif.type, url: '/' });
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      );
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        console.warn(`[Push] inscrição expirada removida (user ${userId}, sub ${sub.id})`);
        db.prepare('DELETE FROM push_subscriptions WHERE id = ?').run(sub.id);
      } else {
        console.warn(`[Push] falha ao enviar para user ${userId}:`, err.message);
      }
    }
  }
}

async function tick() {
  if (!vapidReady) return;
  const db = getDb();

  const allSubs = db.prepare('SELECT * FROM push_subscriptions').all();
  if (allSubs.length === 0) return;

  const subsByUser = new Map();
  for (const sub of allSubs) {
    if (!subsByUser.has(sub.user_id)) subsByUser.set(sub.user_id, []);
    subsByUser.get(sub.user_id).push(sub);
  }

  const markSent = db.prepare(
    'INSERT OR IGNORE INTO notification_log (user_id, kind, item_key, day) VALUES (?, ?, ?, ?)'
  );

  for (const [userId, subs] of subsByUser) {
    const row = db.prepare('SELECT state_json FROM game_state WHERE user_id = ?').get(userId);
    if (!row) continue;

    let state;
    try { state = JSON.parse(row.state_json); } catch { continue; }

    const tz = state.settings?.timezone || 'America/Sao_Paulo';
    const tzNow = nowInTz(tz);
    const due = collectDueNotifications(state, tzNow);

    for (const notif of due) {
      const result = markSent.run(userId, notif.kind, notif.itemKey, tzNow.dateKey);
      if (result.changes === 1) {
        await sendToUser(db, userId, subs, notif);
      }
    }
  }
}

function start() {
  if (!vapidReady) return;
  setInterval(() => { tick().catch((err) => console.error('[Push] erro no agendador:', err)); }, CHECK_INTERVAL_MS);
  console.log('[Push] agendador de lembretes iniciado');
}

module.exports = { start };
