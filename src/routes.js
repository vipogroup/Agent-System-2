import { getDB } from './db.js';
import { hashPassword, verifyPassword, signToken, authRequired, adminOnly } from './auth.js';
import { v4 as uuidv4 } from 'uuid';

// Send welcome notification (simulate email/SMS)
async function sendWelcomeNotification(email, phone, password, referralCode, fullName) {
  try {
    console.log('🎉 SENDING WELCOME NOTIFICATION:');
    console.log('================================');
    console.log(`📧 TO: ${email}`);
    console.log(`📱 PHONE: ${phone}`);
    console.log(`👤 NAME: ${fullName}`);
    console.log(`🔑 PASSWORD: ${password}`);
    console.log(`🔗 REFERRAL CODE: ${referralCode}`);
    console.log('================================');
    
    // In a real application, you would use:
    // - SendGrid, Mailgun, or similar for email
    // - Twilio, AWS SNS, or similar for SMS
    
    // Email content (simulation)
    const emailContent = `
🎉 ברוך הבא למערכת הסוכנים! 🎉

שלום ${fullName},

ההרשמה שלך הושלמה בהצלחה!

פרטי הכניסה שלך:
📧 אימייל: ${email}
🔑 סיסמה: ${password}
🔗 קוד הפניה: ${referralCode}

קישור לכניסה למערכת:
https://agent-system-2.onrender.com/public/dashboard-agent.html

💡 טיפים חשובים:
• שמור את הסיסמה במקום בטוח
• השתמש בקוד ההפניה שלך לקבלת עמלות
• בדוק את הדשבורד שלך באופן קבוע

בהצלחה!
צוות מערכת הסוכנים
    `;
    
    // SMS content (simulation)
    const smsContent = `
🎉 ברוך הבא למערכת הסוכנים!
שם: ${fullName}
קוד הפניה: ${referralCode}
כניסה: https://agent-system-2.onrender.com
    `;
    
    console.log('📧 EMAIL CONTENT:');
    console.log(emailContent);
    console.log('📱 SMS CONTENT:');
    console.log(smsContent);
    
    // Log to database (optional)
    const db = await getDB();
    await db.run(`
      INSERT INTO notifications (email, phone, type, content, sent_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `, [email, phone, 'welcome', JSON.stringify({ emailContent, smsContent })]);
    
    return true;
  } catch (error) {
    console.error('Error sending welcome notification:', error);
    return false;
  }
}

export async function registerRoutes(app) {
  // Health check endpoint
  app.get('/health', (req, res) => res.json({ ok: true }));

  // Debug endpoint to check database
  app.get('/api/debug/agents', async (req, res) => {
    try {
      const db = await getDB();
      const agents = await db.all('SELECT * FROM agents ORDER BY created_at DESC');
      const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table'");
      
      res.json({
        success: true,
        tables: tables,
        agents: agents,
        count: agents.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Debug error:', error);
      res.status(500).json({ 
        error: 'Debug failed', 
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Get all agents (for admin dashboard - no auth required for demo)
  app.get('/api/agents/all', async (req, res) => {
    try {
      const db = await getDB();
      const agents = await db.all('SELECT id, email, full_name, referral_code, role, is_active, created_at FROM agents ORDER BY created_at DESC');
      
      res.json({
        success: true,
        items: agents,
        count: agents.length
      });
    } catch (error) {
      console.error('Error fetching agents:', error);
      res.status(500).json({ error: 'Failed to fetch agents' });
    }
  });

  // Get agent referral link
  app.get('/api/agent/referral-link/:agentId', async (req, res) => {
    try {
      const { agentId } = req.params;
      const db = await getDB();
      
      const agent = await db.get('SELECT referral_code FROM agents WHERE id = ?', [agentId]);
      
      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }

      const referralLink = `https://vipogroup.github.io/4Massage-for-sale-VC/?ref=${agent.referral_code}`;
      
      res.json({
        success: true,
        referral_code: agent.referral_code,
        referral_link: referralLink,
        target_site: 'https://vipogroup.github.io/4Massage-for-sale-VC/'
      });
    } catch (error) {
      console.error('Error getting referral link:', error);
      res.status(500).json({ error: 'Failed to get referral link' });
    }
  });

  // Track referral visit
  app.post('/api/track-visit', async (req, res) => {
    try {
      const { referral_code, visitor_ip, user_agent } = req.body;
      
      if (!referral_code) {
        return res.status(400).json({ error: 'Referral code is required' });
      }

      const db = await getDB();
      
      // Find agent by referral code
      const agent = await db.get('SELECT id FROM agents WHERE referral_code = ?', [referral_code]);
      
      if (!agent) {
        return res.status(404).json({ error: 'Invalid referral code' });
      }

      // Record the visit
      await db.run(
        'INSERT INTO referral_visits (agent_id, referral_code, visitor_ip, user_agent, visited_at) VALUES (?, ?, ?, ?, datetime("now"))',
        [agent.id, referral_code, visitor_ip || null, user_agent || null]
      );

      res.json({ success: true, message: 'Visit tracked' });
    } catch (error) {
      console.error('Error tracking visit:', error);
      res.status(500).json({ error: 'Failed to track visit' });
    }
  });

  // Record a sale/commission
  app.post('/api/record-sale', async (req, res) => {
    try {
      const { referral_code, sale_amount, customer_email, product_name } = req.body;
      
      if (!referral_code || !sale_amount) {
        return res.status(400).json({ error: 'Referral code and sale amount are required' });
      }

      const db = await getDB();
      
      // Find agent by referral code
      const agent = await db.get('SELECT id FROM agents WHERE referral_code = ?', [referral_code]);
      
      if (!agent) {
        return res.status(404).json({ error: 'Invalid referral code' });
      }

      // Calculate commission (10% default)
      const commissionRate = 0.10;
      const commissionAmount = sale_amount * commissionRate;

      // Record the sale
      const saleResult = await db.run(
        'INSERT INTO sales (agent_id, referral_code, sale_amount, commission_amount, customer_email, product_name, sale_date) VALUES (?, ?, ?, ?, ?, ?, datetime("now"))',
        [agent.id, referral_code, sale_amount, commissionAmount, customer_email || null, product_name || null]
      );

      res.json({ 
        success: true, 
        message: 'Sale recorded',
        sale_id: saleResult.lastID,
        commission_amount: commissionAmount
      });
    } catch (error) {
      console.error('Error recording sale:', error);
      res.status(500).json({ error: 'Failed to record sale' });
    }
  });

  // Block/Unblock agent
  app.post('/api/admin/agent/:agentId/toggle-status', async (req, res) => {
    try {
      const { agentId } = req.params;
      const db = await getDB();
      
      // Get current status
      const agent = await db.get('SELECT is_active FROM agents WHERE id = ?', [agentId]);
      
      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }

      // Toggle status
      const newStatus = agent.is_active ? 0 : 1;
      
      await db.run('UPDATE agents SET is_active = ? WHERE id = ?', [newStatus, agentId]);

      res.json({ 
        success: true, 
        message: newStatus ? 'Agent activated' : 'Agent blocked',
        new_status: newStatus
      });
    } catch (error) {
      console.error('Error toggling agent status:', error);
      res.status(500).json({ error: 'Failed to toggle agent status' });
    }
  });

  // Delete agent
  app.delete('/api/admin/agent/:agentId', async (req, res) => {
    try {
      const { agentId } = req.params;
      const db = await getDB();
      
      // Check if agent exists
      const agent = await db.get('SELECT id, email FROM agents WHERE id = ?', [agentId]);
      
      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }

      // Don't allow deleting admin users
      const adminAgent = await db.get('SELECT role FROM agents WHERE id = ?', [agentId]);
      if (adminAgent && adminAgent.role === 'admin') {
        return res.status(400).json({ error: 'Cannot delete admin user' });
      }

      // Delete related data first (due to foreign key constraints)
      await db.run('DELETE FROM referral_visits WHERE agent_id = ?', [agentId]);
      await db.run('DELETE FROM sales WHERE agent_id = ?', [agentId]);
      await db.run('DELETE FROM commissions WHERE agent_id = ?', [agentId]);
      await db.run('DELETE FROM payouts WHERE agent_id = ?', [agentId]);
      
      // Delete the agent
      await db.run('DELETE FROM agents WHERE id = ?', [agentId]);

      res.json({ 
        success: true, 
        message: 'Agent deleted successfully',
        deleted_agent: agent.email
      });
    } catch (error) {
      console.error('Error deleting agent:', error);
      res.status(500).json({ error: 'Failed to delete agent' });
    }
  });

  // Check if email is available
  app.post('/api/check-email', async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      const db = await getDB();
      const existing = await db.get('SELECT id FROM agents WHERE email = ?', [email]);
      
      res.json({
        available: !existing,
        email: email
      });
    } catch (error) {
      console.error('Error checking email:', error);
      res.status(500).json({ error: 'Failed to check email' });
    }
  });

  // Agent registration
  app.post('/api/agents/register', async (req, res) => {
    try {
      const { email, password, full_name, phone, payment_details } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const db = await getDB();
      
      // Check if email already exists
      const existing = await db.get('SELECT id FROM agents WHERE email = ?', [email]);
      if (existing) {
        return res.status(400).json({ error: 'Email already registered' });
      }

      // Hash password
      const passwordHash = await hashPassword(password);
      const referralCode = uuidv4().substring(0, 8).toUpperCase();
      
      // Set role to admin if this is the admin email
      const role = email === 'admin@example.com' ? 'admin' : 'agent';
      
      // Process payment details
      const paymentMethod = payment_details?.method || 'bank';
      const paymentDetailsJson = payment_details ? JSON.stringify(payment_details) : null;

      // Insert new agent
      const result = await db.run(
        'INSERT INTO agents (email, password_hash, full_name, phone, referral_code, role, payment_method, payment_details) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [email, passwordHash, full_name || null, phone || null, referralCode, role, paymentMethod, paymentDetailsJson]
      );

      // Send welcome notification (email/SMS simulation)
      await sendWelcomeNotification(email, phone, password, referralCode, full_name);

      // Generate JWT token
      const token = signToken({ id: result.lastID, email, role });
      
      res.json({ 
        token,
        agent: {
          id: result.lastID,
          email,
          full_name: full_name || null,
          referral_code: referralCode,
          role: role
        }
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Agent login
  app.post('/api/agents/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const db = await getDB();
      const agent = await db.get('SELECT * FROM agents WHERE email = ?', [email]);
      
      if (!agent) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const isValid = await verifyPassword(password, agent.password_hash);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Generate JWT token
      const token = signToken({ 
        id: agent.id, 
        email: agent.email, 
        role: agent.role || 'agent' 
      });
      
      res.json({ 
        token,
        agent: {
          id: agent.id,
          email: agent.email,
          full_name: agent.full_name,
          referral_code: agent.referral_code,
          role: agent.role || 'agent'
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Track referral
  app.get('/api/track', async (req, res) => {
    try {
      const { ref } = req.query;
      
      if (!ref) {
        return res.status(400).json({ error: 'Referral code is required' });
      }

      const db = await getDB();
      const agent = await db.get('SELECT id FROM agents WHERE referral_code = ?', [ref]);
      
      if (!agent) {
        return res.status(404).json({ error: 'Invalid referral code' });
      }

      // Set cookie with referral code
      const cookieOptions = {
        maxAge: parseInt(process.env.COOKIE_TTL_DAYS || '30') * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      };
      
      res.cookie('affiliate_ref', ref, cookieOptions);
      res.json({ success: true, agent_id: agent.id });
    } catch (error) {
      console.error('Track error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Create order (for demo purposes)
  app.post('/api/orders', async (req, res) => {
    try {
      const { total_amount, customer_email } = req.body;
      
      if (!total_amount) {
        return res.status(400).json({ error: 'Total amount is required' });
      }

      const amountCents = Math.round(parseFloat(total_amount) * 100);
      
      if (isNaN(amountCents) || amountCents <= 0) {
        return res.status(400).json({ error: 'Invalid amount' });
      }

      const db = await getDB();
      
      // Get agent from cookie if exists
      let agentId = null;
      const ref = req.cookies?.affiliate_ref;
      
      if (ref) {
        const agent = await db.get('SELECT id FROM agents WHERE referral_code = ?', [ref]);
        if (agent) {
          agentId = agent.id;
        }
      }

      // Create order
      const orderUid = `ord_${uuidv4().replace(/-/g, '')}`;
      const orderResult = await db.run(
        'INSERT INTO orders (order_uid, customer_email, total_amount_cents, agent_id, status) VALUES (?, ?, ?, ?, ?)',
        [orderUid, customer_email || null, amountCents, agentId, 'PAID']
      );

      // If order has an agent, create commission
      if (agentId) {
        // Get agent's commission rate (override or default)
        const settings = await db.get('SELECT value FROM settings WHERE key = ?', ['commission_rate']);
        const defaultRate = parseFloat(settings?.value || '0.10');
        
        const agent = await db.get('SELECT commission_rate_override FROM agents WHERE id = ?', [agentId]);
        const commissionRate = agent?.commission_rate_override !== null 
          ? agent.commission_rate_override 
          : defaultRate;
        
        const commissionAmount = Math.round(amountCents * commissionRate);
        
        await db.run(
          `INSERT INTO commissions 
           (order_id, agent_id, rate, base_amount_cents, commission_amount_cents, status) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [orderResult.lastID, agentId, commissionRate, amountCents, commissionAmount, 'PENDING_CLEARANCE']
        );
      }

      res.json({ 
        success: true, 
        order_id: orderResult.lastID,
        order_uid: orderUid,
        agent_id: agentId || null
      });
    } catch (error) {
      console.error('Create order error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get agent dashboard data
  app.get('/api/agent/dashboard', authRequired, async (req, res) => {
    try {
      const db = await getDB();
      const agentId = req.user.id;
      
      // Get agent's total commissions
      const commissionStats = await db.get(`
        SELECT 
          COUNT(*) as total_commissions,
          COALESCE(SUM(CASE WHEN status = 'CLEARED' THEN commission_amount_cents ELSE 0 END), 0) as total_earned_cents,
          COALESCE(SUM(CASE WHEN status = 'PENDING_CLEARANCE' THEN commission_amount_cents ELSE 0 END), 0) as pending_commissions_cents,
          COALESCE(SUM(CASE WHEN status = 'CLEARED' THEN commission_amount_cents ELSE 0 END) / 100.0, 0) as total_earned,
          COALESCE(SUM(CASE WHEN status = 'PENDING_CLEARANCE' THEN commission_amount_cents ELSE 0 END) / 100.0, 0) as pending_commissions
        FROM commissions 
        WHERE agent_id = ?
      `, [agentId]);
      
      // Get recent commissions
      const recentCommissions = await db.all(`
        SELECT c.*, o.order_uid, o.total_amount_cents as order_amount_cents
        FROM commissions c
        JOIN orders o ON c.order_id = o.id
        WHERE c.agent_id = ?
        ORDER BY c.created_at DESC
        LIMIT 5
      `, [agentId]);
      
      // Get pending payouts
      const pendingPayouts = await db.all(`
        SELECT * FROM payouts 
        WHERE agent_id = ? AND status IN ('REQUESTED', 'APPROVED')
        ORDER BY requested_at DESC
      `, [agentId]);
      
      res.json({
        stats: {
          total_commissions: commissionStats.total_commissions || 0,
          total_earned_cents: commissionStats.total_earned_cents || 0,
          pending_commissions_cents: commissionStats.pending_commissions_cents || 0,
          total_earned: commissionStats.total_earned || 0,
          pending_commissions: commissionStats.pending_commissions || 0
        },
        recent_commissions: recentCommissions || [],
        pending_payouts: pendingPayouts || []
      });
    } catch (error) {
      console.error('Dashboard error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Request payout
  app.post('/api/payouts/request', authRequired, async (req, res) => {
    try {
      const agentId = req.user.id;
      const { bank_account_iban, bank_account_name } = req.body;
      
      if (!bank_account_iban || !bank_account_name) {
        return res.status(400).json({ error: 'Bank account details are required' });
      }
      
      const db = await getDB();
      
      // Get total cleared commissions that haven't been paid out yet
      const result = await db.get(`
        SELECT COALESCE(SUM(commission_amount_cents), 0) as available_cents
        FROM commissions 
        WHERE agent_id = ? 
        AND status = 'CLEARED' 
        AND id NOT IN (
          SELECT commission_id FROM commission_payouts 
          WHERE commission_id IS NOT NULL
        )
      `, [agentId]);
      
      const availableAmount = result.available_cents || 0;
      
      if (availableAmount <= 0) {
        return res.status(400).json({ error: 'No funds available for payout' });
      }
      
      // Create payout request
      const payoutResult = await db.run(
        `INSERT INTO payouts 
         (agent_id, amount_cents, status, bank_account_iban, bank_account_name, requested_at)
         VALUES (?, ?, 'REQUESTED', ?, ?, datetime('now'))`,
        [agentId, availableAmount, bank_account_iban, bank_account_name]
      );
      
      res.json({ 
        success: true, 
        payout_id: payoutResult.lastID,
        amount_cents: availableAmount,
        amount: (availableAmount / 100).toFixed(2)
      });
    } catch (error) {
      console.error('Payout request error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get agent profile
  app.get('/api/agent/profile', authRequired, async (req, res) => {
    try {
      const db = await getDB();
      const agent = await db.get(
        'SELECT id, email, full_name, referral_code, created_at FROM agents WHERE id = ?',
        [req.user.id]
      );
      
      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }
      
      res.json(agent);
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Update agent profile
  app.put('/api/agent/profile', authRequired, async (req, res) => {
    try {
      const { full_name, current_password, new_password } = req.body;
      const db = await getDB();
      
      // Get current agent data
      const agent = await db.get('SELECT * FROM agents WHERE id = ?', [req.user.id]);
      
      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }
      
      // Update full name if provided
      if (full_name !== undefined) {
        await db.run('UPDATE agents SET full_name = ? WHERE id = ?', [full_name, req.user.id]);
      }
      
      // Update password if current and new passwords are provided
      if (current_password && new_password) {
        const isValid = await verifyPassword(current_password, agent.password_hash);
        if (!isValid) {
          return res.status(400).json({ error: 'Current password is incorrect' });
        }
        
        const newPasswordHash = await hashPassword(new_password);
        await db.run('UPDATE agents SET password_hash = ? WHERE id = ?', [newPasswordHash, req.user.id]);
      }
      
      // Get updated agent data
      const updatedAgent = await db.get(
        'SELECT id, email, full_name, referral_code, created_at FROM agents WHERE id = ?',
        [req.user.id]
      );
      
      res.json({
        success: true,
        agent: updatedAgent,
        message: 'Profile updated successfully'
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Admin: Get all agents
  app.get('/admin/agents', authRequired, adminOnly, async (req, res) => {
    try {
      const db = await getDB();
      const agents = await db.all(`
        SELECT id, email, full_name, referral_code, commission_rate_override, is_active, created_at, role
        FROM agents 
        ORDER BY created_at DESC
      `);
      
      res.json({ items: agents });
    } catch (error) {
      console.error('Get agents error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Admin: Get pending payouts
  app.get('/api/payouts/pending', authRequired, adminOnly, async (req, res) => {
    try {
      const db = await getDB();
      const payouts = await db.all(`
        SELECT p.*, a.email as agent_email, a.full_name as agent_name
        FROM payouts p
        JOIN agents a ON p.agent_id = a.id
        WHERE p.status IN ('REQUESTED', 'APPROVED')
        ORDER BY p.requested_at DESC
      `);
      
      res.json({ items: payouts });
    } catch (error) {
      console.error('Get pending payouts error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Admin: Approve payout
  app.post('/api/payouts/:id/approve', authRequired, adminOnly, async (req, res) => {
    try {
      const db = await getDB();
      await db.run(
        'UPDATE payouts SET status = ?, approved_at = datetime("now") WHERE id = ?',
        ['APPROVED', req.params.id]
      );
      
      res.json({ success: true });
    } catch (error) {
      console.error('Approve payout error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Admin: Mark payout as paid
  app.post('/api/payouts/:id/mark-paid', authRequired, adminOnly, async (req, res) => {
    try {
      const db = await getDB();
      await db.run(
        'UPDATE payouts SET status = ?, paid_at = datetime("now") WHERE id = ?',
        ['PAID', req.params.id]
      );
      
      res.json({ success: true });
    } catch (error) {
      console.error('Mark paid error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
}