import dotenv from 'dotenv';
import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import { getDB } from './db.js';
import { hashPassword } from './auth.js';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const rl = readline.createInterface({ input, output });
const email = await rl.question('Admin email: ');
const pw = await rl.question('Admin password: ');
await rl.close();

if (!email || !pw) {
  console.error('Email/password required.');
  process.exit(1);
}

const db = await getDB();
const uid = uuidv4();
const referral = 'AG' + Math.random().toString(36).slice(2, 8).toUpperCase();
const hash = await hashPassword(pw);

await db.run(
  `INSERT INTO agents (uid, email, password_hash, full_name, referral_code, role)
   VALUES (?,?,?,?,?, 'admin')`,
  [uid, email, hash, 'Admin', referral]
);

console.log('Admin created:', email);
process.exit(0);
