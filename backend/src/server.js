// src/server.js — Ponto de entrada do backend do LifeQuest (contas + progresso sincronizado)
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const cors = require('cors');

if (!process.env.SESSION_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    console.error('[Config] SESSION_SECRET é obrigatório em produção');
    process.exit(1);
  }
  console.warn('[Config] SESSION_SECRET não definido — usando valor de desenvolvimento');
}

// ── CORS — whitelist de origens permitidas ──────────────────────────────────
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : null; // null = aceita qualquer origem em dev

const corsOptions = {
  credentials: true,
  origin: ALLOWED_ORIGINS
    ? (origin, cb) => {
        if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
        cb(new Error(`Origem não autorizada: ${origin}`));
      }
    : true,
};

const app = express();
app.set('trust proxy', 1); // necessário para cookie seguro atrás do nginx

app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));

// Toda resposta daqui é personalizada por sessão (conta logada) — proíbe
// qualquer cache (navegador, proxy do roteador, rede compartilhada) de
// guardar e reservir essas respostas pra outro dispositivo. Sem isso, um
// cache mal-comportado na mesma rede local pode reaproveitar a resposta de
// GET /api/auth/me ou /api/state de uma pessoa e servir pra outra, mesmo
// sem cookie nenhum em comum.
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, private');
  next();
});

app.use(session({
  store: new FileStore({
    path: './sessions',
    ttl: 30 * 24 * 3600,
    retries: 1,
    logFn: () => {}, // silencia logs internos do FileStore
  }),
  secret: process.env.SESSION_SECRET || 'lifequest-secret-dev',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 30 * 24 * 3600 * 1000,
  },
}));

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/state', require('./routes/state'));
app.use('/api/push', require('./routes/push'));
app.use('/api/admin', require('./routes/admin'));

require('./reminderScheduler').start();

const PORT = process.env.PORT || 3007;
app.listen(PORT, () => console.log(`[LifeQuest API] rodando na porta ${PORT}`));
