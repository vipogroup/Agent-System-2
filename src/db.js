import Database from 'sqlite3';
import { open } from 'sqlite';
import fs from 'fs';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data.sqlite');

export async function getDB() {
  const db = await open({
    filename: dbPath,
    driver: Database.Database
  });

  await db.exec('PRAGMA foreign_keys = ON');

  // Create tables if they don't exist
  await db.exec(`
    CREATE TABLE IF NOT EXISTS agents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uid TEXT UNIQUE,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT,
      phone TEXT,
      referral_code TEXT UNIQUE,
      role TEXT DEFAULT 'agent',
      payment_method TEXT DEFAULT 'bank',
      payment_details TEXT,
      is_active INTEGER DEFAULT 1,
      commission_rate_override REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT,
      phone TEXT,
      type TEXT,
      content TEXT,
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS commissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_id INTEGER,
      order_id TEXT,
      amount_cents INTEGER,
      status TEXT DEFAULT 'PENDING_CLEARANCE',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (agent_id) REFERENCES agents (id)
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

    CREATE TABLE IF NOT EXISTS referral_visits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_id INTEGER,
      referral_code TEXT,
      visitor_ip TEXT,
      user_agent TEXT,
      visited_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (agent_id) REFERENCES agents (id)
    );

    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_id INTEGER,
      referral_code TEXT,
      sale_amount REAL,
      commission_amount REAL,
      customer_email TEXT,
      product_name TEXT,
      sale_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (agent_id) REFERENCES agents (id)
    );
  `);

  // seed default commission rate if not exists
  const row = await db.get(`SELECT value FROM settings WHERE key='commission_rate'`);
  if (!row) {
    await db.run(`INSERT INTO settings (key, value) VALUES ('commission_rate', '0.10')`);
  }

  return db;
}

// Initialize database function
export async function initializeDatabase() {
  try {
    const db = await getDB();
    console.log('Database initialized successfully');
    return db;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

// Initialize admin user
export async function initializeAdmin() {
  try {
    const db = await getDB();
    
    // Check if admin exists
    const adminExists = await db.get(
      'SELECT id FROM agents WHERE role = ?', 
      ['admin']
    );
    
    if (!adminExists) {
      console.log('No admin user found, creating default admin...');
      
      const bcrypt = await import('bcryptjs');
      const hashedPassword = await bcrypt.default.hash('admin123', 10);
      
      await db.run(`
        INSERT INTO agents (email, password_hash, full_name, role, referral_code)
        VALUES (?, ?, ?, ?, ?)
      `, [
        'admin@system.com',
        hashedPassword,
        'System Admin',
        'admin',
        'ADMIN001'
      ]);
      
      console.log('✅ Default admin user created');
      console.log('Email: admin@system.com');
      console.log('Password: admin123');
    } else {
      console.log('✅ Admin user exists');
    }
  } catch (error) {
    console.error('Failed to initialize admin:', error);
    throw error;
  }
}
