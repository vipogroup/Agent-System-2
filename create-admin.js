// Simple script to create admin user directly
import { getDB } from './src/db.js';
import bcrypt from 'bcryptjs';

async function createAdminUser() {
  try {
    const db = await getDB();
    
    // Delete existing admin if exists
    await db.run('DELETE FROM agents WHERE email = ?', ['admin@example.com']);
    
    // Create new admin
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const referralCode = 'ADMIN' + Date.now().toString().slice(-6);
    
    const result = await db.run(
      'INSERT INTO agents (full_name, email, password_hash, role, is_active, referral_code) VALUES (?, ?, ?, ?, ?, ?)',
      ['Admin User', 'admin@example.com', hashedPassword, 'admin', 1, referralCode]
    );
    
    console.log('✅ Admin user created successfully!');
    console.log('📧 Email: admin@example.com');
    console.log('🔑 Password: admin123');
    console.log('🆔 ID:', result.lastID);
    
    // Verify the user was created
    const admin = await db.get('SELECT * FROM agents WHERE email = ?', ['admin@example.com']);
    console.log('👤 Created user:', admin);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createAdminUser();
