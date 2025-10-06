import { getDB } from './db.js';
import { authRequired, adminOnly } from './auth.js';

export function registerAdminRoutes(app){
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
