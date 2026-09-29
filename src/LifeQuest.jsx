import React, { useState, useEffect, useMemo, useRef } from "react";
import { authMe, authLogout, deleteAccount, getState, putState, testPush } from "./api";
import { getPushPermission, hasActivePushSubscription, subscribeToPush, unsubscribeFromPush } from "./pushNotifications";
import {
  LayoutDashboard, ListChecks, Swords, User as UserIcon, CalendarDays,
  BookOpen, BarChart3, Settings, Flame, Droplet, Dumbbell, Moon, Brain,
  Check, Plus, TrendingUp, Award, Shield, Sparkles, Trophy, Target,
  Book, Zap, Star, GraduationCap, Minus, CircleCheck, Bell, X,
  Trash2, Quote, MoreHorizontal, AlarmClock,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
// Estilos do app (variáveis de tema + todas as classes "lq-*" usadas abaixo)
import "./lifequest.css";
import Onboarding from "./Onboarding";
import DashboardBg from "./DashboardBg";

/* ============================================================ tokens ============================================================ */
const ICON_MAP = {
  droplet: Droplet, dumbbell: Dumbbell, graduationCap: GraduationCap, book: Book,
  brain: Brain, moon: Moon, flame: Flame, star: Star, target: Target, shield: Shield,
  sparkles: Sparkles, trophy: Trophy, swords: Swords, bookOpen: BookOpen, zap: Zap,
  bell: Bell, trendingUp: TrendingUp, alarmClock: AlarmClock,
};
const iconFor = (key) => ICON_MAP[key] || Sparkles;

// "purple" é o tema padrão agora — as outras opções (incl. "mono",
// preto/cinza sem cor viva) continuam disponíveis pra quem preferir.
const ACCENT_HEX = { mono: "#E5E5E5", purple: "#7C3AED", blue: "#3B82F6", green: "#22C55E", amber: "#F59E0B" };
const ACCENT_PAIR = { mono: "#A3A3A3", purple: "#3B82F6", blue: "#7C3AED", green: "#3B82F6", amber: "#7C3AED" };
const ACCENT_SOFT = { mono: "#D4D4D8", purple: "#C4B5FD", blue: "#93C5FD", green: "#86EFAC", amber: "#FCD34D" };
const ACCENT_CHOICES = ["mono", "purple", "blue", "amber", "green"];
const CATEGORY_COLOR = { Saúde: "blue", Estudo: "purple", Produtividade: "amber", "Bem-estar": "green" };

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "habitos", label: "Hábitos", icon: ListChecks },
  { id: "missoes", label: "Missões", icon: Swords },
  { id: "agenda", label: "Agenda", icon: CalendarDays },
  { id: "desenvolvimento", label: "Desenvolvimento", icon: TrendingUp },
  { id: "artigos", label: "Artigos", icon: GraduationCap },
  { id: "diario", label: "Diário", icon: BookOpen },
  { id: "estatisticas", label: "Estatísticas", icon: BarChart3 },
  { id: "perfil", label: "Perfil", icon: UserIcon },
  { id: "config", label: "Configurações", icon: Settings },
];
const VIEW_TITLES = Object.fromEntries(NAV_ITEMS.map((n) => [n.id, n.label]));
const MOBILE_NAV = ["dashboard", "habitos", "missoes", "agenda", "perfil"];
// Resto dos destinos, escondidos atrás do botão "Mais" na barra inferior do mobile.
const MOBILE_NAV_MORE = NAV_ITEMS.filter((n) => !MOBILE_NAV.includes(n.id)).map((n) => n.id);
const WEEK_DAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

const TITLES = [
  { min: 0, name: "Iniciante" },
  { min: 5, name: "Aprendiz Disciplinado" },
  { min: 10, name: "Guerreiro da Rotina" },
  { min: 20, name: "Mestre dos Hábitos" },
  { min: 35, name: "Lenda Viva" },
];
const getTitle = (level) => TITLES.reduce((acc, t) => (level >= t.min ? t.name : acc), TITLES[0].name);
const RANKS = [
  { min: 0, name: "Bronze", hex: "#B08D57" },
  { min: 10, name: "Prata", hex: "#B8C0CC" },
  { min: 20, name: "Ouro", hex: "#F5C542" },
  { min: 35, name: "Platina", hex: "#8FD9E8" },
  { min: 50, name: "Diamante", hex: "#B9F2FF" },
];
const getRank = (level) => RANKS.reduce((acc, r) => (level >= r.min ? r : acc), RANKS[0]);

const EVENT_TYPES = {
  treino: { label: "Treino", icon: "dumbbell", color: "purple" },
  estudo: { label: "Estudo", icon: "graduationCap", color: "blue" },
  leitura: { label: "Leitura", icon: "book", color: "amber" },
  reuniao: { label: "Reunião", icon: "bookOpen", color: "green" },
  outro: { label: "Outro", icon: "sparkles", color: "purple" },
};

const MOOD_LEVELS = [
  { v: 1, label: "Péssimo", color: "#EF4444" },
  { v: 2, label: "Ruim", color: "#F59E0B" },
  { v: 3, label: "Ok", color: "#A1A1AA" },
  { v: 4, label: "Bom", color: "#3B82F6" },
  { v: 5, label: "Ótimo", color: "#22C55E" },
];

const HABIT_ICON_CHOICES = ["droplet", "dumbbell", "graduationCap", "book", "brain", "moon", "flame", "target", "shield", "sparkles"];
const HABIT_COLOR_CHOICES = ["purple", "blue", "amber", "green"];
const CATEGORY_CHOICES = ["Saúde", "Estudo", "Produtividade", "Bem-estar"];
const AVATAR_ICON_CHOICES = ["sparkles", "swords", "shield", "flame", "star", "zap"];

// Sugestões prontas pro estado vazio de Hábitos — clicar já cria, sem abrir
// modal, pra quem chega sem ideia do que cadastrar primeiro.
const HABIT_SUGGESTIONS = [
  { name: "Beber água", category: "Saúde", icon: "droplet", color: "blue", type: "check", goal: "2L", xp: 10, done: false },
  { name: "Dormir cedo", category: "Saúde", icon: "moon", color: "purple", type: "check", goal: "Antes das 23h", xp: 10, done: false },
  { name: "Treinar", category: "Saúde", icon: "dumbbell", color: "green", type: "check", goal: "30 min", xp: 15, done: false },
  { name: "Ler", category: "Estudo", icon: "book", color: "amber", type: "counter", total: 20, xp: 15, progress: 0 },
  { name: "Meditar", category: "Bem-estar", icon: "brain", color: "purple", type: "check", goal: "10 min", xp: 10, done: false },
  { name: "Organizar o dia", category: "Produtividade", icon: "target", color: "blue", type: "check", goal: "Revisar tarefas", xp: 10, done: false },
];

// Trilhas da tela "Desenvolvimento". Cada trilha tem 2 estágios: um passo
// único de baixíssima fricção (missão, quebra a inércia — a pessoa só
// precisa decidir uma vez) e um hábito diário que sustenta o progresso e
// vira identidade ("sou alguém que pratica X"). Só aparece o próximo
// estágio disponível — nada de lista estática repetida sempre que o
// usuário abre a tela, o que mataria o efeito de novidade/conquista.
const DEV_TRACKS = [
  {
    id: "idiomas",
    title: "Idiomas",
    icon: "graduationCap",
    color: "blue",
    blurb: "Ninguém aprende um idioma de uma vez. Aprende 15 minutos por dia, por meses. Comece pelo menor passo possível.",
    stages: [
      { tag: "idiomas-1", kind: "mission", label: "Aprender 5 palavras novas em inglês",
        data: { title: "Aprender 5 palavras novas em inglês", xp: 15, icon: "graduationCap", devTag: "idiomas-1" } },
      { tag: "idiomas-2", kind: "habit", label: "Virar hábito: praticar inglês 15 min/dia",
        data: { name: "Praticar inglês", category: "Estudo", icon: "graduationCap", color: "blue", type: "check", goal: "15 min", xp: 15, done: false, devTag: "idiomas-2" } },
    ],
  },
  {
    id: "leitura",
    title: "Leitura & Conhecimento",
    icon: "book",
    color: "amber",
    blurb: "Quem lê um pouco todo dia, no fim do ano leu vários livros sem perceber o esforço. O segredo é nunca pular um dia.",
    stages: [
      { tag: "leitura-1", kind: "mission", label: "Escolher o próximo livro ou curso",
        data: { title: "Escolher o próximo livro ou curso", xp: 10, icon: "book", devTag: "leitura-1" } },
      { tag: "leitura-2", kind: "habit", label: "Virar hábito: ler 10 páginas por dia",
        data: { name: "Ler", category: "Estudo", icon: "book", color: "amber", type: "counter", total: 10, xp: 15, progress: 0, devTag: "leitura-2" } },
    ],
  },
  {
    id: "mentalidade",
    title: "Mentalidade & Foco",
    icon: "brain",
    color: "purple",
    blurb: "Sua mente é um músculo. Quem treina o foco por alguns minutos por dia sustenta atenção muito melhor sob pressão.",
    stages: [
      { tag: "mentalidade-1", kind: "mission", label: "Escrever 3 coisas que quero melhorar em mim",
        data: { title: "Escrever 3 coisas que quero melhorar em mim", xp: 10, icon: "brain", devTag: "mentalidade-1" } },
      { tag: "mentalidade-2", kind: "habit", label: "Virar hábito: 5 min de foco/respiração antes do dia",
        data: { name: "Foco antes do dia", category: "Bem-estar", icon: "brain", color: "purple", type: "check", goal: "5 min", xp: 10, done: false, devTag: "mentalidade-2" } },
    ],
  },
  {
    id: "habilidades",
    title: "Habilidades & Produtividade",
    icon: "target",
    color: "green",
    blurb: "Toda habilidade nova parece impossível até virar rotina. Escolha uma e dê 20 minutos por dia a ela — nada mais.",
    stages: [
      { tag: "habilidades-1", kind: "mission", label: "Escolher uma habilidade nova pra essa semana",
        data: { title: "Escolher uma habilidade nova pra essa semana", xp: 10, icon: "target", devTag: "habilidades-1" } },
      { tag: "habilidades-2", kind: "habit", label: "Virar hábito: praticar a habilidade 20 min/dia",
        data: { name: "Praticar habilidade nova", category: "Produtividade", icon: "target", color: "green", type: "check", goal: "20 min", xp: 15, done: false, devTag: "habilidades-2" } },
    ],
  },
  {
    id: "financas",
    title: "Finanças Pessoais",
    icon: "shield",
    color: "green",
    blurb: "Dinheiro se organiza do mesmo jeito que um hábito: um pouco de atenção todo dia vale mais que uma faxina financeira ocasional.",
    stages: [
      { tag: "financas-1", kind: "mission", label: "Anotar todos os gastos de hoje",
        data: { title: "Anotar todos os gastos de hoje", xp: 10, icon: "shield", devTag: "financas-1" } },
      { tag: "financas-2", kind: "habit", label: "Virar hábito: revisar os gastos do dia",
        data: { name: "Revisar gastos do dia", category: "Produtividade", icon: "shield", color: "green", type: "check", goal: "Antes de dormir", xp: 10, done: false, devTag: "financas-2" } },
    ],
  },
  {
    id: "criatividade",
    title: "Criatividade",
    icon: "zap",
    color: "amber",
    blurb: "Ideias boas vêm de quem pratica criar, não de quem espera a inspiração. Reserve um tempo curto todo dia só pra criar, sem cobrar resultado.",
    stages: [
      { tag: "criatividade-1", kind: "mission", label: "Escrever ou desenhar uma ideia nova, sem julgar se é boa",
        data: { title: "Escrever ou desenhar uma ideia nova, sem julgar se é boa", xp: 10, icon: "zap", devTag: "criatividade-1" } },
      { tag: "criatividade-2", kind: "habit", label: "Virar hábito: 15 min de criação livre por dia",
        data: { name: "Criação livre", category: "Produtividade", icon: "zap", color: "amber", type: "check", goal: "15 min", xp: 15, done: false, devTag: "criatividade-2" } },
    ],
  },
  {
    id: "gratidao",
    title: "Gratidão & Bem-estar emocional",
    icon: "star",
    color: "purple",
    blurb: "Quem presta atenção no que já tem sofre menos com o que falta. Um minuto de gratidão muda o tom do dia inteiro.",
    stages: [
      { tag: "gratidao-1", kind: "mission", label: "Escrever 3 coisas pelas quais você é grato hoje",
        data: { title: "Escrever 3 coisas pelas quais você é grato hoje", xp: 10, icon: "star", devTag: "gratidao-1" } },
      { tag: "gratidao-2", kind: "habit", label: "Virar hábito: anotar 1 coisa boa do dia antes de dormir",
        data: { name: "Gratidão do dia", category: "Bem-estar", icon: "star", color: "purple", type: "check", goal: "Antes de dormir", xp: 10, done: false, devTag: "gratidao-2" } },
    ],
  },
  {
    id: "relacionamentos",
    title: "Relacionamentos",
    icon: "sparkles",
    color: "blue",
    blurb: "Vínculos fortes não acontecem sozinhos — pedem pequenos gestos constantes: uma mensagem, uma ligação, um convite.",
    stages: [
      { tag: "relacionamentos-1", kind: "mission", label: "Mandar mensagem pra alguém que você não fala há tempos",
        data: { title: "Mandar mensagem pra alguém que você não fala há tempos", xp: 10, icon: "sparkles", devTag: "relacionamentos-1" } },
      { tag: "relacionamentos-2", kind: "habit", label: "Virar hábito: manter contato com alguém importante toda semana",
        data: { name: "Contato semanal", category: "Bem-estar", icon: "sparkles", color: "blue", type: "check", goal: "1x por semana", xp: 15, done: false, devTag: "relacionamentos-2" } },
    ],
  },
];
function isDevStageAdded(st, tag) {
  return st.habits.some((h) => h.devTag === tag) || st.missions.some((m) => m.devTag === tag) || st.weeklyMissions.some((m) => m.devTag === tag);
}
// Rótulo do marco de sequência do hábito que sustenta a trilha — dá vida
// ao card depois que os dois estágios já foram adicionados, em vez de uma
// mensagem estática que nunca muda.
function devMilestoneLabel(streak) {
  if (streak >= 100) return "Trilha lendária";
  if (streak >= 30) return "Trilha dominada";
  if (streak >= 7) return "Hábito formado";
  return null;
}

/* ============================================================ cache offline ============================================================ */
// Guarda a última conta+progresso sincronizados com sucesso, num par de
// chaves fixas no localStorage. Sem internet, o boot normal (authMe +
// getState) nunca responde — sem esse cache a pessoa ficaria presa na tela
// de login mesmo já tendo usado o app antes neste aparelho. Com o cache,
// abre direto no que foi salvo da última vez (agenda, alarme etc. seguem
// funcionando, já que rodam só com o relógio do aparelho).
const OFFLINE_CACHE_KEY = "lifequest.offlineCache";

function loadOfflineCache() {
  try {
    const raw = localStorage.getItem(OFFLINE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.account && parsed?.state ? parsed : null;
  } catch {
    return null;
  }
}

function saveOfflineCache(account, state) {
  try {
    localStorage.setItem(OFFLINE_CACHE_KEY, JSON.stringify({ account, state }));
  } catch {
    // localStorage cheio/bloqueado — só perde o cache offline, não é crítico
  }
}

function clearOfflineCache() {
  try {
    localStorage.removeItem(OFFLINE_CACHE_KEY);
  } catch {}
}

/* ============================================================ estado inicial ============================================================ */
// Configurações padrão de um jogador novo — nada aqui é "exemplo", é o que
// toda conta começa tendo de verdade.
const DEFAULT_SETTINGS = {
  characterName: "", avatarIcon: "sparkles", theme: "dark", accent: "purple",
  notifHabits: true, notifCelebrate: true, notifGoals: true, sound: true,
  timezone: "America/Sao_Paulo", dateFormat: "dd/mm/aaaa", units: "metrico",
};

const uid = () => Date.now() + Math.floor(Math.random() * 1000);

// App começa zerado: sem hábitos, missões, metas, eventos ou diário de
// mentira. xpLog guarda, por dia ("YYYY-MM-DD"), quanto XP foi ganho
// naquele dia — é a partir dele que os gráficos de evolução são montados.
function defaultState() {
  return {
    level: 1, xp: 0, habits: [], missions: [], weeklyMissions: [], goals: [],
    events: [], journal: [], notifications: [], xpLog: {}, settings: DEFAULT_SETTINGS,
  };
}

/* ============================================================ datas e histórico ============================================================ */
// Chave "YYYY-MM-DD" no fuso local (evita o problema do toISOString, que
// usa UTC e podia "trocar de dia" mais cedo/tarde dependendo do horário).
function dateKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// "aaaa-mm-dd" (formato de <input type="date">) -> "dd/mm", pra exibir prazo
// de missão de forma compacta num chip.
function formatDateBr(isoDate) {
  const [, m, d] = isoDate.split("-");
  return `${d}/${m}`;
}

// Sequência atual de um hábito: conta quantos dias consecutivos (contando
// hoje para trás) existem em habit.history. Derivado a cada render — sem
// campo "streak" guardado que possa ficar desatualizado.
function computeStreak(history, today = new Date()) {
  let streak = 0;
  const cursor = new Date(today);
  while (history[dateKey(cursor)]) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

// Últimos 7 dias (mais antigo primeiro, hoje por último) como 0/1, pros
// pontinhos de "semana" ao lado de cada hábito.
function computeWeek(history, today = new Date()) {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(history[dateKey(d)] ? 1 : 0);
  }
  return days;
}

// marcos de sequência que geram uma notificação real na hora que são batidos
const STREAK_MILESTONES = [7, 14, 30, 60, 100, 200, 365];

const WEEKDAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]; // indexado por Date#getDay()
const MONTH_SHORT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

// Monta os dados do gráfico "Evolução de XP" a partir do xpLog real —
// substitui os arrays fixos que existiam antes. "semana" soma os últimos
// 7 dias, "mes" agrupa os últimos 28 dias em 4 semanas e "ano" agrupa os
// últimos 12 meses.
function buildChartData(xpLog, range, today = new Date()) {
  if (range === "semana") {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      days.push({ label: WEEKDAY_SHORT[d.getDay()], xp: xpLog[dateKey(d)] || 0 });
    }
    return days;
  }
  if (range === "mes") {
    const weeks = [0, 0, 0, 0];
    for (let i = 27; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const bucket = Math.floor((27 - i) / 7);
      weeks[bucket] += xpLog[dateKey(d)] || 0;
    }
    return weeks.map((xp, i) => ({ label: `Sem ${i + 1}`, xp }));
  }
  const months = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    let sum = 0;
    for (const key in xpLog) {
      const kd = new Date(`${key}T00:00:00`);
      if (kd.getFullYear() === d.getFullYear() && kd.getMonth() === d.getMonth()) sum += xpLog[key];
    }
    months.push({ label: MONTH_SHORT[d.getMonth()], xp: sum });
  }
  return months;
}

// Quantos XP são necessários para completar um nível. Mantido simples e fixo
// (o dashboard original já usava "3000 - st.xp" para a barra de progresso).
const XP_PER_LEVEL = 3000;

// Soma XP ao estado do jogador e resolve "sobe de nível" quando o total
// ultrapassa XP_PER_LEVEL (suporta ganhar XP suficiente para subir mais de
// um nível de uma vez, por isso o while em vez de um if).
function applyXp(state, amount) {
  const startLevel = state.level;
  let level = state.level;
  let xp = state.xp + amount;
  while (xp >= XP_PER_LEVEL) {
    xp -= XP_PER_LEVEL;
    level += 1;
  }
  while (xp < 0) {
    if (level <= 1) { xp = 0; break; }
    level -= 1;
    xp += XP_PER_LEVEL;
  }
  // registra o ganho/perda de XP no dia de hoje — é isso que alimenta os
  // gráficos de "Evolução de XP" e o stat "XP ganho hoje"
  const key = dateKey();
  const xpLog = { ...state.xpLog, [key]: (state.xpLog[key] || 0) + amount };
  return { ...state, level, xp, xpLog, leveledUp: level > startLevel };
}

// Acrescenta uma notificação real (não some sozinha como o toast) —
// usado para marcos que valem a pena ficar registrados, tipo subir de nível.
function pushNotification(state, icon, text) {
  return { ...state, notifications: [{ id: uid(), icon, text, read: false }, ...state.notifications] };
}

// Evento recorrente repete todo dia da semana marcado (sem data). Evento
// único (recurring: false) só dispara na data exata — o alerta compara o
// dia certo (semana ou data) e o minuto exato de (horário - X min antes).
function isEventAlertDue(ev, now) {
  if (ev.alertMinutes == null || Number(ev.alertMinutes) < 0) return false;
  const isRightDay = ev.recurring === false ? ev.date === dateKey(now) : ev.day === WEEK_DAYS[(now.getDay() + 6) % 7];
  if (!isRightDay) return false;
  const [h, m] = ev.time.split(":").map(Number);
  const alertAt = h * 60 + m - Number(ev.alertMinutes);
  return now.getHours() * 60 + now.getMinutes() === alertAt;
}

// AudioContext único e reaproveitado — o navegador cria um AudioContext
// "suspenso" (mudo) quando ele nasce fora de um toque direto do usuário
// (política de autoplay do celular), o que acontecia toda vez que o alarme
// disparava sozinho via setInterval. Mantendo um só, criado/destravado no
// primeiro toque na tela (ver useUnlockAudio no componente raiz) e sempre
// tentando retomá-lo antes de tocar, o som passa a funcionar mesmo quando o
// disparo em si não veio de um clique.
let sharedAudioCtx = null;
function getSharedAudioCtx() {
  if (!sharedAudioCtx) {
    try {
      sharedAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      return null;
    }
  }
  if (sharedAudioCtx.state === "suspended") sharedAudioCtx.resume().catch(() => {});
  return sharedAudioCtx;
}

// Beep curto via Web Audio API — evita depender de um arquivo de áudio.
function playAlertBeep() {
  try {
    const ctx = getSharedAudioCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch {}
}

// Alarme de evento da agenda — bem mais chamativo que o beep de hábito/
// missão: toca em loop até alguém desligar (ringAlarmLoop), igual um
// despertador de verdade, em vez de um beep único que passa despercebido.
// Só funciona com o app aberto na aba (a versão de app fechado é a
// notificação push, que não dá pra tocar áudio customizado).
function playAlarmBurst(ctx) {
  // dois tons graves-agudos junto (tipo sirene curta) + 1 apito seco — mais
  // "sério"/urgente do que uma sequência de beeps agudos iguais.
  const now = ctx.currentTime;
  [523.25, 659.25].forEach((freq) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "square";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc.start(now);
    osc.stop(now + 0.5);
  });
  const tick = ctx.createOscillator();
  const tickGain = ctx.createGain();
  tick.connect(tickGain);
  tickGain.connect(ctx.destination);
  tick.type = "square";
  tick.frequency.value = 1046.5;
  tickGain.gain.setValueAtTime(0.16, now + 0.55);
  tickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.72);
  tick.start(now + 0.55);
  tick.stop(now + 0.72);
}

// Inicia o alarme em loop; retorna a função pra desligar. Para sozinho
// depois de 2 min sem ninguém desligar, pra não ficar tocando pra sempre
// se a pessoa saiu da aba.
function ringAlarmLoop() {
  const ctx = getSharedAudioCtx();
  if (!ctx) return () => {};
  playAlarmBurst(ctx);
  const interval = setInterval(() => {
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    playAlarmBurst(ctx);
  }, 1400);
  const timeout = setTimeout(() => stop(), 2 * 60 * 1000);
  function stop() {
    clearInterval(interval);
    clearTimeout(timeout);
    // não fecha o ctx — é compartilhado, continua servindo os próximos beeps
  }
  return stop;
}

/* ============================================================ tiny pieces ============================================================ */
function NavItem({ icon: Icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className={"lq-reset lq-focus lq-nav-item" + (active ? " active" : "")}>
      <Icon size={17} strokeWidth={2} />
      <span>{label}</span>
    </button>
  );
}

function XpRing({ pct, size = 96, stroke = 6, accent, pair, children }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const gid = "lqRingGrad" + size;
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} className="-rotate-90" style={{ position: "absolute", inset: 0 }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`url(#${gid})`} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * (1 - Math.min(1, Math.max(0, pct)))}
          className="lq-ring-progress" />
        <defs>
          <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: accent }} />
            <stop offset="100%" style={{ stopColor: pair }} />
          </linearGradient>
        </defs>
      </svg>
      <div style={{ position: "absolute", inset: 0 }} className="flex items-center justify-center">{children}</div>
    </div>
  );
}

function ProgressBar({ pct, color = "var(--accent)", height = 6 }) {
  return (
    <div className="lq-track" style={{ height }}>
      <div className="lq-track-fill" style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: color }} />
    </div>
  );
}

function WeekDots({ week, accent }) {
  return (
    <div className="flex gap-1.5">
      {week.map((d, i) => (
        <div key={i} className="lq-week-dot" style={{ background: d ? accent : "var(--border)", opacity: i === 6 ? 1 : d ? 0.85 : 0.6 }} />
      ))}
    </div>
  );
}

function Toggle({ checked, onChange, disabled }) {
  return (
    <button onClick={() => !disabled && onChange(!checked)} disabled={disabled}
      className={"lq-reset lq-focus lq-switch" + (checked ? " on" : "")} role="switch" aria-checked={checked}
      style={disabled ? { opacity: 0.6, cursor: "default" } : undefined}>
      <span className="lq-switch-knob" />
    </button>
  );
}

function Modal({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="lq-modal-backdrop" onClick={onClose}>
      <div className="lq-modal-card lq-scroll" onClick={(e) => e.stopPropagation()}>
        <div className="lq-modal-head">
          <h3 className="lq-display font-semibold text-[15px]">{title}</h3>
          <button className="lq-reset lq-focus lq-modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="flex flex-col gap-4">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium" style={{ color: "var(--text-dim)" }}>{label}</span>
      {children}
    </label>
  );
}

function StatCard({ icon: Icon, label, value, sub, color = "purple", delay = 0 }) {
  return (
    <div className="lq-card lq-animate p-5" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-center justify-between mb-4">
        <div className="lq-icon-badge" style={{ background: `${ACCENT_HEX[color]}1F`, color: ACCENT_HEX[color] }}><Icon size={17} strokeWidth={2.2} /></div>
        <TrendingUp size={14} color="#3f9d5c" />
      </div>
      <p className="lq-mono text-2xl font-semibold tracking-tight">{value}</p>
      <p className="text-xs mt-1" style={{ color: "var(--text-dim)" }}>{label}{sub ? <span style={{ color: "var(--text-faint)" }}> {sub}</span> : null}</p>
    </div>
  );
}

/* ============================================================ dashboard ============================================================ */
function DashboardView({
  st, accent, pair, onCheckHabit, popupId, chartRange, setChartRange, chartData,
  questTitle, coachTip, quoteOfDay, todayXp, bestStreak, onOpenAddGoal, onBumpGoal, onDeleteGoal,
}) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const doneToday = st.habits.filter((h) => (h.type === "counter" ? h.progress >= h.total : h.done)).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="lq-card lq-glass lq-animate p-6 md:p-7">
        <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-8">
          <XpRing pct={st.xp / XP_PER_LEVEL} size={100} accent={accent} pair={pair}>
            {React.createElement(iconFor(st.settings.avatarIcon), { size: 26, color: accent })}
          </XpRing>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="lq-display text-xl md:text-2xl font-semibold">{greeting}{st.settings.characterName ? `, ${st.settings.characterName}` : ""}</h1>
              <span className="lq-level-pill">Nível {st.level}</span>
            </div>
            <p className="text-sm mt-1" style={{ color: "var(--text-dim)" }}>Faltam <span className="lq-mono" style={{ color: "var(--accent-soft)" }}>{XP_PER_LEVEL - st.xp} XP</span> para o próximo nível — {getTitle(st.level)}.</p>
            <div className="mt-3"><ProgressBar pct={(st.xp / XP_PER_LEVEL) * 100} /></div>
          </div>
          <div className="flex md:flex-col gap-4 md:gap-2 md:text-right">
            <div className="flex items-center gap-2 justify-end">
              <Flame size={20} color="#F59E0B" className="lq-flame" fill="#F59E0B" />
              <span className="lq-mono text-lg font-semibold">{bestStreak}</span>
              <span className="text-xs" style={{ color: "var(--text-dim)" }}>dias</span>
            </div>
            <div className="lq-quest-pill"><Swords size={13} /><span>{questTitle}</span></div>
          </div>
        </div>
      </div>

      <div className="lq-card lq-quote-card lq-animate p-5" style={{ animationDelay: "40ms", "--lq-quote-accent": accent }}>
        <div className="flex items-center gap-2 mb-2">
          <div className="lq-icon-badge" style={{ width: 26, height: 26, background: `${accent}1F`, color: accent }}><Quote size={13} /></div>
          <span className="text-xs font-medium" style={{ color: "var(--text-dim)" }}>Frase do dia</span>
        </div>
        <p className="lq-quote-text">{quoteOfDay}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Zap} label="XP ganho hoje" value={todayXp >= 0 ? `+${todayXp}` : todayXp} color="mono" delay={0} />
        <StatCard icon={Flame} label="Melhor sequência" value={`${bestStreak} dias`} color="amber" delay={40} />
        <StatCard icon={CircleCheck} label="Hábitos concluídos" value={`${doneToday}/${st.habits.length}`} color="green" delay={80} />
        <StatCard icon={Swords} label="Missões ativas" value={`${st.missions.filter((m) => !m.done).length}`} color="blue" delay={120} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* sem lq-animate aqui: a transição de transform atrasa a primeira
            medição do ResponsiveContainer do recharts e corta o gráfico */}
        <div className="lq-card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-1">
            <h3 className="lq-display font-medium text-[15px]">Evolução de XP</h3>
            <div className="lq-segmented">
              {["semana", "mes", "ano"].map((r) => (
                <button key={r} onClick={() => setChartRange(r)} className={"lq-reset lq-focus lq-segment" + (chartRange === r ? " active" : "")}>
                  {r === "semana" ? "Semana" : r === "mes" ? "Mês" : "Ano"}
                </button>
              ))}
            </div>
          </div>
          <div style={{ height: 200 }} className="mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 6, left: 14, bottom: 0 }}>
                <defs>
                  <linearGradient id="lqAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={accent} stopOpacity={0.45} />
                    <stop offset="100%" stopColor={accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" interval={0} tick={{ fill: "var(--text-faint)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12 }}
                  labelStyle={{ color: "var(--text)" }} itemStyle={{ color: accent }} />
                <Area type="monotone" dataKey="xp" stroke={accent} strokeWidth={2.5} fill="url(#lqAreaGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lq-card lq-animate p-5" style={{ animationDelay: "200ms" }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="lq-icon-badge" style={{ width: 26, height: 26, background: `${accent}1F`, color: accent }}><Sparkles size={13} /></div>
            <h3 className="lq-display font-medium text-[15px]">Coach</h3>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-dim)" }}>{coachTip}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="lq-card lq-animate p-5" style={{ animationDelay: "240ms" }}>
          <h3 className="lq-display font-medium text-[15px] mb-4">Hábitos de hoje</h3>
          {st.habits.length === 0 && <p className="lq-empty">Crie seu primeiro hábito na aba "Hábitos".</p>}
          <div className="flex flex-col gap-3">
            {st.habits.slice(0, 4).map((h) => {
              const Icon = iconFor(h.icon);
              const isDone = h.type === "counter" ? h.progress >= h.total : h.done;
              return (
                <div key={h.id} className="flex items-center gap-3 relative">
                  {popupId === h.id && <span className="lq-xp-popup lq-mono">+{h.xp} XP</span>}
                  <div className="lq-icon-badge" style={{ background: `${ACCENT_HEX[h.color]}1F`, color: ACCENT_HEX[h.color] }}><Icon size={15} /></div>
                  <span className="text-sm flex-1 truncate">{h.name}</span>
                  {h.type === "check" ? (
                    <button onClick={() => onCheckHabit(h.id)} className={"lq-reset lq-focus lq-check-btn small" + (isDone ? " done" : "") + (popupId === h.id ? " lq-pulse" : "")}><Check size={11} strokeWidth={3} /></button>
                  ) : (
                    <span className="lq-mono text-xs" style={{ color: "var(--text-faint)" }}>{h.progress}/{h.total}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="lq-card lq-animate p-5" style={{ animationDelay: "280ms" }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="lq-display font-medium text-[15px]">Objetivos</h3>
            <button onClick={onOpenAddGoal} className="lq-reset lq-focus lq-btn-icon" title="Nova meta"><Plus size={15} /></button>
          </div>
          {st.goals.length === 0 && <p className="lq-empty">Nenhuma meta ainda.</p>}
          <div className="flex flex-col gap-4">
            {st.goals.map((g) => (
              <div key={g.id} className="group">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm">{g.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="lq-mono text-xs" style={{ color: "var(--text-dim)" }}>{g.pct}%</span>
                    <button onClick={() => onBumpGoal(g.id, 10)} className="lq-reset lq-focus lq-btn-icon" style={{ width: 22, height: 22 }} title="+10%"><Plus size={12} /></button>
                    <button onClick={() => onDeleteGoal(g.id)} className="lq-reset lq-focus lq-btn-icon" style={{ width: 22, height: 22 }} title="Excluir meta"><Trash2 size={12} /></button>
                  </div>
                </div>
                <ProgressBar pct={g.pct} color={pair} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================ hábitos ============================================================ */
// Tela "Hábitos": lista completa, agrupada por categoria, com ação de
// marcar/incrementar e excluir. O botão "Novo hábito" abre o modal
// controlado pelo componente raiz (LifeQuest).
function HabitosView({ st, onCheckHabit, onIncrementHabit, onDeleteHabit, onOpenAddHabit, onAddHabit }) {
  // agrupa os hábitos por categoria (Saúde, Estudo, Produtividade, Bem-estar)
  const grouped = useMemo(() => {
    const map = {};
    for (const h of st.habits) {
      (map[h.category] ||= []).push(h);
    }
    return map;
  }, [st.habits]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: "var(--text-dim)" }}>{st.habits.length} hábitos cadastrados</p>
        <button onClick={onOpenAddHabit} className="lq-reset lq-focus lq-btn lq-btn-primary">
          <Plus size={15} /> Novo hábito
        </button>
      </div>

      {Object.keys(grouped).length === 0 && (
        <div className="lq-card p-8 flex flex-col gap-4">
          <p className="lq-empty" style={{ padding: 0 }}>Nenhum hábito ainda. Crie o primeiro ou escolha uma sugestão:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {HABIT_SUGGESTIONS.map((sug) => {
              const Icon = iconFor(sug.icon);
              const color = ACCENT_HEX[sug.color];
              return (
                <button key={sug.name} onClick={() => onAddHabit(sug)} className="lq-reset lq-focus lq-card p-3 text-left flex items-center gap-3" style={{ boxShadow: "none" }}>
                  <div className="lq-icon-badge" style={{ background: `${color}1F`, color }}><Icon size={16} /></div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{sug.name}</p>
                    <p className="text-xs" style={{ color: "var(--text-faint)" }}>{sug.category}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {Object.entries(grouped).map(([category, habits]) => (
        <div key={category} className="lq-card lq-animate p-5">
          <h3 className="lq-display font-medium text-[15px] mb-4" style={{ color: ACCENT_HEX[CATEGORY_COLOR[category]] }}>{category}</h3>
          <div className="flex flex-col gap-4">
            {habits.map((h) => {
              const Icon = iconFor(h.icon);
              const isCounter = h.type === "counter";
              const isDone = isCounter ? h.progress >= h.total : h.done;
              return (
                <div key={h.id} className="flex items-center gap-3">
                  <div className="lq-icon-badge" style={{ background: `${ACCENT_HEX[h.color]}1F`, color: ACCENT_HEX[h.color] }}>
                    <Icon size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{h.name}</span>
                      <span className="lq-chip">{isCounter ? `${h.progress}/${h.total}` : h.goal}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Flame size={12} color="#F59E0B" />
                      <span className="lq-mono text-xs" style={{ color: "var(--text-dim)" }}>{h.streak} dias</span>
                      <WeekDots week={h.week} accent={ACCENT_HEX[h.color]} />
                    </div>
                  </div>

                  {isCounter ? (
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => onIncrementHabit(h.id, -1)} className="lq-reset lq-focus lq-btn-icon"><Minus size={14} /></button>
                      <button onClick={() => onIncrementHabit(h.id, 1)} className="lq-reset lq-focus lq-btn-icon"><Plus size={14} /></button>
                    </div>
                  ) : (
                    <button onClick={() => onCheckHabit(h.id)} className={"lq-reset lq-focus lq-check-btn" + (isDone ? " done" : "")}>
                      <Check size={13} strokeWidth={3} />
                    </button>
                  )}
                  <button onClick={() => onDeleteHabit(h.id)} className="lq-reset lq-focus lq-btn-icon" title="Excluir hábito">
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ============================================================ missões ============================================================ */
// Tela "Missões": desafios diários (checáveis, dão XP na hora) e desafios
// semanais (progresso manual, +1 por vez até bater a meta).
function MissoesView({
  st, onCompleteMission, onDeleteMission, onOpenAddMission,
  onIncrementWeeklyMission, onDeleteWeeklyMission, onOpenAddWeeklyMission,
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="lq-card lq-animate p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="lq-display font-medium text-[15px]">Missões de hoje</h3>
          <button onClick={onOpenAddMission} className="lq-reset lq-focus lq-btn lq-btn-primary"><Plus size={15} /> Nova missão</button>
        </div>
        {st.missions.length === 0 && <p className="lq-empty">Nenhuma missão diária ainda.</p>}
        <div className="flex flex-col gap-3">
          {st.missions.map((m) => {
            const Icon = iconFor(m.icon);
            return (
              <div key={m.id} className="flex items-center gap-3">
                <div className="lq-icon-badge" style={{ background: "var(--surface-2)", color: "var(--accent)" }}>
                  <Icon size={16} />
                </div>
                <span className={"text-sm flex-1" + (m.done ? " line-through" : "")} style={{ color: m.done ? "var(--text-faint)" : "var(--text)" }}>
                  {m.title}
                </span>
                {m.dueDate && !m.done && (
                  <span className="lq-chip" style={{ color: m.dueDate < dateKey() ? "var(--danger)" : undefined }}>
                    {m.dueDate < dateKey() ? "Venceu" : formatDateBr(m.dueDate)}
                  </span>
                )}
                <span className="lq-chip">+{m.xp} XP</span>
                <button onClick={() => onCompleteMission(m.id)} className={"lq-reset lq-focus lq-check-btn" + (m.done ? " done" : "")}>
                  <Check size={13} strokeWidth={3} />
                </button>
                <button onClick={() => onDeleteMission(m.id)} className="lq-reset lq-focus lq-btn-icon" title="Excluir missão"><Trash2 size={14} /></button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="lq-card lq-animate p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="lq-display font-medium text-[15px]">Missões semanais</h3>
          <button onClick={onOpenAddWeeklyMission} className="lq-reset lq-focus lq-btn lq-btn-primary"><Plus size={15} /> Nova missão</button>
        </div>
        {st.weeklyMissions.length === 0 && <p className="lq-empty">Nenhuma missão semanal ainda.</p>}
        <div className="flex flex-col gap-5">
          {st.weeklyMissions.map((m) => {
            const Icon = iconFor(m.icon);
            const pct = (m.progress / m.total) * 100;
            return (
              <div key={m.id}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="lq-icon-badge" style={{ background: "var(--surface-2)", color: "var(--accent)" }}>
                    <Icon size={16} />
                  </div>
                  <span className="text-sm flex-1">{m.title}</span>
                  <span className="lq-mono text-xs" style={{ color: "var(--text-dim)" }}>{m.progress}/{m.total}</span>
                  <span className="lq-chip">+{m.xp} XP</span>
                  <button onClick={() => onIncrementWeeklyMission(m.id)} disabled={m.progress >= m.total} className="lq-reset lq-focus lq-btn-icon" style={{ opacity: m.progress >= m.total ? 0.4 : 1 }} title="+1 progresso"><Plus size={13} /></button>
                  <button onClick={() => onDeleteWeeklyMission(m.id)} className="lq-reset lq-focus lq-btn-icon" title="Excluir missão"><Trash2 size={13} /></button>
                </div>
                <ProgressBar pct={pct} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ============================================================ desenvolvimento pessoal ============================================================ */
// Tela "Desenvolvimento": trilhas de crescimento pessoal (idiomas, leitura,
// mentalidade, habilidades). Cada trilha mostra só o próximo passo
// disponível — nunca a lista inteira de uma vez — pra reforçar a sensação
// de progresso e evitar a fadiga de ver sempre as mesmas sugestões.
function DesenvolvimentoView({ st, onAddHabit, onAddMission }) {
  function handleAddStage(stage) {
    if (stage.kind === "mission") onAddMission(stage.data);
    else onAddHabit(stage.data);
  }

  const startedCount = DEV_TRACKS.filter((t) => isDevStageAdded(st, t.stages[0].tag)).length;
  const completedCount = DEV_TRACKS.filter((t) => isDevStageAdded(st, t.stages[1].tag)).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="lq-card lq-animate p-5">
        <h3 className="lq-display font-medium text-[15px] mb-1">Trilhas de desenvolvimento pessoal</h3>
        <p className="text-sm" style={{ color: "var(--text-dim)" }}>
          Pequenas ações diárias mudam quem você é, não os grandes esforços ocasionais. Escolha uma trilha, dê o primeiro passo e deixe o resto do app — XP, sequência, nível — te lembrar todo dia que você já começou.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard icon={Target} label="Trilhas iniciadas" value={`${startedCount}/${DEV_TRACKS.length}`} color="blue" />
        <StatCard icon={Trophy} label="Trilhas com hábito consolidado" value={`${completedCount}/${DEV_TRACKS.length}`} color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {DEV_TRACKS.map((track, i) => {
          const stage1Added = isDevStageAdded(st, track.stages[0].tag);
          const stage2Added = isDevStageAdded(st, track.stages[1].tag);
          const Icon = iconFor(track.icon);
          const color = ACCENT_HEX[track.color];
          const nextStage = !stage1Added ? track.stages[0] : !stage2Added ? track.stages[1] : null;
          const trackHabit = stage2Added ? st.habits.find((h) => h.devTag === track.stages[1].tag) : null;
          const streak = trackHabit ? trackHabit.streak : 0;
          const milestone = trackHabit ? devMilestoneLabel(streak) : null;

          return (
            <div key={track.id} className="lq-card lq-animate p-5" style={{ animationDelay: `${i * 40}ms` }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="lq-icon-badge" style={{ background: `${color}1F`, color }}>
                    <Icon size={18} />
                  </div>
                  <h4 className="lq-display font-medium text-[14px]">{track.title}</h4>
                </div>
                <div className="flex items-center gap-1">
                  <span className="lq-dev-dot" style={{ background: stage1Added ? color : "var(--border)" }} />
                  <span className="lq-dev-dot" style={{ background: stage2Added ? color : "var(--border)" }} />
                </div>
              </div>
              <p className="text-xs mb-4" style={{ color: "var(--text-dim)" }}>{track.blurb}</p>

              {nextStage && (
                <button onClick={() => handleAddStage(nextStage)} className="lq-reset lq-focus lq-btn lq-btn-primary" style={{ width: "100%", justifyContent: "center" }}>
                  <Plus size={14} /> {nextStage.label}
                </button>
              )}
              {!nextStage && (
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs" style={{ color }}>
                    <Flame size={14} />
                    {trackHabit ? (streak > 0 ? `${streak} ${streak === 1 ? "dia" : "dias"} seguidos` : "Comece a sequência hoje") : "Continue por Hábitos e Missões"}
                  </div>
                  {milestone && (
                    <span className="lq-dev-milestone" style={{ background: `${color}1F`, color }}>{milestone}</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================ agenda ============================================================ */
// Tela "Agenda": grade semanal (7 colunas, uma por dia) com os eventos
// cadastrados. Cada evento tem um tipo (treino, estudo...) que define ícone
// e cor via EVENT_TYPES.
function AgendaView({ st, onOpenAddEvent, onDeleteEvent }) {
  const byDay = useMemo(() => {
    const map = Object.fromEntries(WEEK_DAYS.map((d) => [d, []]));
    for (const ev of st.events) {
      if (ev.recurring === false) continue;
      if (map[ev.day]) map[ev.day].push(ev);
    }
    for (const d of WEEK_DAYS) map[d].sort((a, b) => a.time.localeCompare(b.time));
    return map;
  }, [st.events]);

  // eventos com data específica, só os que ainda vão acontecer (hoje em
  // diante), ordenados por data e depois por horário.
  const oneOff = useMemo(() => {
    const today = dateKey();
    return st.events
      .filter((ev) => ev.recurring === false && ev.date >= today)
      .sort((a, b) => a.date === b.date ? a.time.localeCompare(b.time) : a.date.localeCompare(b.date));
  }, [st.events]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: "var(--text-dim)" }}>{st.events.length} eventos cadastrados</p>
        <button onClick={onOpenAddEvent} className="lq-reset lq-focus lq-btn lq-btn-primary">
          <Plus size={15} /> Novo evento
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {WEEK_DAYS.map((day, i) => (
          <div key={day} className="lq-card lq-animate p-4" style={{ animationDelay: `${i * 30}ms` }}>
            <h4 className="lq-display font-medium text-[13px] mb-3">{day}</h4>
            <div className="flex flex-col gap-2">
              {byDay[day].length === 0 && <p className="text-xs" style={{ color: "var(--text-faint)" }}>Sem eventos</p>}
              {byDay[day].map((ev) => {
                const meta = EVENT_TYPES[ev.type] || EVENT_TYPES.outro;
                const Icon = iconFor(meta.icon);
                return (
                  <div key={ev.id} className="flex items-center gap-2 group">
                    <div className="lq-icon-badge" style={{ width: 26, height: 26, background: `${ACCENT_HEX[meta.color]}1F`, color: ACCENT_HEX[meta.color] }}>
                      <Icon size={13} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">{ev.title}</p>
                      <p className="lq-mono" style={{ fontSize: 10, color: "var(--text-faint)" }}>
                        {ev.time}
                        {ev.alertMinutes > 0 && (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 2, marginLeft: 6 }}>
                            <Bell size={9} /> {ev.alertMinutes}min antes
                          </span>
                        )}
                      </p>
                    </div>
                    <button onClick={() => onDeleteEvent(ev.id)} className="lq-reset lq-focus lq-btn-icon" style={{ width: 22, height: 22 }}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {oneOff.length > 0 && (
        <div className="lq-card p-4">
          <h4 className="lq-display font-medium text-[13px] mb-3">Eventos com data marcada</h4>
          <div className="flex flex-col gap-2">
            {oneOff.map((ev) => {
              const meta = EVENT_TYPES[ev.type] || EVENT_TYPES.outro;
              const Icon = iconFor(meta.icon);
              const label = new Date(`${ev.date}T00:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
              return (
                <div key={ev.id} className="flex items-center gap-2 group">
                  <div className="lq-icon-badge" style={{ width: 26, height: 26, background: `${ACCENT_HEX[meta.color]}1F`, color: ACCENT_HEX[meta.color] }}>
                    <Icon size={13} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{ev.title}</p>
                    <p className="lq-mono" style={{ fontSize: 10, color: "var(--text-faint)" }}>
                      {label} · {ev.time}
                      {ev.alertMinutes > 0 && (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 2, marginLeft: 6 }}>
                          <Bell size={9} /> {ev.alertMinutes}min antes
                        </span>
                      )}
                    </p>
                  </div>
                  <button onClick={() => onDeleteEvent(ev.id)} className="lq-reset lq-focus lq-btn-icon" style={{ width: 22, height: 22 }}>
                    <Trash2 size={12} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================ diário ============================================================ */
// Tela "Diário": entradas de texto livre + humor do dia, mais recentes
// primeiro.
function DiarioView({ st, onOpenAddJournal }) {
  const entries = useMemo(() => [...st.journal].reverse(), [st.journal]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: "var(--text-dim)" }}>{st.journal.length} entradas registradas</p>
        <button onClick={onOpenAddJournal} className="lq-reset lq-focus lq-btn lq-btn-primary">
          <Plus size={15} /> Nova entrada
        </button>
      </div>

      {entries.length === 0 && <div className="lq-card p-8 lq-empty">Nenhuma entrada ainda. Escreva sobre o seu dia!</div>}

      {entries.map((j, i) => {
        const mood = MOOD_LEVELS.find((m) => m.v === j.mood) || MOOD_LEVELS[2];
        return (
          <div key={j.id} className="lq-card lq-animate p-5" style={{ animationDelay: `${i * 40}ms` }}>
            <div className="flex items-center justify-between mb-3">
              <span className="lq-mono text-xs" style={{ color: "var(--text-dim)" }}>{j.date}</span>
              <span className="lq-chip" style={{ color: mood.color, borderColor: mood.color }}>{mood.label}</span>
            </div>
            <p className="text-sm leading-relaxed">{j.dayText}</p>
            {j.didText && (
              <p className="text-xs mt-3" style={{ color: "var(--text-dim)" }}><b>O que fiz: </b>{j.didText}</p>
            )}
            {j.improveText && (
              <p className="text-xs mt-1" style={{ color: "var(--text-dim)" }}><b>Melhorar: </b>{j.improveText}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ============================================================ estatísticas ============================================================ */
// Tela "Estatísticas": visão consolidada — evolução de XP (mesmo gráfico do
// dashboard, maior) + distribuição de sequência (streak) por hábito.
function EstatisticasView({ st, accent, chartRange, setChartRange, chartData, totalXpWeek, bestStreak }) {
  const streakData = st.habits.map((h) => ({ label: h.name, streak: h.streak }));
  const completionRate = Math.round(
    (st.habits.filter((h) => (h.type === "counter" ? h.progress >= h.total : h.done)).length / (st.habits.length || 1)) * 100
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Zap} label="XP na semana" value={totalXpWeek} color="purple" />
        <StatCard icon={Flame} label="Melhor sequência" value={`${bestStreak} dias`} color="amber" />
        <StatCard icon={CircleCheck} label="Taxa de conclusão hoje" value={`${completionRate}%`} color="green" />
        <StatCard icon={Trophy} label="Nível atual" value={st.level} color="blue" />
      </div>

      <div className="lq-card p-5">
        <div className="flex items-center justify-between mb-1">
          <h3 className="lq-display font-medium text-[15px]">Evolução de XP</h3>
          <div className="lq-segmented">
            {["semana", "mes", "ano"].map((r) => (
              <button key={r} onClick={() => setChartRange(r)} className={"lq-reset lq-focus lq-segment" + (chartRange === r ? " active" : "")}>
                {r === "semana" ? "Semana" : r === "mes" ? "Mês" : "Ano"}
              </button>
            ))}
          </div>
        </div>
        <div style={{ height: 240 }} className="mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 6, left: 14, bottom: 0 }}>
              <defs>
                <linearGradient id="lqStatsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={accent} stopOpacity={0.45} />
                  <stop offset="100%" stopColor={accent} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" interval={0} tick={{ fill: "var(--text-faint)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12 }}
                labelStyle={{ color: "var(--text)" }} itemStyle={{ color: accent }} />
              <Area type="monotone" dataKey="xp" stroke={accent} strokeWidth={2.5} fill="url(#lqStatsGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="lq-card p-5">
        <h3 className="lq-display font-medium text-[15px] mb-2">Sequência por hábito</h3>
        {streakData.length === 0 ? <p className="lq-empty">Crie hábitos para ver esse gráfico.</p> : (
        <div style={{ height: 220 }} className="mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={streakData} margin={{ top: 10, right: 6, left: 14, bottom: 0 }}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" interval={0} tick={{ fill: "var(--text-faint)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "var(--text-faint)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 12 }}
                labelStyle={{ color: "var(--text)" }} itemStyle={{ color: accent }} />
              <Bar dataKey="streak" fill={accent} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================ perfil ============================================================ */
// Tela "Perfil": identidade do personagem — nome, avatar, título/rank
// derivados do nível, e um resumo rápido de estatísticas.
function PerfilView({ st, accent, pair, onUpdateSettings }) {
  const rank = getRank(st.level);
  const title = getTitle(st.level);
  const missionsDone = st.missions.filter((m) => m.done).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="lq-card lq-glass lq-animate p-6 flex flex-col md:flex-row items-center gap-6">
        <XpRing pct={st.xp / XP_PER_LEVEL} size={110} accent={accent} pair={pair}>
          {React.createElement(iconFor(st.settings.avatarIcon), { size: 30, color: accent })}
        </XpRing>
        <div className="text-center md:text-left">
          <h2 className="lq-display text-xl font-semibold">{st.settings.characterName || "Defina seu nome em Configurações"}</h2>
          <p className="text-sm mt-1" style={{ color: "var(--text-dim)" }}>{title}</p>
          <div className="flex items-center gap-2 justify-center md:justify-start mt-3">
            <span className="lq-level-pill">Nível {st.level}</span>
            <span className="lq-chip" style={{ color: rank.hex, borderColor: rank.hex }}>Rank {rank.name}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={ListChecks} label="Hábitos ativos" value={st.habits.length} color="blue" />
        <StatCard icon={Award} label="Missões concluídas" value={missionsDone} color="green" />
        <StatCard icon={Target} label="Metas em progresso" value={st.goals.length} color="purple" />
        <StatCard icon={BookOpen} label="Entradas no diário" value={st.journal.length} color="amber" />
      </div>

      <div className="lq-card lq-animate p-5">
        <h3 className="lq-display font-medium text-[15px] mb-4">Avatar</h3>
        <div className="lq-choice-grid">
          {AVATAR_ICON_CHOICES.map((key) => {
            const Icon = iconFor(key);
            return (
              <button key={key} onClick={() => onUpdateSettings({ avatarIcon: key })}
                className={"lq-reset lq-focus lq-choice-item" + (st.settings.avatarIcon === key ? " selected" : "")}>
                <Icon size={16} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Opt-in de notificações reais do celular (Push API) — fica de fora do "st"
// porque é permissão do navegador/dispositivo, não preferência de conta. Só
// pede permissão quando o usuário liga o toggle (nunca automático); os
// toggles "o que" notificar (hábitos/metas/etc.) continuam abaixo, no bloco
// que já existia.
function PushNotificationsField() {
  const [status, setStatus] = useState(() => getPushPermission()); // "default" | "granted" | "denied" | "unsupported"
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [tested, setTested] = useState(false);

  // Permissão concedida não quer dizer inscrição viva no servidor — se o
  // navegador descartou a PushSubscription (comum após atualizar o PWA), o
  // toggle ficaria "ligado" mas nenhum lembrete chegaria mais, em silêncio.
  // Reinscreve sozinho aqui, sem pedir permissão de novo.
  useEffect(() => {
    if (getPushPermission() !== "granted") return;
    hasActivePushSubscription().then((active) => {
      if (!active) subscribeToPush().catch(() => {});
    });
  }, []);

  async function handleToggle(on) {
    setError("");
    setBusy(true);
    try {
      if (on) {
        await subscribeToPush();
        setStatus(getPushPermission());
      } else {
        await unsubscribeFromPush();
        setStatus(getPushPermission());
      }
    } catch (err) {
      setError(err.message || "Não foi possível ativar as notificações.");
      setStatus(getPushPermission());
    } finally {
      setBusy(false);
    }
  }

  async function handleTest() {
    setError("");
    setTested(false);
    try {
      await testPush();
      setTested(true);
    } catch (err) {
      setError(err.message || "Não foi possível enviar o teste.");
    }
  }

  if (status === "unsupported") {
    return (
      <p className="text-xs" style={{ color: "var(--text-dim)" }}>
        Este navegador não suporta notificações push.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm flex items-center gap-2"><Bell size={14} /> Notificações no celular</span>
        <Toggle checked={status === "granted"} onChange={handleToggle} disabled={busy} />
      </div>
      {status === "denied" && (
        <p className="text-xs" style={{ color: "var(--text-dim)" }}>
          Bloqueadas nas configurações do navegador — ative lá pra receber lembretes fora do app.
        </p>
      )}
      {error && <p className="text-xs" style={{ color: "var(--danger)" }}>{error}</p>}
      {status === "granted" && (
        <div className="flex items-center gap-2">
          <button onClick={handleTest} className="lq-reset lq-focus lq-btn" style={{ padding: "4px 10px", fontSize: 12 }}>
            Enviar teste
          </button>
          {tested && <span className="text-xs" style={{ color: "var(--text-dim)" }}>Enviado — confira o celular.</span>}
        </div>
      )}
    </div>
  );
}

/* ============================================================ configurações ============================================================ */
// Tela "Configurações": tudo que mexe em DEFAULT_SETTINGS. onUpdateSettings
// recebe um objeto parcial e o componente raiz faz o merge no estado.
function ConfigView({ st, onUpdateSettings, onResetData, onLogout, account }) {
  const s = st.settings;
  return (
    <div className="flex flex-col gap-6">
      <div className="lq-card lq-animate p-5">
        <h3 className="lq-display font-medium text-[15px] mb-4">Personagem</h3>
        <div className="flex flex-col gap-4 max-w-sm">
          <Field label="Nome">
            <input className="lq-input" value={s.characterName} placeholder="Como podemos te chamar?"
              autoCorrect="off" autoCapitalize="off" spellCheck={false}
              onChange={(e) => onUpdateSettings({ characterName: e.target.value })} />
          </Field>
        </div>
      </div>

      <div className="lq-card lq-animate p-5">
        <h3 className="lq-display font-medium text-[15px] mb-4">Aparência</h3>
        <div className="flex flex-col gap-4 max-w-sm">
          <Field label="Tema">
            <select className="lq-select" value={s.theme} onChange={(e) => onUpdateSettings({ theme: e.target.value })}>
              <option value="system">Automático (sistema)</option>
              <option value="light">Claro</option>
              <option value="dark">Escuro</option>
            </select>
          </Field>
          <Field label="Cor de destaque">
            <div className="flex gap-2">
              {ACCENT_CHOICES.map((c) => (
                <button key={c} onClick={() => onUpdateSettings({ accent: c })}
                  className={"lq-reset lq-focus lq-color-dot" + (s.accent === c ? " selected" : "")}
                  style={{ background: ACCENT_HEX[c], border: c === "mono" ? "1px solid var(--border)" : undefined }}
                  title={c === "mono" ? "Preto e branco" : c} />
              ))}
            </div>
          </Field>
        </div>
      </div>

      <div className="lq-card lq-animate p-5">
        <h3 className="lq-display font-medium text-[15px] mb-4">Notificações</h3>
        <div className="flex flex-col gap-4 max-w-sm">
          <PushNotificationsField />
          <div className="flex items-center justify-between">
            <span className="text-sm">Lembrete de hábitos</span>
            <Toggle checked={s.notifHabits} onChange={(v) => onUpdateSettings({ notifHabits: v })} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Comemorar conquistas</span>
            <Toggle checked={s.notifCelebrate} onChange={(v) => onUpdateSettings({ notifCelebrate: v })} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Progresso de metas</span>
            <Toggle checked={s.notifGoals} onChange={(v) => onUpdateSettings({ notifGoals: v })} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Som</span>
            <Toggle checked={s.sound} onChange={(v) => onUpdateSettings({ sound: v })} />
          </div>
        </div>
      </div>

      <div className="lq-card lq-animate p-5">
        <h3 className="lq-display font-medium text-[15px] mb-4">Regional</h3>
        <div className="flex flex-col gap-4 max-w-sm">
          <Field label="Formato de data">
            <select className="lq-select" value={s.dateFormat} onChange={(e) => onUpdateSettings({ dateFormat: e.target.value })}>
              <option value="dd/mm/aaaa">dd/mm/aaaa</option>
              <option value="mm/dd/aaaa">mm/dd/aaaa</option>
            </select>
          </Field>
          <Field label="Unidades">
            <select className="lq-select" value={s.units} onChange={(e) => onUpdateSettings({ units: e.target.value })}>
              <option value="metrico">Métrico</option>
              <option value="imperial">Imperial</option>
            </select>
          </Field>
        </div>
      </div>

      <div className="lq-card lq-animate p-5">
        <h3 className="lq-display font-medium text-[15px] mb-2">Conta</h3>
        <p className="text-xs mb-4" style={{ color: "var(--text-dim)" }}>
          Conectado(a) como {account?.email}. Seu progresso fica salvo na nuvem e sincronizado em qualquer dispositivo em que você entrar.
        </p>
        <button onClick={onLogout} className="lq-reset lq-focus lq-btn">Sair da conta</button>
      </div>

      <div className="lq-card lq-animate p-5">
        <h3 className="lq-display font-medium text-[15px] mb-2">Dados</h3>
        <p className="text-xs mb-4" style={{ color: "var(--text-dim)" }}>
          Apaga permanentemente sua conta e todos os hábitos, missões, metas, eventos e entradas de diário salvos.
        </p>
        <button onClick={onResetData} className="lq-reset lq-focus lq-btn lq-btn-danger">Apagar todos os dados</button>
      </div>
    </div>
  );
}

/* ============================================================ navegação (sidebar + bottom nav + topbar) ============================================================ */
// Sidebar fixa (desktop). No mobile ela é escondida via CSS e substituída
// pela BottomNav abaixo.
function Sidebar({ view, setView }) {
  return (
    <aside className="lq-sidebar">
      <div className="lq-sidebar-brand">
        <Swords size={18} color="var(--accent)" />
        <span className="lq-display font-semibold text-[15px]">LifeQuest</span>
      </div>
      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <NavItem key={item.id} icon={item.icon} label={item.label} active={view === item.id} onClick={() => setView(item.id)} />
        ))}
      </nav>
    </aside>
  );
}

// Barra inferior (mobile). Só mostra os destinos mais usados
// (MOBILE_NAV), o resto fica acessível pela sidebar no desktop.
function BottomNav({ view, setView }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = MOBILE_NAV_MORE.includes(view);
  return (
    <nav className="lq-bottomnav">
      {moreOpen && (
        <>
          <div className="lq-bottomnav-more-backdrop" onClick={() => setMoreOpen(false)} />
          <div className="lq-card lq-bottomnav-more">
            {MOBILE_NAV_MORE.map((id) => {
              const item = NAV_ITEMS.find((n) => n.id === id);
              const Icon = item.icon;
              return (
                <button
                  key={id}
                  onClick={() => { setView(id); setMoreOpen(false); }}
                  className={"lq-reset lq-focus lq-bottomnav-more-item" + (view === id ? " active" : "")}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
      <div className="lq-bottomnav-inner">
        {MOBILE_NAV.map((id) => {
          const item = NAV_ITEMS.find((n) => n.id === id);
          const Icon = item.icon;
          return (
            <button key={id} onClick={() => { setView(id); setMoreOpen(false); }} className={"lq-reset lq-focus lq-bottomnav-item" + (view === id ? " active" : "")}>
              <Icon size={19} />
              <span>{item.label}</span>
            </button>
          );
        })}
        <button onClick={() => setMoreOpen((v) => !v)} className={"lq-reset lq-focus lq-bottomnav-item" + (moreActive || moreOpen ? " active" : "")}>
          <MoreHorizontal size={19} />
          <span>Mais</span>
        </button>
      </div>
    </nav>
  );
}

// Cabeçalho de cada tela: título da view atual + sino de notificações.
function Topbar({ view, notifications, notifOpen, setNotifOpen, onMarkRead, onMarkAllRead }) {
  const unread = notifications.filter((n) => !n.read).length;
  return (
    <header className="lq-topbar">
      <h2 className="lq-display text-lg font-semibold">{VIEW_TITLES[view]}</h2>
      <div className="lq-topbar-actions" style={{ position: "relative" }}>
        <button onClick={() => setNotifOpen((v) => !v)} className="lq-reset lq-focus lq-btn-icon" style={{ position: "relative" }}>
          <Bell size={18} />
          {unread > 0 && (
            <span className="lq-mono" style={{
              position: "absolute", top: 2, right: 2, width: 8, height: 8, borderRadius: "50%",
              background: "var(--danger)",
            }} />
          )}
        </button>
        {notifOpen && (
          <div className="lq-card lq-notif-panel lq-scroll p-2">
            <div className="flex items-center justify-between px-2 py-1.5">
              <span className="text-xs font-medium">Notificações</span>
              <button onClick={onMarkAllRead} className="lq-reset lq-focus text-xs" style={{ color: "var(--accent)" }}>Marcar todas como lidas</button>
            </div>
            {notifications.length === 0 && <p className="lq-empty">Sem notificações</p>}
            {notifications.map((n) => {
              const Icon = iconFor(n.icon);
              return (
                <button key={n.id} onClick={() => onMarkRead(n.id)} className={"lq-reset lq-focus lq-notif-item w-full" + (!n.read ? " unread" : "")}>
                  <Icon size={14} color="var(--accent)" />
                  <span className="text-xs" style={{ color: n.read ? "var(--text-faint)" : "var(--text)" }}>{n.text}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </header>
  );
}

/* ============================================================ toasts ============================================================ */
// Pilha de avisos rápidos no canto da tela (ex: "+40 XP", "Hábito criado").
function ToastStack({ toasts }) {
  if (toasts.length === 0) return null;
  return (
    <div className="lq-toast-stack">
      {toasts.map((t) => <div key={t.id} className="lq-toast">{t.text}</div>)}
    </div>
  );
}

/* ============================================================ alarme da agenda ============================================================ */
// Tela cheia que toca em loop quando um evento da agenda bate o horário de
// aviso — só some quando a pessoa aperta "Desligar" (igual um despertador
// de verdade), diferente do sino/toast normal que some sozinho.
function AlarmRingOverlay({ alarm, onDismiss }) {
  return (
    <div className="lq-alarm-backdrop" role="alertdialog" aria-label="Alarme">
      <div className="lq-alarm-card">
        <div className="lq-alarm-icon"><AlarmClock size={34} /></div>
        <p className="lq-alarm-title">{alarm.title}</p>
        <p className="lq-alarm-sub">Era pra começar em {alarm.minutes} min</p>
        <button onClick={onDismiss} className="lq-reset lq-focus lq-alarm-btn">Desligar</button>
      </div>
    </div>
  );
}

/* ============================================================ modais de criação ============================================================ */
// Formulário de novo hábito. Mantém estado local só do formulário; ao
// salvar, entrega um objeto pronto para o componente raiz inserir no estado.
function HabitModal({ onClose, onSubmit }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState(CATEGORY_CHOICES[0]);
  const [icon, setIcon] = useState(HABIT_ICON_CHOICES[0]);
  const [color, setColor] = useState(HABIT_COLOR_CHOICES[0]);
  const [type, setType] = useState("check");
  const [goal, setGoal] = useState("");
  const [total, setTotal] = useState(8);
  const [xp, setXp] = useState(10);

  const canSubmit = name.trim().length > 0;

  function handleSubmit() {
    if (!canSubmit) return;
    onSubmit({
      name: name.trim(), category, icon, color, type, xp: Number(xp) || 1,
      ...(type === "check" ? { goal: goal.trim() || "Concluir", done: false } : { total: Number(total) || 1, progress: 0 }),
    });
  }

  return (
    <Modal title="Novo hábito" onClose={onClose}>
      <Field label="Nome">
        <input className="lq-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Beber água" autoFocus
          autoCorrect="off" autoCapitalize="off" spellCheck={false} />
      </Field>
      <Field label="Categoria">
        <select className="lq-select" value={category} onChange={(e) => setCategory(e.target.value)}>
          {CATEGORY_CHOICES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </Field>
      <Field label="Tipo">
        <select className="lq-select" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="check">Marcar como feito</option>
          <option value="counter">Contador (ex: copos de água)</option>
        </select>
      </Field>
      {type === "check" ? (
        <Field label="Meta (texto livre)">
          <input className="lq-input" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="Ex: 30 min"
            autoCorrect="off" autoCapitalize="off" spellCheck={false} />
        </Field>
      ) : (
        <Field label="Meta diária (número)">
          <input className="lq-input" type="number" min={1} value={total} onChange={(e) => setTotal(e.target.value)} />
        </Field>
      )}
      <Field label="XP ao concluir">
        <input className="lq-input" type="number" min={1} value={xp} onChange={(e) => setXp(e.target.value)} />
      </Field>
      <Field label="Ícone">
        <div className="lq-choice-grid">
          {HABIT_ICON_CHOICES.map((key) => {
            const Icon = iconFor(key);
            return (
              <button key={key} onClick={() => setIcon(key)} className={"lq-reset lq-focus lq-choice-item" + (icon === key ? " selected" : "")}>
                <Icon size={16} />
              </button>
            );
          })}
        </div>
      </Field>
      <Field label="Cor">
        <div className="flex gap-2">
          {HABIT_COLOR_CHOICES.map((c) => (
            <button key={c} onClick={() => setColor(c)} className={"lq-reset lq-focus lq-color-dot" + (color === c ? " selected" : "")}
              style={{ background: ACCENT_HEX[c] }} />
          ))}
        </div>
      </Field>
      <button onClick={handleSubmit} disabled={!canSubmit} className="lq-reset lq-focus lq-btn lq-btn-primary lq-btn-block" style={{ opacity: canSubmit ? 1 : 0.5 }}>
        Criar hábito
      </button>
    </Modal>
  );
}

// Formulário de novo evento na agenda.
function EventModal({ onClose, onSubmit }) {
  const [recurring, setRecurring] = useState(true);
  const [day, setDay] = useState(WEEK_DAYS[0]);
  const [date, setDate] = useState(dateKey());
  const [time, setTime] = useState("08:00");
  const [title, setTitle] = useState("");
  const [type, setType] = useState("outro");
  const [alertMinutes, setAlertMinutes] = useState(10);
  const canSubmit = title.trim().length > 0 && (recurring || date);

  function handleSubmit() {
    if (!canSubmit) return;
    if (recurring) {
      onSubmit({ recurring: true, day, time, title: title.trim(), type, alertMinutes: Number(alertMinutes) || 0 });
    } else {
      const weekday = WEEK_DAYS[(new Date(`${date}T00:00:00`).getDay() + 6) % 7];
      onSubmit({ recurring: false, date, day: weekday, time, title: title.trim(), type, alertMinutes: Number(alertMinutes) || 0 });
    }
  }

  return (
    <Modal title="Novo evento" onClose={onClose}>
      <Field label="Título">
        <input className="lq-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Treino de força" autoFocus
          autoCorrect="off" autoCapitalize="off" spellCheck={false} />
      </Field>
      <Field label="Repetição">
        <div className="flex gap-2">
          <button type="button" onClick={() => setRecurring(true)} className={"lq-reset lq-focus lq-chip" + (recurring ? " active" : "")}>Toda semana</button>
          <button type="button" onClick={() => setRecurring(false)} className={"lq-reset lq-focus lq-chip" + (!recurring ? " active" : "")}>Data específica</button>
        </div>
      </Field>
      {recurring ? (
        <Field label="Dia da semana">
          <select className="lq-select" value={day} onChange={(e) => setDay(e.target.value)}>
            {WEEK_DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </Field>
      ) : (
        <Field label="Data">
          <input className="lq-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
      )}
      <Field label="Horário">
        <input className="lq-input" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
      </Field>
      <Field label="Tipo">
        <select className="lq-select" value={type} onChange={(e) => setType(e.target.value)}>
          {Object.entries(EVENT_TYPES).map(([key, v]) => <option key={key} value={key}>{v.label}</option>)}
        </select>
      </Field>
      <Field label="Avisar quantos minutos antes (0 = desligado)">
        <input className="lq-input" type="number" min={0} value={alertMinutes} onChange={(e) => setAlertMinutes(e.target.value)} />
      </Field>
      <button onClick={handleSubmit} disabled={!canSubmit} className="lq-reset lq-focus lq-btn lq-btn-primary lq-btn-block" style={{ opacity: canSubmit ? 1 : 0.5 }}>
        Adicionar evento
      </button>
    </Modal>
  );
}

// Formulário de nova entrada de diário, com seletor de humor.
function JournalModal({ onClose, onSubmit }) {
  const [mood, setMood] = useState(3);
  const [dayText, setDayText] = useState("");
  const [didText, setDidText] = useState("");
  const [improveText, setImproveText] = useState("");
  const canSubmit = dayText.trim().length > 0;

  function handleSubmit() {
    if (!canSubmit) return;
    onSubmit({ mood, dayText: dayText.trim(), didText: didText.trim(), improveText: improveText.trim() });
  }

  return (
    <Modal title="Nova entrada no diário" onClose={onClose}>
      <Field label="Humor">
        <div className="flex gap-2">
          {MOOD_LEVELS.map((m) => (
            <button key={m.v} onClick={() => setMood(m.v)} className="lq-reset lq-focus lq-choice-item"
              style={{ borderColor: mood === m.v ? m.color : "var(--border)", color: m.color }} title={m.label}>
              {m.v}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Como foi o seu dia?">
        <textarea className="lq-textarea" value={dayText} onChange={(e) => setDayText(e.target.value)} autoFocus />
      </Field>
      <Field label="O que você fez de bom">
        <textarea className="lq-textarea" value={didText} onChange={(e) => setDidText(e.target.value)} />
      </Field>
      <Field label="O que pode melhorar">
        <textarea className="lq-textarea" value={improveText} onChange={(e) => setImproveText(e.target.value)} />
      </Field>
      <button onClick={handleSubmit} disabled={!canSubmit} className="lq-reset lq-focus lq-btn lq-btn-primary lq-btn-block" style={{ opacity: canSubmit ? 1 : 0.5 }}>
        Salvar entrada
      </button>
    </Modal>
  );
}

// Formulário de nova missão — o mesmo componente serve pra missão diária
// (só título + XP) e semanal (que também pede uma meta de repetições).
function MissionModal({ weekly, onClose, onSubmit }) {
  const [title, setTitle] = useState("");
  const [xp, setXp] = useState(20);
  const [total, setTotal] = useState(5);
  const [dueDate, setDueDate] = useState("");
  const canSubmit = title.trim().length > 0;

  function handleSubmit() {
    if (!canSubmit) return;
    onSubmit({
      title: title.trim(), xp: Number(xp) || 1, icon: "target",
      ...(weekly ? { total: Number(total) || 1 } : {}),
      ...(!weekly && dueDate ? { dueDate } : {}),
    });
  }

  return (
    <Modal title={weekly ? "Nova missão semanal" : "Nova missão"} onClose={onClose}>
      <Field label="Título">
        <input className="lq-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Ler 20 páginas" autoFocus
          autoCorrect="off" autoCapitalize="off" spellCheck={false} />
      </Field>
      <Field label="XP ao concluir">
        <input className="lq-input" type="number" min={1} value={xp} onChange={(e) => setXp(e.target.value)} />
      </Field>
      {weekly && (
        <Field label="Quantas vezes repetir na semana">
          <input className="lq-input" type="number" min={1} value={total} onChange={(e) => setTotal(e.target.value)} />
        </Field>
      )}
      {!weekly && (
        <Field label="Prazo (opcional)">
          <input className="lq-input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </Field>
      )}
      <button onClick={handleSubmit} disabled={!canSubmit} className="lq-reset lq-focus lq-btn lq-btn-primary lq-btn-block" style={{ opacity: canSubmit ? 1 : 0.5 }}>
        Criar missão
      </button>
    </Modal>
  );
}

/* ============================================================ artigos ============================================================ */
// Conteúdo educativo fixo (sem backend) sobre disciplina, dopamina
// e finanças, com indicações de livro. O objetivo é ficar na cabeça de quem
// lê — por isso o tom é direto e as dicas são práticas, não teóricas.
const ARTICLE_CATEGORY_COLOR = { Disciplina: "purple", Dopamina: "blue", Finanças: "green", Livros: "amber" };
const ARTICLE_CATEGORIES = ["Todos", "Disciplina", "Dopamina", "Finanças", "Livros"];

const ARTICLES = [
  {
    id: "sequestro-dopamina",
    category: "Dopamina",
    icon: "brain",
    title: "O sequestro da dopamina",
    excerpt: "Por que ficou tão difícil focar em algo difícil — e o que fazer pra reverter isso.",
    content: [
      "Toda vontade que você sente de fazer alguma coisa — treinar, estudar, abrir o celular — é dopamina. Ela não é o prazer em si; é a antecipação dele. O problema é que seu cérebro não distingue muito bem a fonte: rolar o feed, notificação, treino puxado ou terminar um projeto difícil disparam o mesmo circuito de recompensa.",
      "A diferença é a intensidade e a velocidade. Redes sociais, jogos e comida ultraprocessada dão picos de dopamina rápidos e baratos. Um hábito difícil — acordar cedo, treinar, estudar — dá um pico menor e mais lento. Colocados lado a lado, seu cérebro escolhe o caminho fácil quase sempre.",
      "O efeito colateral: quanto mais picos rápidos você consome, mais alta fica sua \"linha de base\" de estímulo — e mais sem graça fica tudo que exige esforço. Você não está sem disciplina. Seu sistema de recompensa está dessensibilizado.",
      "Como reverter, na prática:",
      "1. Crie fricção pros estímulos rápidos — celular fora do quarto, redes sociais fora da tela inicial.",
      "2. Faça a tarefa difícil primeiro, com a cabeça ainda \"limpa\", antes de qualquer estímulo rápido.",
      "3. Tolere o desconforto dos primeiros minutos — é literalmente abstinência de dopamina, e ela passa.",
      "4. Comemore pequenas vitórias de verdade. É pra isso que serve marcar um hábito aqui no LifeQuest: reensinar seu cérebro que o esforço também recompensa.",
    ],
  },
  {
    id: "procrastinacao",
    category: "Dopamina",
    icon: "target",
    title: "Por que você adia o que mais importa",
    excerpt: "Procrastinação não é preguiça — é o seu cérebro escolhendo a recompensa mais rápida.",
    content: [
      "Procrastinar não é falta de força de vontade. É uma troca: seu cérebro compara a dor imediata de começar uma tarefa difícil com a recompensa distante de terminá-la — e a dor imediata quase sempre ganha, mesmo sabendo que vai te custar caro depois.",
      "Isso tem nome: desconto temporal (\"temporal discounting\"). Quanto mais distante a recompensa, menos peso ela tem agora, no presente. É por isso que é fácil prometer treinar amanhã e impossível treinar hoje.",
      "O truque não é \"ter mais força de vontade\" — é encurtar a distância entre a ação e a recompensa:",
      "1. Regra dos 2 minutos: comece uma versão ridiculamente pequena da tarefa (\"só vou abrir o caderno\", \"só vou calçar o tênis\"). O início é o que dói; depois de começar, continuar é mais fácil.",
      "2. Torne o progresso visível na hora — uma barra de XP, um hábito marcado, uma sequência viva. O cérebro precisa de prova imediata de que está indo pra algum lugar.",
      "3. Reduza a fricção de começar e aumente a fricção de adiar — deixe a roupa de treino separada, o app de distração fora da tela inicial.",
      "4. Aceite que a vontade não vem antes da ação — ela vem depois. Você não precisa estar motivado pra começar. Precisa começar pra ficar motivado.",
    ],
  },
  {
    id: "disciplina-nao-e-motivacao",
    category: "Disciplina",
    icon: "zap",
    title: "Disciplina não é motivação",
    excerpt: "Motivação é um sentimento — vai e volta. Disciplina é um sistema. Sistemas não dependem de humor.",
    content: [
      "Motivação é combustível emocional: intensa no começo, e evapora no primeiro dia ruim, no primeiro contratempo, na primeira vez que você dormiu mal. Se seu plano depende de estar motivado todo dia, ele tem prazo de validade curto.",
      "Disciplina é diferente: é a decisão tomada uma vez (\"eu treino segunda, quarta e sex, ponto final\") que te tira da obrigação de decidir de novo, com humor variável, todos os dias. Você não pergunta a si mesmo \"será que eu quero hoje?\" — só executa o combinado.",
      "Na prática, isso significa projetar seu ambiente e sua rotina pra que o caminho certo seja o caminho de menor resistência:",
      "1. Decida o quê, quando e onde com antecedência — decisão tomada de manhã, sob pressão, é decisão pior.",
      "2. Vincule o hábito novo a algo que você já faz sempre (\"depois do café, eu abro o app e marco meu primeiro hábito do dia\") — é a técnica de habit stacking.",
      "3. Nunca falte duas vezes seguidas. Falhar uma vez é humano; falhar duas é o início de um padrão novo — e não é o que você quer construir.",
      "4. Meça o processo, não só o resultado. Uma sequência (streak) viva é, sozinha, motivo suficiente pra aparecer no dia seguinte.",
    ],
  },
  {
    id: "livros-disciplina",
    category: "Livros",
    icon: "book",
    title: "4 livros que mudam como você pensa sobre disciplina",
    excerpt: "Não precisa ler todos de uma vez — mas cada um destes muda algo permanente na sua cabeça.",
    content: [
      "Livro não substitui ação, mas dá o mapa certo pra agir com menos tentativa e erro. Estas quatro leituras resumem décadas de pesquisa sobre hábito, foco e mentalidade — separadas aqui com a ideia central de cada uma.",
    ],
    books: [
      {
        title: "Hábitos Atômicos",
        author: "James Clear",
        pitch: "Mostra como mudanças de 1% por dia, quase invisíveis, se acumulam em transformações enormes — e dá um sistema prático (deixa, desejo, resposta, recompensa) pra construir hábitos que grudam.",
        quote: "Você não sobe ao nível das suas metas. Você cai ao nível dos seus sistemas.",
      },
      {
        title: "O Poder do Hábito",
        author: "Charles Duhigg",
        pitch: "Explica a ciência por trás do \"loop do hábito\" — gatilho, rotina, recompensa — e como reconhecer e reprogramar os seus.",
        quote: "Hábitos não podem ser extintos, só substituídos.",
      },
      {
        title: "Dopamina Nation",
        author: "Dr. Anna Lembke",
        pitch: "Uma psiquiatra explica por que a abundância de prazer fácil do mundo moderno nos deixa mais ansiosos e menos capazes de fazer coisas difíceis — e como reequilibrar isso.",
        quote: "Quanto mais buscamos o prazer, mais dor sofremos.",
      },
      {
        title: "Mindset — A Nova Psicologia do Sucesso",
        author: "Carol S. Dweck",
        pitch: "A diferença entre acreditar que suas habilidades são fixas ou que podem ser desenvolvidas muda completamente como você reage a erro, esforço e fracasso.",
        quote: "Torne-se apaixonado por melhorar, em vez de estar em busca da aprovação.",
      },
    ],
  },
  {
    id: "financas-basico",
    category: "Finanças",
    icon: "trendingUp",
    title: "Educação financeira: o básico que quase ninguém te ensinou",
    excerpt: "Antes de pensar em investir, existem quatro fundamentos que decidem se o resto vai funcionar.",
    content: [
      "Disciplina financeira segue exatamente a mesma lógica dos hábitos: não é sobre um golpe de sorte, é sobre repetição de decisões pequenas e corretas, todo mês.",
      "1. Pague-se primeiro. Antes de gastar, separe um percentual do que ganhar (mesmo que seja 10%) assim que o dinheiro entrar — não com o que sobra no fim do mês, porque quase nunca sobra nada.",
      "2. Monte uma reserva de emergência antes de qualquer investimento arriscado. De 3 a 6 meses do seu custo de vida guardados em algo líquido é o que te protege de virar dívida quando o imprevisto acontecer — porque ele vai acontecer.",
      "3. Fuja da inflação de estilo de vida. Cada vez que sua renda sobe, é tentador que seus gastos subam junto. Quem mantém o padrão de vida e direciona o aumento pra poupança/investimento é quem sai na frente em 10 anos.",
      "4. Juros compostos trabalham a seu favor ou contra você — nunca neutros. A favor, quando você investe cedo e deixa o tempo compor. Contra, quando você deve no cartão de crédito ou no cheque especial. Sair do vermelho é sempre a prioridade número 1.",
    ],
  },
  {
    id: "livros-financas",
    category: "Livros",
    icon: "book",
    title: "3 livros que mudam sua relação com dinheiro",
    excerpt: "Educação financeira não é sobre fórmula de investimento — é sobre mentalidade primeiro.",
    content: [
      "Antes de qualquer planilha ou aplicação, o que separa quem constrói patrimônio de quem vive no vermelho é, na maior parte das vezes, mentalidade. Estas três leituras atacam exatamente isso.",
    ],
    books: [
      {
        title: "O Homem Mais Rico da Babilônia",
        author: "George S. Clason",
        pitch: "Parábolas simples, escritas há um século, que ensinam o princípio mais importante de finanças pessoais: guardar uma parte de tudo que você ganha, sem exceção.",
        quote: "Uma parte de tudo que você ganha é sua para guardar.",
      },
      {
        title: "Pai Rico, Pai Pobre",
        author: "Robert Kiyosaki",
        pitch: "Muda a forma como você olha pra ativo e passivo — e por que trabalhar mais nem sempre significa ficar mais rico.",
        quote: "Os ricos compram ativos. Os pobres e a classe média compram passivos pensando que são ativos.",
      },
      {
        title: "Os Segredos da Mente Milionária",
        author: "T. Harv Eker",
        pitch: "Argumenta que cada pessoa carrega um \"blueprint financeiro\" formado na infância — e que mudar sua relação com dinheiro começa por reconhecer e reescrever essas crenças.",
        quote: "Dê-me cinco minutos e eu posso mudar sua forma de pensar sobre dinheiro para sempre.",
      },
    ],
  },
];

// Tela "Artigos": grade de cards filtráveis por categoria; cada card abre
// o conteúdo completo (e, quando tem, as indicações de livro) num modal.
function ArtigosView() {
  const [category, setCategory] = useState("Todos");
  const [openId, setOpenId] = useState(null);
  const filtered = category === "Todos" ? ARTICLES : ARTICLES.filter((a) => a.category === category);
  const open = ARTICLES.find((a) => a.id === openId);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm" style={{ color: "var(--text-dim)" }}>{ARTICLES.length} artigos sobre disciplina, dopamina e finanças</p>
        <div className="flex gap-2 flex-wrap">
          {ARTICLE_CATEGORIES.map((c) => (
            <button key={c} onClick={() => setCategory(c)} className={"lq-reset lq-focus lq-chip" + (category === c ? " active" : "")}>
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((a, i) => {
          const Icon = iconFor(a.icon);
          const color = ACCENT_HEX[ARTICLE_CATEGORY_COLOR[a.category]];
          return (
            <button key={a.id} onClick={() => setOpenId(a.id)} className="lq-reset lq-focus lq-card lq-animate p-4 text-left flex flex-col gap-3" style={{ animationDelay: `${i * 30}ms` }}>
              <div className="flex items-center justify-between">
                <div className="lq-icon-badge" style={{ background: `${color}1F`, color }}><Icon size={17} /></div>
                <span className="lq-chip" style={{ color, borderColor: "transparent", background: `${color}1F` }}>{a.category}</span>
              </div>
              <div>
                <h4 className="lq-display font-medium text-[14px] mb-1">{a.title}</h4>
                <p className="text-xs" style={{ color: "var(--text-dim)" }}>{a.excerpt}</p>
              </div>
            </button>
          );
        })}
      </div>

      {open && (
        <Modal title={open.title} onClose={() => setOpenId(null)}>
          {open.content.map((p, i) => (
            <p key={i} className="text-sm" style={{ color: "var(--text-dim)", lineHeight: 1.6 }}>{p}</p>
          ))}
          {open.books && open.books.map((b) => (
            <div key={b.title} className="lq-card lq-quote-card p-4 flex flex-col gap-2">
              <p className="lq-display font-medium text-[13px]">{b.title} <span className="text-xs" style={{ color: "var(--text-faint)", fontWeight: 400 }}>— {b.author}</span></p>
              <p className="text-xs" style={{ color: "var(--text-dim)", lineHeight: 1.5 }}>{b.pitch}</p>
              <p className="lq-quote-text" style={{ fontSize: 13 }}>"{b.quote}"</p>
            </div>
          ))}
        </Modal>
      )}
    </div>
  );
}

/* ============================================================ frase do dia (disciplina) ============================================================ */
// Uma frase fixa por dia (mesmo índice pra todo mundo que abrir o app
// naquele dia) — dá o efeito de "voltar amanhã pra ver a próxima",
// sem precisar de servidor ou de sorteio a cada render.
const DISCIPLINE_QUOTES = [
  "Disciplina é a ponte entre onde você está e onde quer chegar.",
  "Motivação te faz começar. Disciplina te faz continuar quando a motivação vai embora.",
  "Você não sobe de nível na sorte — sobe de nível todo dia que decide aparecer.",
  "Cada hábito marcado hoje é um voto para a pessoa que você quer se tornar.",
  "A disciplina pesa gramas. O arrependimento pesa toneladas.",
  "Não espere a vontade chegar. Aja — a vontade vem depois.",
  "O guerreiro não vence pela intensidade de um dia, vence pela repetição de mil dias pequenos.",
  "Feito é melhor que perfeito. Marque o hábito, mesmo que seja só 1%.",
  "Sua rotina de hoje é o rascunho da sua vida daqui a um ano.",
  "Disciplina não é castigo. É a forma mais alta de amor-próprio.",
  "Ninguém sente vontade todos os dias. Os disciplinados agem mesmo sem vontade.",
  "Pequenos hábitos, repetidos sem exceção, criam grandes transformações.",
  "Você é o que você faz repetidamente — não o que você planeja fazer.",
  "A sequência que você está construindo agora é mais forte do que parece.",
  "O único treino que não conta é aquele que você pulou.",
  "Constância vence talento quando o talento não tem constância.",
  "Hoje é só mais um dia. Mas são os \"mais um dia\" que constroem uma lenda.",
  "Sua melhor versão não chega de uma vez — ela é montada hábito por hábito.",
  "Desista da perfeição. Não desista da constância.",
  "Cada \"não\" a uma distração é um \"sim\" ao seu objetivo.",
];
function dayOfYear(d = new Date()) {
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d - start) / 86400000);
}

/* ============================================================ dicas do coach ============================================================ */
// Textos genéricos escolhidos com base no progresso real do dia — não citam
// hábitos específicos porque cada jogador cria os seus próprios.
const COACH_TIPS_EMPTY = [
  "Comece criando seu primeiro hábito na aba \"Hábitos\" — pequenos passos todo dia constroem disciplina.",
];
const COACH_TIPS = [
  "Você ainda não concluiu nenhum hábito hoje. Bora começar?",
  "Bom progresso! Termine mais um hábito para manter a sequência viva.",
  "Você está indo muito bem hoje — continue nesse ritmo.",
  "Quase lá! Falta pouco para fechar todos os hábitos do dia.",
  "Dia completo! Considere registrar como foi no Diário.",
];

/* ============================================================ componente raiz ============================================================ */
// LifeQuest junta tudo: estado do jogador (sincronizado com a conta no
// servidor), navegação entre views e os handlers que cada tela chama para
// alterar hábitos, missões, eventos, diário e configurações.
export default function LifeQuest() {
  // ---- estado principal, sincronizado com a conta no servidor ----
  const [st, setSt] = useState(defaultState());

  // conta da sessão atual — enquanto for null, o jogo fica escondido atrás
  // do fluxo de boas-vindas/quiz/cadastro/login
  const [account, setAccount] = useState(null);
  // true enquanto verifica se já existe uma sessão ativa no servidor
  const [booting, setBooting] = useState(true);
  // true quando o app abriu a partir do cache local (sem internet) em vez
  // de confirmar com o servidor — mostra o aviso no topo e evita sobrescrever
  // o servidor até confirmar que a sessão ainda é válida.
  const [offline, setOffline] = useState(false);

  // ao abrir o app, pergunta ao servidor se o navegador já tem uma sessão
  // válida; se tiver, carrega o progresso salvo daquela conta. Sem internet
  // o fetch nem chega a responder (err.status fica undefined, diferente de
  // um 401 de "não logado") — nesse caso usa o último snapshot salvo neste
  // aparelho, pra agenda/alarme continuarem funcionando offline.
  useEffect(() => {
    authMe()
      .then(({ account: acc }) => {
        setAccount(acc);
        return getState();
      })
      .then((res) => res && setSt(res.state))
      .catch((err) => {
        if (err?.status) return; // servidor respondeu "não autenticado" — login normal
        const cached = loadOfflineCache();
        if (cached) {
          setAccount(cached.account);
          setSt(cached.state);
          setOffline(true);
        }
      })
      .finally(() => setBooting(false));
  }, []);

  // volta a internet: tenta confirmar a sessão e mandar pro servidor o que
  // foi feito offline (o cache local pode estar mais atualizado que o
  // servidor). Se a sessão não for mais válida, mantém como está — a pessoa
  // só percebe ao tentar mexer em algo que precise da rede.
  useEffect(() => {
    if (!offline) return;
    function onOnline() {
      authMe()
        .then(() => putState(st))
        .then(() => setOffline(false))
        .catch(() => {});
    }
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [offline, st]);

  // espelha conta+progresso no cache local a cada mudança — é o snapshot
  // usado pra abrir offline da próxima vez.
  useEffect(() => {
    if (booting || !account) return;
    saveOfflineCache(account, st);
  }, [account, st, booting]);

  const [view, setView] = useState("dashboard");
  const [chartRange, setChartRange] = useState("semana");
  const [modal, setModal] = useState(null); // null | "habit" | "event" | "journal" | "mission" | "weeklyMission"
  const [notifOpen, setNotifOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [popupId, setPopupId] = useState(null);
  // alarme de evento tocando agora (null = nenhum) — só existe enquanto o
  // som está em loop; ringingAlarm.stop desliga o áudio e fecha a tela.
  const [ringingAlarm, setRingingAlarm] = useState(null);

  // salva automaticamente qualquer mudança de estado no servidor — com um
  // pequeno debounce pra não martelar a API a cada hábito marcado
  useEffect(() => {
    if (booting || !account) return;
    const t = setTimeout(() => {
      putState(st).catch(() => {});
    }, 800);
    return () => clearTimeout(t);
  }, [st, booting, account]);

  // aplica o tema escolhido em Configurações no elemento <html>, porque as
  // variáveis de :root[data-theme] em lifequest.css só funcionam ali
  useEffect(() => {
    const root = document.documentElement;
    if (st.settings.theme === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", st.settings.theme);
  }, [st.settings.theme]);

  // alerta de evento da agenda: só funciona com o app aberto na aba (não é
  // push do navegador). Confere a cada 20s se algum evento bateu o horário
  // de aviso configurado, e dispara notificação no sino + beep uma única
  // vez por evento/dia (via ref, pra não repetir a cada tick do intervalo).
  const stRef = useRef(st);
  useEffect(() => { stRef.current = st; }, [st]);
  const firedEventAlertsRef = useRef(new Set());
  // lembrete diário de hábitos pendentes (gatilho: "Lembrete de hábitos" em
  // Configurações). Dispara uma vez por dia, a partir das 20h, se sobrar
  // hábito não concluído — guarda o dia já lembrado numa ref pra não repetir.
  const firedHabitReminderRef = useRef(null);
  useEffect(() => {
    const id = setInterval(() => {
      const now = new Date();
      const current = stRef.current;
      for (const ev of current.events) {
        if (!isEventAlertDue(ev, now)) continue;
        const key = `${ev.id}:${dateKey(now)}`;
        if (firedEventAlertsRef.current.has(key)) continue;
        firedEventAlertsRef.current.add(key);
        setSt((prev) => pushNotification(prev, "alarmClock", `${ev.title} em ${ev.alertMinutes} min`));
        if (current.settings.sound) {
          const stop = ringAlarmLoop();
          setRingingAlarm((prevRing) => {
            prevRing?.stop(); // dois alarmes no mesmo minuto: encerra o anterior antes
            return { title: ev.title, minutes: ev.alertMinutes, stop };
          });
        }
      }

      if (current.settings.notifHabits && now.getHours() >= 20) {
        const today = dateKey(now);
        if (firedHabitReminderRef.current !== today) {
          firedHabitReminderRef.current = today;
          const pending = current.habits.filter((h) => (h.type === "counter" ? h.progress < h.total : !h.done));
          if (pending.length > 0) {
            const text = pending.length === 1
              ? `Ainda falta 1 hábito hoje: "${pending[0].name}".`
              : `Ainda faltam ${pending.length} hábitos hoje.`;
            setSt((prev) => pushNotification(prev, "bell", text));
            if (current.settings.sound) playAlertBeep();
          }
        }
      }
    }, 20000);
    return () => clearInterval(id);
  }, []);

  // destrava o áudio no primeiro toque na tela — precisa nascer dentro de um
  // gesto do usuário pra não ficar mudo quando o alarme dispara sozinho
  // depois, via setInterval (ver getSharedAudioCtx).
  useEffect(() => {
    function unlock() {
      getSharedAudioCtx();
      window.removeEventListener("pointerdown", unlock);
    }
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);

  // desliga o alarme se a aba fechar/recarregar com ele tocando — sem isso
  // o AudioContext do loop anterior ficaria pendurado.
  const ringingAlarmRef = useRef(ringingAlarm);
  useEffect(() => { ringingAlarmRef.current = ringingAlarm; }, [ringingAlarm]);
  useEffect(() => () => ringingAlarmRef.current?.stop(), []);

  function dismissAlarm() {
    ringingAlarm?.stop();
    setRingingAlarm(null);
  }

  const accent = ACCENT_HEX[st.settings.accent] || ACCENT_HEX.mono;
  const pair = ACCENT_PAIR[st.settings.accent] || ACCENT_PAIR.mono;
  const accentSoft = ACCENT_SOFT[st.settings.accent] || ACCENT_SOFT.mono;

  // mostra um toast por ~3s
  function addToast(text) {
    const id = uid();
    setToasts((prev) => [...prev, { id, text }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  }

  /* ---------- hábitos ---------- */
  // Marca/desmarca o dia de hoje no histórico do hábito, recalcula a
  // sequência a partir dele e registra uma notificação real quando um
  // marco de sequência (7/14/30/60/100 dias) é atingido.
  function onCheckHabit(id) {
    setSt((prev) => {
      const habit = prev.habits.find((h) => h.id === id);
      if (!habit || habit.type !== "check") return prev;
      const today = new Date();
      const key = dateKey(today);
      const willBeDone = !habit.done;
      const prevStreak = computeStreak(habit.history, today);
      const history = { ...habit.history };
      if (willBeDone) history[key] = true; else delete history[key];
      const newStreak = computeStreak(history, today);

      const habits = prev.habits.map((h) => (h.id === id ? { ...h, done: willBeDone, history } : h));
      let next = applyXp({ ...prev, habits }, willBeDone ? habit.xp : -habit.xp);
      if (next.leveledUp && prev.settings.notifCelebrate) next = pushNotification(next, "trophy", `Você alcançou o nível ${next.level}!`);
      const hit = STREAK_MILESTONES.find((m) => newStreak >= m && prevStreak < m);
      if (hit && prev.settings.notifCelebrate) next = pushNotification(next, "flame", `Sequência de ${hit} dias em "${habit.name}"!`);
      return next;
    });
    setPopupId(id);
    setTimeout(() => setPopupId((cur) => (cur === id ? null : cur)), 700);
    addToast("Hábito atualizado!");
  }

  function onIncrementHabit(id, delta) {
    setSt((prev) => {
      const habit = prev.habits.find((h) => h.id === id);
      if (!habit || habit.type !== "counter") return prev;
      const today = new Date();
      const key = dateKey(today);
      const wasComplete = habit.progress >= habit.total;
      const progress = Math.max(0, Math.min(habit.total, habit.progress + delta));
      const isComplete = progress >= habit.total;
      const prevStreak = computeStreak(habit.history, today);
      const history = { ...habit.history };
      if (isComplete) history[key] = true; else delete history[key];
      const newStreak = computeStreak(history, today);

      const habits = prev.habits.map((h) => (h.id === id ? { ...h, progress, history } : h));
      let xpDelta = 0;
      if (!wasComplete && isComplete) xpDelta = habit.xp;
      if (wasComplete && !isComplete) xpDelta = -habit.xp;
      let next = applyXp({ ...prev, habits }, xpDelta);
      if (next.leveledUp && prev.settings.notifCelebrate) next = pushNotification(next, "trophy", `Você alcançou o nível ${next.level}!`);
      const hit = STREAK_MILESTONES.find((m) => newStreak >= m && prevStreak < m);
      if (hit && prev.settings.notifCelebrate) next = pushNotification(next, "flame", `Sequência de ${hit} dias em "${habit.name}"!`);
      return next;
    });
  }

  function onDeleteHabit(id) {
    setSt((prev) => ({ ...prev, habits: prev.habits.filter((h) => h.id !== id) }));
  }

  function onAddHabit(data) {
    setSt((prev) => ({
      ...prev,
      habits: [...prev.habits, { id: uid(), history: {}, ...data }],
    }));
    addToast("Hábito criado!");
    setModal(null);
  }

  /* ---------- missões diárias ---------- */
  function onCompleteMission(id) {
    setSt((prev) => {
      const mission = prev.missions.find((m) => m.id === id);
      if (!mission) return prev;
      const willBeDone = !mission.done;
      const missions = prev.missions.map((m) => (m.id === id ? { ...m, done: willBeDone } : m));
      return applyXp({ ...prev, missions }, willBeDone ? mission.xp : -mission.xp);
    });
  }
  function onDeleteMission(id) {
    setSt((prev) => ({ ...prev, missions: prev.missions.filter((m) => m.id !== id) }));
  }
  function onAddMission(data) {
    setSt((prev) => ({ ...prev, missions: [...prev.missions, { id: uid(), done: false, ...data }] }));
    addToast("Missão criada!");
    setModal(null);
  }

  /* ---------- missões semanais ---------- */
  function onIncrementWeeklyMission(id) {
    setSt((prev) => {
      const mission = prev.weeklyMissions.find((m) => m.id === id);
      if (!mission || mission.progress >= mission.total) return prev;
      const progress = mission.progress + 1;
      const weeklyMissions = prev.weeklyMissions.map((m) => (m.id === id ? { ...m, progress } : m));
      // só concede o XP quando a meta é batida
      return progress >= mission.total ? applyXp({ ...prev, weeklyMissions }, mission.xp) : { ...prev, weeklyMissions };
    });
  }
  function onDeleteWeeklyMission(id) {
    setSt((prev) => ({ ...prev, weeklyMissions: prev.weeklyMissions.filter((m) => m.id !== id) }));
  }
  function onAddWeeklyMission(data) {
    setSt((prev) => ({ ...prev, weeklyMissions: [...prev.weeklyMissions, { id: uid(), progress: 0, ...data }] }));
    addToast("Missão semanal criada!");
    setModal(null);
  }

  /* ---------- metas (objetivos) ---------- */
  function onOpenAddGoal() {
    const name = window.prompt("Nome da meta:");
    if (!name || !name.trim()) return;
    setSt((prev) => ({ ...prev, goals: [...prev.goals, { id: uid(), name: name.trim(), pct: 0 }] }));
    addToast("Meta criada!");
  }
  function onBumpGoal(id, delta) {
    setSt((prev) => {
      const before = prev.goals.find((g) => g.id === id);
      const goals = prev.goals.map((g) => (g.id === id ? { ...g, pct: Math.max(0, Math.min(100, g.pct + delta)) } : g));
      const after = goals.find((g) => g.id === id);
      let next = { ...prev, goals };
      if (before && after && after.pct >= 100 && before.pct < 100 && prev.settings.notifGoals) {
        next = pushNotification(next, "trophy", `Meta concluída: "${after.name}"!`);
      }
      return next;
    });
  }
  function onDeleteGoal(id) {
    setSt((prev) => ({ ...prev, goals: prev.goals.filter((g) => g.id !== id) }));
  }

  /* ---------- agenda ---------- */
  function onAddEvent(data) {
    setSt((prev) => ({ ...prev, events: [...prev.events, { id: uid(), ...data }] }));
    addToast("Evento adicionado!");
    setModal(null);
  }
  function onDeleteEvent(id) {
    setSt((prev) => ({ ...prev, events: prev.events.filter((e) => e.id !== id) }));
  }

  /* ---------- diário ---------- */
  function onAddJournal(data) {
    const date = new Date().toLocaleDateString("pt-BR");
    setSt((prev) => ({ ...prev, journal: [...prev.journal, { id: uid(), date, ...data }] }));
    addToast("Entrada salva no diário!");
    setModal(null);
  }

  /* ---------- configurações ---------- */
  function onUpdateSettings(patch) {
    setSt((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }));
  }
  // apaga a conta e todo o progresso salvo no servidor — sem volta
  async function onResetData() {
    if (!window.confirm("Isso vai apagar sua conta e TODOS os seus dados salvos, sem volta. Continuar?")) return;
    try {
      await deleteAccount();
    } catch {
      // mesmo se a chamada falhar, ainda assim tira a pessoa da conta localmente
    }
    setSt(defaultState());
    setAccount(null);
    clearOfflineCache();
  }

  // encerra a sessão sem apagar nada — o progresso continua salvo pra um
  // próximo login (neste navegador ou em qualquer outro)
  async function onLogout() {
    try {
      await authLogout();
    } catch {
      // idem: segue com o logout local mesmo se a chamada falhar
    }
    setSt(defaultState());
    setAccount(null);
    clearOfflineCache();
  }

  /* ---------- onboarding ---------- */
  // Recebe a conta já criada/autenticada no servidor. No cadastro, também
  // vêm as respostas do quiz — aplica o bônus de boas-vindas em XP e
  // preenche o perfil. No login, não há quiz: só carrega o progresso salvo.
  function onOnboardingComplete({ account: acc, profile }) {
    setAccount(acc);

    if (!profile) {
      getState().then((res) => res && setSt(res.state)).catch(() => {});
      return;
    }

    setSt((prev) => {
      const withProfile = {
        ...prev,
        settings: {
          ...prev.settings,
          characterName: acc.name,
          age: profile.age,
          disciplineScore: profile.disciplineScore,
          focusArea: profile.focusArea,
          obstacle: profile.obstacle,
          archetype: profile.archetype,
        },
      };
      let next = applyXp(withProfile, 50);
      next = pushNotification(next, "sparkles", `Bem-vindo(a), ${acc.name}! +50 XP de bônus por criar seu perfil.`);
      return next;
    });
  }

  /* ---------- notificações ---------- */
  function onMarkRead(id) {
    setSt((prev) => ({ ...prev, notifications: prev.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) }));
  }
  function onMarkAllRead() {
    setSt((prev) => ({ ...prev, notifications: prev.notifications.map((n) => ({ ...n, read: true })) }));
  }

  /* ---------- valores derivados (sempre recalculados a partir do estado real) ---------- */
  const today = new Date();

  // hábitos com sequência e "semana" calculadas a partir do histórico real
  // — evita guardar esses valores soltos no estado e deixá-los desatualizados
  const habitsView = useMemo(
    () => st.habits.map((h) => ({ ...h, streak: computeStreak(h.history, today), week: computeWeek(h.history, today) })),
    [st.habits] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const stView = { ...st, habits: habitsView };

  // progresso geral (nível + fração do nível atual) usado pelo fundo
  // animado — /20 é um horizonte "de curto prazo" pra dar sensação de
  // movimento real logo nas primeiras semanas, não só lá pelo nível 50
  const overallPct = Math.min(1, Math.max(0, (st.level - 1 + st.xp / XP_PER_LEVEL) / 20));

  const bestStreak = habitsView.reduce((max, h) => Math.max(max, h.streak), 0);
  const todayXp = st.xpLog[dateKey(today)] || 0;
  const chartData = useMemo(() => buildChartData(st.xpLog, chartRange), [st.xpLog, chartRange]);
  const weekChartData = useMemo(() => buildChartData(st.xpLog, "semana"), [st.xpLog]);
  const totalXpWeek = weekChartData.reduce((sum, d) => sum + d.xp, 0);

  const questTitle = useMemo(() => {
    if (st.missions.length === 0) return "Nenhuma missão criada ainda";
    const pending = st.missions.find((m) => !m.done);
    return pending ? pending.title : "Todas as missões concluídas!";
  }, [st.missions]);

  const coachTip = useMemo(() => {
    if (habitsView.length === 0) return COACH_TIPS_EMPTY[0];
    const doneCount = habitsView.filter((h) => (h.type === "counter" ? h.progress >= h.total : h.done)).length;
    const ratio = doneCount / habitsView.length;
    if (doneCount === 0) return COACH_TIPS[0];
    if (ratio >= 1) return COACH_TIPS[4];
    if (ratio >= 0.66) return COACH_TIPS[3];
    if (ratio >= 0.33) return COACH_TIPS[2];
    return COACH_TIPS[1];
  }, [habitsView]);

  const quoteOfDay = DISCIPLINE_QUOTES[dayOfYear(today) % DISCIPLINE_QUOTES.length];

  // verificando se já existe uma sessão ativa no servidor
  if (booting) {
    return (
      <div className="ob-app" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="ob-ring" />
      </div>
    );
  }

  // sem conta ainda: mostra o onboarding (hero + quiz + revelação + cadastro,
  // ou login) em vez do jogo. Só depois de autenticar é que o shell abaixo aparece.
  if (!account) {
    return <Onboarding onComplete={onOnboardingComplete} />;
  }

  return (
    // --accent/--accent-bg/--accent-border/--accent-soft sobrescrevem, só
    // dentro do app, os valores fixos definidos em index.css — assim toda a
    // interface (nav ativa, anéis, barras, switches) segue a cor escolhida
    // em Configurações em vez de ficar presa num roxo fixo.
    <div className="lq-app" style={{
      "--accent": accent, "--accent-bg": `${accent}1F`, "--accent-border": `${accent}80`, "--accent-soft": accentSoft,
    }}>
      <DashboardBg hour={today.getHours()} pct={overallPct} accent={accent} />
      {offline && (
        <div className="lq-offline-banner" role="status">
          Sem internet — mostrando o último progresso salvo neste aparelho. Alarmes da agenda continuam funcionando.
        </div>
      )}
      <div className="lq-shell">
        <Sidebar view={view} setView={setView} />
        <main className="lq-main lq-scroll">
          <Topbar view={view} notifications={st.notifications} notifOpen={notifOpen} setNotifOpen={setNotifOpen}
            onMarkRead={onMarkRead} onMarkAllRead={onMarkAllRead} />

          {view === "dashboard" && (
            <DashboardView st={stView} accent={accent} pair={pair} onCheckHabit={onCheckHabit} onIncrementHabit={onIncrementHabit}
              popupId={popupId} chartRange={chartRange} setChartRange={setChartRange} chartData={chartData}
              questTitle={questTitle} coachTip={coachTip} quoteOfDay={quoteOfDay} todayXp={todayXp} bestStreak={bestStreak}
              onOpenAddGoal={onOpenAddGoal} onBumpGoal={onBumpGoal} onDeleteGoal={onDeleteGoal} />
          )}
          {view === "habitos" && (
            <HabitosView st={stView} onCheckHabit={onCheckHabit} onIncrementHabit={onIncrementHabit}
              onDeleteHabit={onDeleteHabit} onOpenAddHabit={() => setModal("habit")} onAddHabit={onAddHabit} />
          )}
          {view === "missoes" && (
            <MissoesView st={st} onCompleteMission={onCompleteMission} onDeleteMission={onDeleteMission}
              onOpenAddMission={() => setModal("mission")} onIncrementWeeklyMission={onIncrementWeeklyMission}
              onDeleteWeeklyMission={onDeleteWeeklyMission} onOpenAddWeeklyMission={() => setModal("weeklyMission")} />
          )}
          {view === "agenda" && (
            <AgendaView st={st} onOpenAddEvent={() => setModal("event")} onDeleteEvent={onDeleteEvent} />
          )}
          {view === "desenvolvimento" && (
            <DesenvolvimentoView st={stView} onAddHabit={onAddHabit} onAddMission={onAddMission} />
          )}
          {view === "artigos" && <ArtigosView />}
          {view === "diario" && <DiarioView st={st} onOpenAddJournal={() => setModal("journal")} />}
          {view === "estatisticas" && (
            <EstatisticasView st={stView} accent={accent} pair={pair} chartRange={chartRange} setChartRange={setChartRange}
              chartData={chartData} totalXpWeek={totalXpWeek} bestStreak={bestStreak} />
          )}
          {view === "perfil" && <PerfilView st={stView} accent={accent} pair={pair} onUpdateSettings={onUpdateSettings} />}
          {view === "config" && <ConfigView st={st} onUpdateSettings={onUpdateSettings} onResetData={onResetData} onLogout={onLogout} account={account} />}
        </main>
      </div>

      <BottomNav view={view} setView={setView} />
      <ToastStack toasts={toasts} />

      {modal === "habit" && <HabitModal onClose={() => setModal(null)} onSubmit={onAddHabit} />}
      {modal === "event" && <EventModal onClose={() => setModal(null)} onSubmit={onAddEvent} />}
      {modal === "journal" && <JournalModal onClose={() => setModal(null)} onSubmit={onAddJournal} />}
      {modal === "mission" && <MissionModal weekly={false} onClose={() => setModal(null)} onSubmit={onAddMission} />}
      {modal === "weeklyMission" && <MissionModal weekly onClose={() => setModal(null)} onSubmit={onAddWeeklyMission} />}

      {ringingAlarm && <AlarmRingOverlay alarm={ringingAlarm} onDismiss={dismissAlarm} />}
    </div>
  );
}
