// src/routes/push.js — inscrição de notificações push (celular) por conta
const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { webpush, vapidReady } = require('../webpush');

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ ok: false, erro: 'Não autenticado' });
  next();
}

// ── GET /vapid-public-key ────────────────────────────────────────────────
router.get('/vapid-public-key', (req, res) => {
  if (!vapidReady) return res.status(503).json({ ok: false, erro: 'Push não configurado no servidor' });
  res.json({ ok: true, publicKey: process.env.VAPID_PUBLIC_KEY });
});

// ── POST /subscribe ──────────────────────────────────────────────────────
router.post('/subscribe', requireAuth, (req, res) => {
  const sub = req.body || {};
  const endpoint = sub.endpoint;
  const p256dh = sub.keys?.p256dh;
  const auth = sub.keys?.auth;
  if (!endpoint || !p256dh || !auth) {
    return res.status(400).json({ ok: false, erro: 'Inscrição de push inválida' });
  }

  const db = getDb();
  db.prepare(`
    INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(endpoint) DO UPDATE SET user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth
  `).run(req.session.userId, endpoint, p256dh, auth);

  res.json({ ok: true });
});

// ── POST /unsubscribe ────────────────────────────────────────────────────
router.post('/unsubscribe', requireAuth, (req, res) => {
  const { endpoint } = req.body || {};
  if (!endpoint) return res.status(400).json({ ok: false, erro: 'Endpoint obrigatório' });

  const db = getDb();
  db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ? AND user_id = ?').run(endpoint, req.session.userId);
  res.json({ ok: true });
});

// ── POST /test ────────────────────────────────────────────────────────────
router.post('/test', requireAuth, async (req, res) => {
  if (!vapidReady) return res.status(503).json({ ok: false, erro: 'Push não configurado no servidor' });

  const db = getDb();
  const subs = db.prepare('SELECT * FROM push_subscriptions WHERE user_id = ?').all(req.session.userId);
  if (subs.length === 0) return res.status(404).json({ ok: false, erro: 'Nenhuma inscrição de push encontrada' });

  const payload = JSON.stringify({
    title: 'LifeQuest',
    body: 'Notificações ativadas — é assim que vão chegar seus lembretes.',
    url: '/',
  });

  let sent = 0;
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      );
      sent += 1;
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        db.prepare('DELETE FROM push_subscriptions WHERE id = ?').run(sub.id);
      }
    }
  }

  res.json({ ok: true, sent });
});

module.exports = router;
