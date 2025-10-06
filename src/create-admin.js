import { getDB } from './db.js';
import { hashPassword } from './auth.js';
import readline from 'readline';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function createAdmin() {
  try {
    console.log('\n=== יצירת משתמש מנהל חדש ===\n');
    
    const email = await prompt('הזן אימייל: ');
    const password = await prompt('הזן סיסמה (לפחות 8 תווים): ');
    const fullName = await prompt('הזן שם מלא: ');
    
    if (!email || !password || !fullName) {
      console.error('\n❌ שגיאה: כל השדות נדרשים');
      rl.close();
      return;
    }
    
    if (password.length < 8) {
      console.error('\n❌ שגיאה: הסיסמה חייבת להכיל לפחות 8 תווים');
      rl.close();
      return;
    }
    
    const db = await getDB();
    
    // בדיקה אם המשתמש כבר קיים
    const existingUser = await db.get('SELECT id FROM agents WHERE email = ?', [email]);
    if (existingUser) {
      console.error('\n❌ שגיאה: משתמש עם האימייל הזה כבר קיים');
      rl.close();
      return;
    }
    
    // הצפנת הסיסמה
    const passwordHash = await hashPassword(password);
    const referralCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    
    // יצירת המשתמש כמנהל
    await db.run(
      `INSERT INTO agents (email, password_hash, full_name, referral_code, role, is_active) 
       VALUES (?, ?, ?, ?, 'admin', 1)`,
      [email, passwordHash, fullName, referralCode]
    );
    
    console.log('\n✅ משתמש המנהל נוצר בהצלחה!');
    console.log('\nפרטי ההתחברות:');
    console.log('-----------------');
    console.log(`אימייל: ${email}`);
    console.log(`סיסמה: ${'*'.repeat(password.length)}`);
    console.log(`קוד הפניה: ${referralCode}`);
    console.log('\nאתה יכול כעת להתחבר לדשבורד המנהל בכתובת:');
    console.log('http://localhost:3000/public/dashboard-admin.html');
    
  } catch (error) {
    console.error('\n❌ שגיאה ביצירת המשתמש:', error.message);
  } finally {
    rl.close();
  }
}

// הפעלת הפונקציה
createAdmin().catch(console.error);
