// src/routes/state.js — Progresso do jogo (hábitos, XP, metas...) por conta
const express = require('express');
const router = express.Router();
const { getDb } = require('../db');
const { defaultState } = require('../defaultState');

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ ok: false, erro: 'Não autenticado' });
  next();
}

// ── GET /state ────────────────────────────────────────────────────────────
router.get('/', requireAuth, (req, res) => {
  const db = getDb();
  const row = db.prepare('SELECT state_json FROM game_state WHERE user_id = ?').get(req.session.userId);
  const state = row ? JSON.parse(row.state_json) : defaultState();
  res.json({ ok: true, state });
});

// ── PUT /state ────────────────────────────────────────────────────────────
router.put('/', requireAuth, (req, res) => {
  const state = req.body;
  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    return res.status(400).json({ ok: false, erro: 'Estado inválido' });
  }

  const db = getDb();
  db.prepare(`
    INSERT INTO game_state (user_id, state_json, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(user_id) DO UPDATE SET state_json = excluded.state_json, updated_at = excluded.updated_at
  `).run(req.session.userId, JSON.stringify(state));

  res.json({ ok: true });
});

module.exports = router;
