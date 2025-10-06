import dotenv from 'dotenv';
import { getDB } from '../db.js';
dotenv.config();

(async ()=>{
  const days = parseInt(process.env.CLEAR_WINDOW_DAYS || '14', 10);
  const db = await getDB();
  await db.run(`
    UPDATE commissions
    SET status='CLEARED', cleared_at=datetime('now')
    WHERE status='PENDING_CLEARANCE'
    AND created_at <= datetime('now', ?)
  `, [`-${days} days`]);
  console.log('Cleared commissions older than', days, 'days');
  process.exit(0);
})();
