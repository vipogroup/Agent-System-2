import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

export async function hashPassword(pw) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(pw, salt);
}

export async function verifyPassword(pw, hash) {
  return bcrypt.compare(pw, hash);
}

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function authRequired(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    const data = jwt.verify(token, JWT_SECRET);
    req.user = data;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

export function adminOnly(req, res, next) {
  console.log('בדיקת הרשאות מנהל - פרטי המשתמש:', req.user);
  
  if (!req.user) {
    console.error('שגיאה: אין אובייקט משתמש בבקשה');
    return res.status(401).json({ 
      error: 'לא מורשה - משתמש לא מזוהה',
      debug: {
        hasUserObject: !!req.user,
        user: req.user,
        headers: req.headers
      }
    });
  }
  
  if (req.user.role !== 'admin') {
    console.error('שגיאת הרשאות: למשתמש אין הרשאת מנהל', {
      userId: req.user.id,
      userRole: req.user.role,
      requiredRole: 'admin',
      path: req.path
    });
    
    return res.status(403).json({ 
      error: 'גישה נדחתה - נדרשת הרשאת מנהל',
      debug: {
        userId: req.user.id,
        userRole: req.user.role,
        requiredRole: 'admin'
      }
    });
  }
  
  console.log('אימות הצליח - משתמש בעל הרשאת מנהל:', req.user.email);
  next();
}
