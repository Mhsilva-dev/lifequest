// src/routes/auth.js — Cadastro, login, logout e conta do LifeQuest
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { getDb } = require('../db');
const { defaultState } = require('../defaultState');

const EMAIL_RE = /^\S+@\S+\.\S+$/;

function toAccount(user) {
  return { name: user.name, email: user.email, createdAt: new Date(user.created_at + 'Z').getTime() };
}

// ── POST /register ────────────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body || {};
  const cleanName = String(name || '').trim();
  const cleanEmail = String(email || '').trim().toLowerCase();

  if (!cleanName) return res.status(400).json({ ok: false, erro: 'Como podemos te chamar?' });
  if (!EMAIL_RE.test(cleanEmail)) return res.status(400).json({ ok: false, erro: 'Digite um e-mail válido.' });
  if (!password || String(password).length < 4) {
    return res.status(400).json({ ok: false, erro: 'A senha precisa ter pelo menos 4 caracteres.' });
  }

  const db = getDb();
  const existe = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
  if (existe) return res.status(409).json({ ok: false, erro: 'Esse e-mail já está cadastrado.' });

  const hash = await bcrypt.hash(String(password), 12);
  const info = db.prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)')
    .run(cleanName, cleanEmail, hash);

  db.prepare('INSERT INTO game_state (user_id, state_json) VALUES (?, ?)')
    .run(info.lastInsertRowid, JSON.stringify(defaultState()));

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);

  req.session.userId = user.id;
  res.json({ ok: true, account: toAccount(user) });
});

// ── POST /login ────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  const cleanEmail = String(email || '').trim().toLowerCase();

  if (!cleanEmail || !password) {
    return res.status(400).json({ ok: false, erro: 'E-mail e senha obrigatórios.' });
  }

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(cleanEmail);

  // Mensagem genérica para não vazar se o e-mail existe ou não
  if (!user) return res.status(401).json({ ok: false, erro: 'E-mail ou senha incorretos.' });

  const valido = await bcrypt.compare(String(password), user.password_hash);
  if (!valido) return res.status(401).json({ ok: false, erro: 'E-mail ou senha incorretos.' });

  req.session.userId = user.id;
  res.json({ ok: true, account: toAccount(user) });
});

// ── POST /logout ──────────────────────────────────────────────────────────
router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

// ── GET /me ───────────────────────────────────────────────────────────────
router.get('/me', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ ok: false });

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
  if (!user) return res.status(401).json({ ok: false });

  res.json({ ok: true, account: toAccount(user) });
});

// ── DELETE /account — apaga conta e todo o progresso salvo ─────────────────
router.delete('/account', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ ok: false });

  const db = getDb();
  db.prepare('DELETE FROM users WHERE id = ?').run(req.session.userId); // cascade apaga game_state
  req.session.destroy(() => res.json({ ok: true }));
});

module.exports = router;
