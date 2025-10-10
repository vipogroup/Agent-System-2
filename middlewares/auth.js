// Authentication Middleware
const jwt = require('jsonwebtoken');

// 🔑 JWT Secret (בפרודקשן צריך להיות ב-environment variables)
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';

// 🍪 יצירת טוקן JWT
const createToken = (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role || 'agent',
    iat: Math.floor(Date.now() / 1000)
  };
  
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '24h',
    issuer: 'agent-system',
    audience: 'agent-dashboard'
  });
};

// 🍪 הגדרת Cookie מאובטח
const setTokenCookie = (res, token) => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  res.cookie('authToken', token, {
    httpOnly: true,           // לא נגיש ל-JavaScript בדפדפן
    secure: isProduction,     // נשלח רק ב-HTTPS בפרודקשן
    sameSite: 'strict',       // מונע CSRF attacks
    maxAge: 24 * 60 * 60 * 1000, // 24 שעות
    path: '/',               // זמין לכל הדפים
    domain: isProduction ? '.onrender.com' : undefined
  });
  
  console.log(`🍪 Token cookie set for user, expires in 24h`);
};

// 🗑️ מחיקת Cookie
const clearTokenCookie = (res) => {
  res.clearCookie('authToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/'
  });
  
  console.log(`🗑️ Token cookie cleared`);
};

// 🔒 Middleware לאימות טוקן
const authenticate = (req, res, next) => {
  try {
    // נסה לקבל טוקן מ-Cookie
    let token = req.cookies?.authToken;
    
    // אם אין Cookie, נסה מ-Authorization header (לתאימות לאחור)
    if (!token && req.headers.authorization) {
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }
    
    if (!token) {
      return res.status(401).json({ 
        error: 'לא מאושר - נדרש להתחבר מחדש',
        code: 'NO_TOKEN'
      });
    }

    // אימות הטוקן
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // בדיקת תוקף נוסף
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp && decoded.exp < now) {
      clearTokenCookie(res);
      return res.status(401).json({ 
        error: 'הטוקן פג תוקף - נדרש להתחבר מחדש',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    // שמירת פרטי המשתמש ב-request
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role
    };
    
    console.log(`✅ User authenticated: ${decoded.email} (ID: ${decoded.id})`);
    next();
    
  } catch (error) {
    console.log(`❌ Authentication failed: ${error.message}`);
    
    // מחק cookie פגום
    clearTokenCookie(res);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'הטוקן פג תוקף - נדרש להתחבר מחדש',
        code: 'TOKEN_EXPIRED'
      });
    } else if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'טוקן לא חוקי - נדרש להתחבר מחדש',
        code: 'INVALID_TOKEN'
      });
    } else {
      return res.status(401).json({ 
        error: 'שגיאת אימות - נדרש להתחבר מחדש',
        code: 'AUTH_ERROR'
      });
    }
  }
};

// 🔐 Middleware לבדיקת הרשאות
const authorize = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'לא מאושר - נדרש להתחבר',
        code: 'NOT_AUTHENTICATED'
      });
    }
    
    // אם לא צוינו תפקידים, כל משתמש מאומת יכול לגשת
    if (roles.length === 0) {
      return next();
    }
    
    // בדיקת תפקיד המשתמש
    if (!roles.includes(req.user.role)) {
      console.log(`🚫 Access denied for user ${req.user.email} with role ${req.user.role}`);
      return res.status(403).json({ 
        error: 'אין הרשאה לבצע פעולה זו',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }
    
    next();
  };
};

// 🔄 Middleware לרענון טוקן אוטומטי
const refreshToken = (req, res, next) => {
  if (req.user) {
    const token = req.cookies?.authToken;
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const now = Math.floor(Date.now() / 1000);
        const timeUntilExpiry = decoded.exp - now;
        
        // אם הטוקן יפוג בעוד פחות משעה, צור טוקן חדש
        if (timeUntilExpiry < 3600) { // 1 hour
          const newToken = createToken(req.user);
          setTokenCookie(res, newToken);
          console.log(`🔄 Token refreshed for user: ${req.user.email}`);
        }
      } catch (error) {
        console.log(`⚠️ Token refresh failed: ${error.message}`);
      }
    }
  }
  next();
};

module.exports = {
  createToken,
  setTokenCookie,
  clearTokenCookie,
  authenticate,
  authorize,
  refreshToken,
  JWT_SECRET
};
