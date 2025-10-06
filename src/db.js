import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data.sqlite');

export async function getDB() {
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  await db.exec('PRAGMA foreign_keys = ON');

  // Fresh schema (idempotent for SQLite)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS agents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uid TEXT UNIQUE,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT,
      is_active INTEGER DEFAULT 1,
      referral_code TEXT UNIQUE NOT NULL,
      cookie_ttl_days INTEGER DEFAULT 30,
      role TEXT DEFAULT 'agent', -- 'agent' or 'admin'
      commission_rate_override REAL, -- nullable, 0.12 for 12% etc.
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_uid TEXT UNIQUE,
      customer_email TEXT,
      total_amount_cents INTEGER NOT NULL, -- store money in cents
      currency TEXT DEFAULT 'ILS',
      agent_id INTEGER,
      status TEXT,
      paid_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(agent_id) REFERENCES agents(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS commissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER,
      agent_id INTEGER,
      rate REAL NOT NULL, -- 0.10 = 10%
      base_amount_cents INTEGER NOT NULL,
      commission_amount_cents INTEGER NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('PENDING_CLEARANCE','CLEARED','REVERSED')),
      cleared_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY(agent_id) REFERENCES agents(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS payouts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_id INTEGER,
      amount_cents INTEGER NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('REQUESTED','APPROVED','PAID','REJECTED')),
      bank_account_iban TEXT,
      bank_account_name TEXT,
      requested_at TEXT DEFAULT (datetime('now')),
      approved_at TEXT,
      paid_at TEXT,
      note TEXT,
      FOREIGN KEY(agent_id) REFERENCES agents(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // seed default commission rate if not exists
  const row = await db.get(`SELECT value FROM settings WHERE key='commission_rate'`);
  if (!row) {
    await db.run(`INSERT INTO settings (key, value) VALUES ('commission_rate', '0.10')`);
  }

  return db;
}
