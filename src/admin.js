import { getDB } from './db.js';
import { authRequired, adminOnly } from './auth.js';

export function registerAdminRoutes(app){
  // Admin dashboard data
  app.get('/api/admin/dashboard', authRequired, adminOnly, async (req, res) => {
    try {
      const db = await getDB();
      
      // Get statistics
      const activeAgents = await db.get(`SELECT COUNT(*) as count FROM agents WHERE is_active = 1`);
      const pendingAgents = await db.get(`SELECT COUNT(*) as count FROM agents WHERE is_active = 0`);
      const totalCommissions = await db.get(`SELECT SUM(amount) as total FROM commissions`);
      const payoutRequests = await db.get(`SELECT COUNT(*) as count FROM payouts WHERE status = 'REQUESTED'`);
      
      // Get agents data
      const agents = await db.all(`
        SELECT 
          id, 
          email, 
          full_name as name, 
          is_active,
          (SELECT SUM(amount) FROM commissions WHERE agent_id = agents.id) as totalCommissions
        FROM agents 
        ORDER BY created_at DESC
      `);
      
      // Get payouts data
      const payouts = await db.all(`
        SELECT 
          p.id,
          p.amount,
          p.requested_at as requestDate,
          p.status,
          a.full_name as agentName
        FROM payouts p
        JOIN agents a ON p.agent_id = a.id
        WHERE p.status = 'REQUESTED'
        ORDER BY p.requested_at DESC
      `);
      
      // Format agent status
      const formattedAgents = agents.map(agent => ({
        ...agent,
        status: agent.is_active ? 'active' : 'pending',
        totalCommissions: agent.totalCommissions || 0
      }));
      
      res.json({
        stats: {
          activeAgents: activeAgents.count || 0,
          pendingAgents: pendingAgents.count || 0,
          totalCommissions: totalCommissions.total || 0,
          payoutRequests: payoutRequests.count || 0
        },
        agents: formattedAgents,
        payouts: payouts
      });
    } catch (error) {
      console.error('Admin dashboard error:', error);
      res.status(500).json({ error: 'Failed to load dashboard data' });
    }
  });

  // Approve agent
  app.post('/api/admin/agents/:id/approve', authRequired, adminOnly, async (req, res) => {
    try {
      const agentId = parseInt(req.params.id);
      const db = await getDB();
      await db.run(`UPDATE agents SET is_active = 1 WHERE id = ?`, [agentId]);
      res.json({ success: true });
    } catch (error) {
      console.error('Approve agent error:', error);
      res.status(500).json({ error: 'Failed to approve agent' });
    }
  });

  // Block agent
  app.post('/api/admin/agents/:id/block', authRequired, adminOnly, async (req, res) => {
    try {
      const agentId = parseInt(req.params.id);
      const db = await getDB();
      await db.run(`UPDATE agents SET is_active = 0 WHERE id = ?`, [agentId]);
      res.json({ success: true });
    } catch (error) {
      console.error('Block agent error:', error);
      res.status(500).json({ error: 'Failed to block agent' });
    }
  });

  // Approve payout
  app.post('/api/admin/payouts/:id/approve', authRequired, adminOnly, async (req, res) => {
    try {
      const payoutId = parseInt(req.params.id);
      const db = await getDB();
      await db.run(`UPDATE payouts SET status = 'APPROVED' WHERE id = ?`, [payoutId]);
      res.json({ success: true });
    } catch (error) {
      console.error('Approve payout error:', error);
      res.status(500).json({ error: 'Failed to approve payout' });
    }
  });

  app.get('/admin/payouts/pending', authRequired, adminOnly, async (req, res) => {
    const db = await getDB();
    const rows = await db.all(`SELECT * FROM payouts WHERE status IN ('REQUESTED','APPROVED') ORDER BY requested_at ASC`);
    res.json({ items: rows });
  });
}


export function registerSettingsRoutes(app){
  app.get('/admin/settings/commission-rate', authRequired, adminOnly, async (req, res) => {
    const db = await getDB();
    const row = await db.get(`SELECT value FROM settings WHERE key='commission_rate'`);
    res.json({ commission_rate: row ? parseFloat(row.value) : null });
  });

  app.post('/admin/settings/commission-rate', authRequired, adminOnly, async (req, res) => {
    const { rate } = req.body || {};
    const r = parseFloat(rate);
    if (Number.isNaN(r) || r < 0 || r > 1) return res.status(400).json({ error: 'rate must be between 0 and 1 (e.g., 0.10)' });
    const db = await getDB();
    await db.run(`INSERT INTO settings (key, value) VALUES ('commission_rate', ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value`, [String(r)]);
    res.json({ ok: true, commission_rate: r });
  });
}


export function registerAgentAdminRoutes(app){
  app.get('/admin/agents', authRequired, adminOnly, async (req, res) => {
    const db = await getDB();
    const rows = await db.all(`SELECT id, email, full_name, referral_code, commission_rate_override, is_active, created_at FROM agents ORDER BY id DESC`);
    res.json({ items: rows });
  });

  app.post('/admin/agents/:id/commission-override', authRequired, adminOnly, async (req, res) => {
    const id = parseInt(req.params.id,10);
    const { rate } = req.body || {};
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'invalid id' });
    if (rate !== null && rate !== undefined) {
      const r = parseFloat(rate);
      if (Number.isNaN(r) || r < 0 || r > 1) return res.status(400).json({ error: 'rate must be between 0 and 1' });
      const db = await getDB();
      await db.run(`UPDATE agents SET commission_rate_override=? WHERE id=?`, [r, id]);
      return res.json({ ok: true, id, commission_rate_override: r });
    } else {
      const db = await getDB();
      await db.run(`UPDATE agents SET commission_rate_override=NULL WHERE id=?`, [id]);
      return res.json({ ok: true, id, commission_rate_override: null });
    }
  });
}
