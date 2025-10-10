// Security Middlewares
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

// 🛡️ CORS Configuration - מגביל גישה רק לדומיינים מורשים
const corsOptions = {
  origin: function(origin, callback) {
    const allowedOrigins = [
      'https://agent-system-2.onrender.com',
      'http://localhost:3000',
      'http://localhost:8080',
      'http://127.0.0.1:3000'
    ];
    
    // אפשר בקשות ללא origin (כמו Postman, mobile apps)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log(`🚫 CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS policy'));
    }
  },
  credentials: true, // אפשר שליחת cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

// 🚦 Rate Limiting - הגבלת בקשות
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 דקות
  max: 100, // 100 בקשות לכל IP
  message: {
    error: 'יותר מדי בקשות מכתובת IP זו, נסה שוב בעוד 15 דקות'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.log(`🚦 Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'יותר מדי בקשות מכתובת IP זו, נסה שוב בעוד 15 דקות'
    });
  }
});

// 🔐 Login Rate Limiting - הגבלה מחמירה לכניסות
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 דקות
  max: 5, // 5 ניסיונות כניסה בלבד
  skipSuccessfulRequests: true, // לא סופר כניסות מוצלחות
  message: {
    error: 'יותר מדי ניסיונות כניסה שגויים, נסה שוב בעוד 15 דקות'
  },
  handler: (req, res) => {
    console.log(`🔐 Login rate limit exceeded for IP: ${req.ip}, Email: ${req.body?.email}`);
    res.status(429).json({
      error: 'יותר מדי ניסיונות כניסה שגויים, נסה שוב בעוד 15 דקות'
    });
  }
});

// 🛡️ Helmet Configuration - Security Headers
const helmetConfig = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"]
    }
  },
  hsts: {
    maxAge: 31536000, // שנה אחת
    includeSubDomains: true,
    preload: true
  }
};

// 📝 Security Logging Middleware
const securityLogger = (req, res, next) => {
  // לוג בקשות חשודות
  const suspiciousPatterns = [
    /\.\./,  // Directory traversal
    /<script/i,  // XSS attempts
    /union.*select/i,  // SQL injection
    /javascript:/i,  // JavaScript injection
    /vbscript:/i,  // VBScript injection
    /onload=/i,  // Event handler injection
    /onerror=/i  // Error handler injection
  ];

  const userAgent = req.headers['user-agent'] || '';
  const url = req.url;
  const body = JSON.stringify(req.body);

  // בדיקת דפוסים חשודים
  const isSuspicious = suspiciousPatterns.some(pattern => 
    pattern.test(url) || pattern.test(body) || pattern.test(userAgent)
  );

  if (isSuspicious) {
    console.log(`🚨 Suspicious request detected:`, {
      ip: req.ip,
      method: req.method,
      url: req.url,
      userAgent: userAgent,
      body: req.body,
      timestamp: new Date().toISOString()
    });
  }

  next();
};

// 🔒 Additional Security Headers
const additionalSecurityHeaders = (req, res, next) => {
  // מונע MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // מונע הטמעה ב-frames (clickjacking protection)
  res.setHeader('X-Frame-Options', 'DENY');
  
  // מונע XSS attacks
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // מסתיר מידע על השרת
  res.removeHeader('X-Powered-By');
  
  // מונע caching של דפים רגישים
  if (req.url.includes('/api/') || req.url.includes('/admin/')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  
  next();
};

module.exports = {
  corsOptions,
  generalLimiter,
  loginLimiter,
  helmetConfig,
  securityLogger,
  additionalSecurityHeaders
};
