import { getDB } from './db.js';
import { hashPassword, verifyPassword, signToken, authRequired, adminOnly } from './auth.js';
import { v4 as uuidv4 } from 'uuid';

export async function registerRoutes(app) {
  // Health check endpoint
  app.get('/health', (req, res) => res.json({ ok: true }));

  // Agent registration
  app.post('/api/agents/register', async (req, res) => {
    try {
      const { email, password, full_name } = req.body;
      
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
      
      // Insert new agent
      const result = await db.run(
        'INSERT INTO agents (email, password_hash, full_name, referral_code) VALUES (?, ?, ?, ?)',
        [email, passwordHash, full_name || null, referralCode]
      );

      // Generate JWT token
      const token = signToken({ id: result.lastID, email, role: 'agent' });
      
      res.json({ 
        token,
        agent: {
          id: result.lastID,
          email,
          full_name: full_name || null,
          referral_code: referralCode
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
}