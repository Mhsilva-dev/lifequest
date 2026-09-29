// src/db.js — Singleton de conexão com o banco SQLite
require('dotenv').config();
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dbPath = process.env.DB_PATH || './database/lifequest.db';

let _db;

function getDb() {
  if (_db) return _db;

  fs.mkdirSync(path.dirname(path.resolve(dbPath)), { recursive: true });
  _db = new Database(path.resolve(dbPath));
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');

  _db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT    NOT NULL,
      email         TEXT    NOT NULL UNIQUE,
      password_hash TEXT    NOT NULL,
      created_at    TEXT    DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS game_state (
      user_id     INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      state_json  TEXT NOT NULL,
      updated_at  TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      endpoint    TEXT NOT NULL UNIQUE,
      p256dh      TEXT NOT NULL,
      auth        TEXT NOT NULL,
      created_at  TEXT DEFAULT (datetime('now'))
    );

    -- Garante no máximo 1 envio por dia por (usuário, tipo de lembrete, item)
    -- — é o que impede a notificação de virar spam mesmo se o agendador
    -- rodar de novo ou o processo reiniciar no meio do dia.
    CREATE TABLE IF NOT EXISTS notification_log (
      user_id     INTEGER NOT NULL,
      kind        TEXT NOT NULL,
      item_key    TEXT NOT NULL,
      day         TEXT NOT NULL,
      sent_at     TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, kind, item_key, day)
    );
  `);

  return _db;
}

module.exports = { getDb };
