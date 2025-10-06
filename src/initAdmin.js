import { getDB } from './db.js';
import bcrypt from 'bcryptjs';

async function createAdmin() {
  try {
    const db = await getDB();
    
    // Check if admin already exists
    const existingAdmin = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM agents WHERE email = ?', ['admin@example.com'], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (existingAdmin) {
      console.log('Admin user already exists');
      return;
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    // Generate unique referral code for admin
    const referralCode = 'ADMIN' + Date.now().toString().slice(-6);
    
    await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO agents (full_name, email, password_hash, role, is_active, referral_code) VALUES (?, ?, ?, ?, ?, ?)',
        ['Admin User', 'admin@example.com', hashedPassword, 'admin', 1, referralCode],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });

    console.log('✅ Admin user created successfully');
    console.log('📧 Email: admin@example.com');
    console.log('🔑 Password: admin123');
    
  } catch (error) {
    console.error('❌ Error creating admin:', error);
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createAdmin().then(() => process.exit(0));
}

export { createAdmin };
