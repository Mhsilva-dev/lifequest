// src/routes/admin.js — painel de administração (só leitura): login por
// senha única e listagem das contas cadastradas, pra você acompanhar quem
// se cadastrou e se está realmente usando o app.
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { getDb } = require('../db');

function requireAdmin(req, res, next) {
  if (!req.session.isAdmin) return res.status(401).json({ ok: false, erro: 'Não autenticado' });
  next();
}

// Comparação em tempo constante — evita vazar, por diferença de tempo de
// resposta, quantos caracteres do usuário/senha estão certos.
function constantTimeEquals(input, expected) {
  if (!expected) return false;
  const a = Buffer.from(String(input || ''));
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// ── POST /login ──────────────────────────────────────────────────────────
router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  const userOk = constantTimeEquals(username, process.env.ADMIN_USERNAME || '');
  const passOk = constantTimeEquals(password, process.env.ADMIN_PASSWORD || '');
  if (!userOk || !passOk) {
    return res.status(401).json({ ok: false, erro: 'Usuário ou senha incorretos' });
  }
  req.session.isAdmin = true;
  res.json({ ok: true });
});

// ── POST /logout ──────────────────────────────────────────────────────────
router.post('/logout', (req, res) => {
  delete req.session.isAdmin;
  res.json({ ok: true });
});

// ── GET /users ────────────────────────────────────────────────────────────
router.get('/users', requireAdmin, (req, res) => {
  const db = getDb();
  const rows = db.prepare(`
    SELECT u.id, u.name, u.email, u.created_at, g.state_json, g.updated_at
    FROM users u
    LEFT JOIN game_state g ON g.user_id = u.id
    ORDER BY g.updated_at DESC
  `).all();

  const users = rows.map((row) => {
    let stats = { level: null, xp: null, habits: 0, missions: 0, weeklyMissions: 0, journal: 0 };
    if (row.state_json) {
      try {
        const state = JSON.parse(row.state_json);
        stats = {
          level: state.level ?? null,
          xp: state.xp ?? null,
          habits: (state.habits || []).length,
          missions: (state.missions || []).length,
          weeklyMissions: (state.weeklyMissions || []).length,
          journal: (state.journal || []).length,
        };
      } catch { /* state corrompido — mantém stats zerados em vez de derrubar a lista inteira */ }
    }
    return {
      id: row.id, name: row.name, email: row.email,
      createdAt: row.created_at, lastActiveAt: row.updated_at,
      ...stats,
    };
  });

  res.json({ ok: true, users });
});

module.exports = router;
