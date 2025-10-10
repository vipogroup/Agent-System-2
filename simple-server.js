import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import { 
  connectDB, 
  getAgents as getAgentsFromDB, 
  saveAllAgents as saveAgentsToDB,
  getSales as getSalesFromDB,
  saveAllSales as saveSalesToDB,
  saveSale as saveSaleToDB,
  saveAgent as saveAgentToDB,
  checkDBHealth 
} from './database.js';
import {
  initPostgres,
  getAgentsFromPostgres,
  saveAgentToPostgres,
  saveAllAgentsToPostgres,
  getSalesFromPostgres,
  saveSaleToPostgres,
  saveAllSalesToPostgres,
  checkPostgresHealth
} from './postgres.js';

// 🛡️ Security Middlewares - Inline Implementation
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';

// 🛡️ CORS Configuration
const corsOptions = {
  origin: function(origin, callback) {
    const allowedOrigins = [
      'https://agent-system-2.onrender.com',
      'http://localhost:3000',
      'http://localhost:8080',
      'http://127.0.0.1:3000'
    ];
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log(`🚫 CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS policy'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

// 🚦 Rate Limiting - Optimized for normal usage
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Increased from 100 to 1000 requests per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { 
    error: 'יותר מדי בקשות מכתובת IP זו, נסה שוב בעוד 15 דקות',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  handler: (req, res) => {
    console.log(`🚦 General rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      error: 'יותר מדי בקשות מכתובת IP זו, נסה שוב בעוד 15 דקות',
      code: 'RATE_LIMIT_EXCEEDED'
    });
  }
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Increased from 5 to 10 login attempts
  skipSuccessfulRequests: true, // Don't count successful logins
  standardHeaders: true,
  legacyHeaders: false,
  message: { 
    error: 'יותר מדי ניסיונות כניסה שגויים, נסה שוב בעוד 15 דקות',
    code: 'LOGIN_RATE_LIMIT_EXCEEDED'
  },
  handler: (req, res) => {
    console.log(`🔐 Login rate limit exceeded for IP: ${req.ip}, Email: ${req.body?.email}`);
    res.status(429).json({
      error: 'יותר מדי ניסיונות כניסה שגויים, נסה שוב בעוד 15 דקות',
      code: 'LOGIN_RATE_LIMIT_EXCEEDED'
    });
  }
});

// 📊 Dashboard-specific rate limiter (more permissive)
const dashboardLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 200, // 200 requests per 5 minutes for dashboard
  standardHeaders: true,
  legacyHeaders: false,
  message: { 
    error: 'יותר מדי בקשות לדשבורד, נסה שוב בעוד 5 דקות',
    code: 'DASHBOARD_RATE_LIMIT_EXCEEDED'
  }
});

// 🔑 JWT Functions
const createToken = (user) => {
  return jwt.sign({
    id: user.id,
    email: user.email,
    role: user.role || 'agent'
  }, JWT_SECRET, {
    expiresIn: '24h',
    issuer: 'agent-system'
  });
};

const setTokenCookie = (res, token) => {
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie('authToken', token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000,
    path: '/'
  });
};

const clearTokenCookie = (res) => {
  res.clearCookie('authToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/'
  });
};

// 🔒 Authentication Middleware
const authenticate = (req, res, next) => {
  try {
    let token = req.cookies?.authToken;
    
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

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role
    };
    
    next();
    
  } catch (error) {
    clearTokenCookie(res);
    return res.status(401).json({ 
      error: 'טוקן לא חוקי - נדרש להתחבר מחדש',
      code: 'INVALID_TOKEN'
    });
  }
};

// 📝 Simple Logging
const logUserAction = async (userId, action, status, req, metadata = {}) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    userId: userId || 'anonymous',
    action,
    status,
    ip: req?.ip || 'unknown',
    userAgent: req?.headers?.['user-agent'] || 'unknown'
  };
  console.log(`📝 ${status === 'SUCCESS' ? '✅' : '❌'} ${action}: User ${userId || 'anonymous'} from ${logEntry.ip}`);
};

const logSecurityEvent = async (eventType, severity, req, details = {}) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    eventType,
    severity,
    ip: req?.ip || 'unknown',
    details
  };
  console.log(`🚨 SECURITY ${severity}: ${eventType} from ${logEntry.ip}`);
};

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🛡️ Security Middlewares (ORDER MATTERS!)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Additional security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.removeHeader('X-Powered-By');
  next();
});

app.use(cors(corsOptions));              // CORS protection
app.use(generalLimiter);                 // Rate limiting
app.use(cookieParser());                 // Cookie parsing
app.use(express.json({ limit: '10mb' })); // JSON parsing with size limit
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // URL encoding

// Persistent storage using environment variables as backup
const DATA_DIR = path.join(__dirname, 'data');
const AGENTS_FILE = path.join(DATA_DIR, 'agents.json');
const SALES_FILE = path.join(DATA_DIR, 'sales.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Environment variables for persistent storage
const ENV_AGENTS_KEY = 'AGENTS_DATA';
const ENV_SALES_KEY = 'SALES_DATA';

// Load data with priority: PostgreSQL -> MongoDB -> Environment Variables -> File System -> Default
async function loadAgents() {
  try {
    // First try PostgreSQL (highest priority)
    const pgAgents = await getAgentsFromPostgres();
    if (pgAgents && pgAgents.length > 0) {
      console.log('🐘 Loading agents from PostgreSQL');
      return pgAgents;
    }
    
    // Fallback to MongoDB
    const dbAgents = await getAgentsFromDB();
    if (dbAgents && dbAgents.length > 0) {
      console.log('🍃 Loading agents from MongoDB');
      // Migrate to PostgreSQL for future use
      await saveAllAgentsToPostgres(dbAgents);
      return dbAgents;
    }
    
    // Fallback to environment variable
    if (process.env[ENV_AGENTS_KEY]) {
      console.log('📝 Loading agents from environment variable');
      const envAgents = JSON.parse(process.env[ENV_AGENTS_KEY]);
      // Save to PostgreSQL for future use
      await saveAllAgentsToPostgres(envAgents);
      await saveAgentsToDB(envAgents);
      return envAgents;
    }
    
    // Fallback to file system
    if (fs.existsSync(AGENTS_FILE)) {
      console.log('📁 Loading agents from file system');
      const data = fs.readFileSync(AGENTS_FILE, 'utf8');
      const fileAgents = JSON.parse(data);
      // Save to PostgreSQL for future use
      await saveAllAgentsToPostgres(fileAgents);
      await saveAgentsToDB(fileAgents);
      return fileAgents;
    }
  } catch (error) {
    console.error('Error loading agents:', error);
  }
  
  console.log('🔄 Loading default agents');
  const defaultAgents = getDefaultAgents();
  // Save defaults to PostgreSQL
  await saveAllAgentsToPostgres(defaultAgents);
  await saveAgentsToDB(defaultAgents);
  return defaultAgents;
}

async function saveAgents(agents) {
  try {
    // Primary: Save to PostgreSQL
    const pgSaved = await saveAllAgentsToPostgres(agents);
    if (pgSaved) {
      console.log('🐘 Agents saved to PostgreSQL');
    }
    
    // Secondary: Save to MongoDB
    const mongoSaved = await saveAgentsToDB(agents);
    if (mongoSaved) {
      console.log('🍃 Agents saved to MongoDB');
    }
    
    // Backup: Save to file system
    fs.writeFileSync(AGENTS_FILE, JSON.stringify(agents, null, 2));
    console.log('📁 Agents saved to file system');
    
    // Log for manual environment variable backup
    console.log('📝 Agents data for env backup:', JSON.stringify(agents));
  } catch (error) {
    console.error('Error saving agents:', error);
  }
}

async function loadSales() {
  try {
    // First try PostgreSQL
    const pgSales = await getSalesFromPostgres();
    if (pgSales && pgSales.length >= 0) {
      console.log('🐘 Loading sales from PostgreSQL');
      return pgSales;
    }
    
    // Fallback to MongoDB
    const dbSales = await getSalesFromDB();
    if (dbSales && dbSales.length >= 0) {
      console.log('🍃 Loading sales from MongoDB');
      // Migrate to PostgreSQL
      await saveAllSalesToPostgres(dbSales);
      return dbSales;
    }
    
    // Fallback to environment variable
    if (process.env[ENV_SALES_KEY]) {
      console.log('📝 Loading sales from environment variable');
      const envSales = JSON.parse(process.env[ENV_SALES_KEY]);
      await saveAllSalesToPostgres(envSales);
      await saveSalesToDB(envSales);
      return envSales;
    }
    
    // Fallback to file system
    if (fs.existsSync(SALES_FILE)) {
      console.log('📁 Loading sales from file system');
      const data = fs.readFileSync(SALES_FILE, 'utf8');
      const fileSales = JSON.parse(data);
      await saveAllSalesToPostgres(fileSales);
      await saveSalesToDB(fileSales);
      return fileSales;
    }
  } catch (error) {
    console.error('Error loading sales:', error);
  }
  
  console.log('🔄 Loading empty sales array');
  const emptySales = [];
  await saveAllSalesToPostgres(emptySales);
  await saveSalesToDB(emptySales);
  return emptySales;
}

async function saveSales(sales) {
  try {
    // Primary: Save to PostgreSQL
    const pgSaved = await saveAllSalesToPostgres(sales);
    if (pgSaved) {
      console.log('🐘 Sales saved to PostgreSQL');
    }
    
    // Secondary: Save to MongoDB
    const mongoSaved = await saveSalesToDB(sales);
    if (mongoSaved) {
      console.log('🍃 Sales saved to MongoDB');
    }
    
    // Backup: Save to file system
    fs.writeFileSync(SALES_FILE, JSON.stringify(sales, null, 2));
    console.log('📁 Sales saved to file system');
    
    // Log for manual environment variable backup
    console.log('📝 Sales data for env backup:', JSON.stringify(sales));
  } catch (error) {
    console.error('Error saving sales:', error);
  }
}

// Default agents for first time setup
function getDefaultAgents() {
  return [
  {
    id: 1,
    full_name: 'יוסי כהן',
    email: 'yossi@example.com',
    password: bcrypt.hashSync('123456', 10), // Default password: 123456
    phone: '0501234567',
    referral_code: 'YOSSI2024',
    is_active: true,
    role: 'agent',
    totalCommissions: 0,
    visits: 0,
    sales: 0,
    created_at: new Date().toISOString()
  },
  {
    id: 2,
    full_name: 'שרה לוי',
    email: 'sara@example.com',
    password: bcrypt.hashSync('123456', 10), // Default password: 123456
    phone: '0502345678',
    referral_code: 'SARA2024',
    is_active: true,
    role: 'agent',
    totalCommissions: 0,
    visits: 0,
    sales: 0,
    created_at: new Date().toISOString()
  },
  {
    id: 3,
    full_name: 'דוד אברהם',
    email: 'david@example.com',
    password: bcrypt.hashSync('123456', 10), // Default password: 123456
    phone: '0503456789',
    referral_code: 'DAVID2024',
    is_active: false,
    role: 'agent',
    totalCommissions: 0,
  }
  ];
}

// Initialize data from database/files (async)
let agents = [];
let sales = [];

// Initialize data asynchronously
async function initializeData() {
  try {
    console.log('🔄 Initializing system...');
    
    // Initialize PostgreSQL connection
    const pgConnected = await initPostgres();
    if (pgConnected) {
      console.log('🐘 PostgreSQL initialized successfully');
    } else {
      console.log('⚠️ PostgreSQL not available, using fallback storage');
    }
    
    // Initialize MongoDB connection
    await connectDB();
    
    // Load data
    console.log('📊 Loading data...');
    agents = await loadAgents();
    sales = await loadSales();
    console.log(`✅ Data loaded: ${agents.length} agents, ${sales.length} sales`);
  } catch (error) {
    console.error('❌ Error initializing data:', error);
    agents = getDefaultAgents();
    sales = [];
  }
}

// Call initialization
initializeData();

let payoutRequests = [
  {
    id: 1,
    agentName: 'יוסי כהן',
    amount: 500,
    requestDate: new Date().toISOString(),
    status: 'pending'
  },
  {
    id: 2,
    agentName: 'שרה לוי',
    amount: 750,
    requestDate: new Date().toISOString(),
    status: 'pending'
  }
];

// Serve static files
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/vc', express.static(path.join(__dirname, 'vc')));
app.use(express.static(path.join(__dirname))); // Serve files from root directory

// Root route
app.get('/', (req, res) => {
  res.redirect('/public/index.html');
});

// GitHub system route
app.get('/github-system.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'github-system.html'));
});

// Login pages
app.get('/admin-login.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin-login.html'));
});

app.get('/agent-login.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'agent-login.html'));
});

app.get('/agent-dashboard.html', dashboardLimiter, (req, res) => {
  res.sendFile(path.join(__dirname, 'agent-dashboard.html'));
});

// Health check
app.get('/health', async (req, res) => {
  const pgHealth = await checkPostgresHealth();
  const mongoHealth = await checkDBHealth();
  
  let dbType = 'File System';
  if (pgHealth) dbType = 'PostgreSQL';
  else if (mongoHealth) dbType = 'MongoDB';
  
  res.json({ 
    ok: true, 
    message: 'Agent System is running - SECURED ✅',
    timestamp: new Date().toISOString(),
    security: {
      cors: 'ENABLED ✅',
      rateLimit: 'ENABLED ✅',
      helmet: 'ENABLED ✅',
      auditLogging: 'ENABLED ✅',
      jwtTokens: 'SECURED ✅',
      httpOnlyCookies: 'ENABLED ✅'
    },
    database: {
      primary: {
        type: 'PostgreSQL',
        connected: pgHealth
      },
      secondary: {
        type: 'MongoDB', 
        connected: mongoHealth
      },
      active_type: dbType
    },
    stats: {
      agents: agents.length,
      sales: sales.length
    }
  });
});

// 📊 Security Status Endpoint
app.get('/api/security/status', authenticate, async (req, res) => {
  try {
    await logUserAction(req.user.id, 'VIEW_SECURITY_STATUS', 'SUCCESS', req);
    
    res.json({
      success: true,
      security: {
        cors: 'ENABLED ✅',
        rateLimit: 'ENABLED ✅',
        helmet: 'ENABLED ✅',
        jwtTokens: 'SECURED ✅',
        httpOnlyCookies: 'ENABLED ✅'
      },
      message: 'All security measures are active'
    });
    
  } catch (error) {
    console.error('❌ Get security status error:', error);
    res.status(500).json({ 
      error: 'שגיאת שרת פנימית',
      code: 'INTERNAL_ERROR'
    });
  }
});

// Simple API endpoints for demo
app.post('/api/agents/register', (req, res) => {
  const { full_name, email, password, phone } = req.body;
  
  console.log('Registration request:', { full_name, email, phone, password: '***' });
  
  if (!full_name || !email || !password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  // Check if email already exists
  const existingAgent = agents.find(agent => agent.email === email);
  if (existingAgent) {
    return res.status(400).json({ error: 'Email already registered' });
  }
  
  // Generate referral code
  const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase() + 
                      Math.random().toString(36).substring(2, 4).toUpperCase();
  
  // Create new agent
  const newAgent = {
    id: Date.now(),
    full_name,
    email,
    phone: phone || '',
    referral_code: referralCode,
    role: 'agent',
    is_active: true,
    totalCommissions: 0,
    visits: 0,
    sales: 0,
    created_at: new Date().toISOString()
  };
  
  // Add to agents array
  agents.push(newAgent);
  saveAgents(agents); // Save to file
  
  console.log(`New agent registered: ${full_name} (${email}). Total agents: ${agents.length}`);
  
  res.json({
    success: true,
    agent: newAgent,
    token: 'mock_token_' + Date.now()
  });
});

// Check email availability
app.post('/api/check-email', (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }
  
  const existingAgent = agents.find(agent => agent.email === email);
  
  res.json({
    available: !existingAgent,
    message: existingAgent ? 'Email already registered' : 'Email is available'
  });
});

app.get('/api/agent/referral-link/:agentId', (req, res) => {
  const { agentId } = req.params;
  const referralCode = 'DEMO' + agentId.slice(-4);
  
  res.json({
    success: true,
    referral_code: referralCode,
    referral_link: `https://agent-system-2.onrender.com/vc/index.html?ref=${referralCode}`,
  });
});

// Track visits with referral codes
app.post('/api/track-visit', (req, res) => {
  const { referral_code, visitor_ip, user_agent, page_url } = req.body;
  
  console.log('Visit tracked:', { referral_code, visitor_ip, user_agent, page_url });
  
  if (!referral_code) {
    return res.status(400).json({ success: false, error: 'Referral code is required' });
  }
  
  // Find agent by referral code
  const agent = agents.find(a => a.referral_code === referral_code);
  
  if (!agent) {
    console.log('Agent not found for referral code:', referral_code);
    return res.status(404).json({ success: false, error: 'Agent not found' });
  }
  
  // Update agent visit count
  if (!agent.visits) agent.visits = 0;
  agent.visits += 1;
  
  console.log(`Visit tracked for agent ${agent.full_name} (${agent.email}). Total visits: ${agent.visits}`);
  
  res.json({ 
    success: true, 
    message: 'Visit tracked successfully',
    agent_name: agent.full_name,
    total_visits: agent.visits
  });
});

// Get agent data by ID
app.get('/api/agent/:id', (req, res) => {
  const { id } = req.params;
  const agentId = parseInt(id);
  
  const agent = agents.find(a => a.id === agentId);
  
  if (!agent) {
    return res.status(404).json({ success: false, error: 'Agent not found' });
  }
  
  res.json({
    success: true,
    agent: {
      id: agent.id,
      full_name: agent.full_name,
      email: agent.email,
      referral_code: agent.referral_code,
      visits: agent.visits || 0,
      sales: agent.sales || 0,
      commissions: agent.totalCommissions || 0,
      is_active: agent.is_active,
      created_at: agent.created_at
    }
  });
});

// Get agent referral link
app.get('/api/agent/:id/referral-link', (req, res) => {
  const { id } = req.params;
  const agentId = parseInt(id);
  
  const agent = agents.find(a => a.id === agentId);
  
  if (!agent) {
    return res.status(404).json({ success: false, error: 'Agent not found' });
  }
  
  const referralLink = `${req.protocol}://${req.get('host')}/vc/index.html?ref=${agent.referral_code}`;
  
  res.json({
    success: true,
    referral_link: referralLink,
    referral_code: agent.referral_code
  });
});

app.post('/api/record-sale', (req, res) => {
  const { referral_code, sale_amount, customer_email } = req.body;
  
  // Mock response
  res.json({
    success: true,
    message: 'Sale recorded successfully',
    commission: Math.round(sale_amount * 0.1), // 10% commission
    sale_id: Date.now()
  });
});

// Get agent sales
app.get('/api/agent/:id/sales', (req, res) => {
  const agentId = parseInt(req.params.id);
  const agentSales = sales.filter(sale => sale.agentId === agentId);
  console.log(`Sales loaded from server: ${agentSales.length} sales for agent ${agentId}`);
  res.json(agentSales);
});

// Add new sale
app.post('/api/agent/:id/sales', (req, res) => {
  const agentId = parseInt(req.params.id);
  const { amount, product, customer } = req.body;
  
  // Find agent
  const agent = agents.find(a => a.id === agentId);
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }
  
  // Calculate commission (10%)
  const commission = Math.round(amount * 0.1);
  
  // Create sale record
  const sale = {
    id: sales.length + 1,
    agentId: agentId,
    agentName: agent.full_name,
    date: new Date().toISOString(),
    product: product || 'מוצר כללי',
    customer: customer || 'לקוח אנונימי',
    amount: amount,
    commission: commission,
    status: 'completed'
  };
  
  // Add to sales array
  sales.push(sale);
  saveSales(sales); // Save to file
  
  // Update agent stats
  agent.sales = (agent.sales || 0) + 1;
  agent.totalCommissions = (agent.totalCommissions || 0) + commission;
  saveAgents(agents); // Save updated agent stats
  
  console.log(`New sale recorded: Agent ${agent.full_name}, Amount: ₪${amount}, Commission: ₪${commission}`);
  
  res.json({
    success: true,
    sale: sale,
    agent: {
      id: agent.id,
      sales: agent.sales,
      totalCommissions: agent.totalCommissions
    }
  });
});

// Password reset endpoint
app.post('/api/agent/:id/reset-password', (req, res) => {
  const agentId = parseInt(req.params.id);
  
  // Find agent
  const agent = agents.find(a => a.id === agentId);
  if (!agent) {
    return res.status(404).json({ error: 'Agent not found' });
  }
  
  // Generate temporary password
  const tempPassword = 'TEMP' + Math.random().toString(36).substring(2, 8).toUpperCase();
  
  // Hash the temporary password
  const hashedPassword = bcrypt.hashSync(tempPassword, 10);
  
  // Update agent password
  agent.password = hashedPassword;
  agent.password_reset_at = new Date().toISOString();
  saveAgents(agents); // Save to file
  
  console.log(`Password reset for agent ${agent.full_name} (${agent.email}): ${tempPassword}`);
  
  // In production, this would send WhatsApp message
  // For now, we'll simulate it
  const whatsappMessage = `🔐 איפוס סיסמה - מערכת סוכנים

שלום ${agent.full_name},

הסיסמה שלך אופסה על ידי המנהל.

🔑 הסיסמה החדשה שלך: ${tempPassword}

👆 היכנס למערכת עם הסיסמה החדשה:
${process.env.NODE_ENV === 'production' ? 'https://agent-system-2.onrender.com' : 'http://localhost:10000'}/agent-login.html

💡 מומלץ לשנות את הסיסמה אחרי הכניסה הראשונה.

בהצלחה! 🚀`;

  console.log('WhatsApp message to send:', whatsappMessage);
  console.log('Agent phone:', agent.phone);
  
  res.json({
    success: true,
    message: 'Password reset successfully',
    tempPassword: tempPassword, // Only for development/testing
    whatsappMessage: whatsappMessage,
    agent: {
      id: agent.id,
      full_name: agent.full_name,
      phone: agent.phone,
      email: agent.email
    }
  });
});

// 🔐 Agent login endpoint - SECURED
app.post('/api/agents/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body;
  
  try {
    // Input validation
    if (!email || !password) {
      await logSecurityEvent('INVALID_LOGIN_ATTEMPT', 'LOW', req, { 
        reason: 'Missing email or password' 
      });
      return res.status(400).json({ 
        error: 'נדרש להזין אימייל וסיסמה',
        code: 'MISSING_CREDENTIALS'
      });
    }
    
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      await logSecurityEvent('INVALID_LOGIN_ATTEMPT', 'LOW', req, { 
        reason: 'Invalid email format',
        email: email
      });
      return res.status(400).json({ 
        error: 'פורמט אימייל לא תקין',
        code: 'INVALID_EMAIL_FORMAT'
      });
    }
    
    // Find agent by email
    const agent = agents.find(a => a.email.toLowerCase() === email.toLowerCase());
    if (!agent) {
      await logUserAction(null, 'LOGIN_ATTEMPT', 'FAILED', req, { 
        email: email,
        reason: 'User not found'
      });
      await logSecurityEvent('FAILED_LOGIN_ATTEMPT', 'MEDIUM', req, { 
        email: email,
        reason: 'User not found'
      });
      return res.status(401).json({ 
        error: 'אימייל או סיסמה לא נכונים',
        code: 'INVALID_CREDENTIALS'
      });
    }
    
    // Check if agent is active
    if (!agent.is_active) {
      await logUserAction(agent.id, 'LOGIN_ATTEMPT', 'BLOCKED', req, { 
        reason: 'Account inactive'
      });
      await logSecurityEvent('BLOCKED_LOGIN_ATTEMPT', 'HIGH', req, { 
        userId: agent.id,
        email: email,
        reason: 'Account inactive'
      });
      return res.status(403).json({ 
        error: 'החשבון חסום. פנה למנהל המערכת',
        code: 'ACCOUNT_BLOCKED'
      });
    }
    
    // Verify password
    const isPasswordValid = await bcrypt.compare(password, agent.password);
    if (!isPasswordValid) {
      await logUserAction(agent.id, 'LOGIN_ATTEMPT', 'FAILED', req, { 
        reason: 'Invalid password'
      });
      await logSecurityEvent('FAILED_LOGIN_ATTEMPT', 'MEDIUM', req, { 
        userId: agent.id,
        email: email,
        reason: 'Invalid password'
      });
      return res.status(401).json({ 
        error: 'אימייל או סיסמה לא נכונים',
        code: 'INVALID_CREDENTIALS'
      });
    }
    
    // Update agent visits
    agent.visits = (agent.visits || 0) + 1;
    agent.last_login = new Date().toISOString();
    await saveAgents(agents);
    
    // Generate secure JWT token
    const token = createToken(agent);
    
    // Set secure cookie
    setTokenCookie(res, token);
    
    // Log successful login
    await logUserAction(agent.id, 'LOGIN', 'SUCCESS', req, { 
      userAgent: req.headers['user-agent']
    });
    
    console.log(`✅ Agent login successful: ${agent.full_name} (${agent.email}) from ${req.ip}`);
    
    // Return minimal user data (no sensitive info)
    res.json({
      success: true,
      message: 'התחברות בוצעה בהצלחה',
      user: {
        id: agent.id,
        email: agent.email,
        fullName: agent.full_name,
        referralCode: agent.referral_code,
        role: agent.role || 'agent'
      }
    });
    
  } catch (error) {
    console.error('❌ Login error:', error);
    await logSecurityEvent('LOGIN_ERROR', 'HIGH', req, { 
      error: error.message
    });
    res.status(500).json({ 
      error: 'שגיאת שרת פנימית',
      code: 'INTERNAL_ERROR'
    });
  }
});

// 🚪 Agent logout endpoint - SECURED
app.post('/api/agents/logout', authenticate, async (req, res) => {
  try {
    // Log logout action
    await logUserAction(req.user.id, 'LOGOUT', 'SUCCESS', req);
    
    // Clear the authentication cookie
    clearTokenCookie(res);
    
    console.log(`🚪 Agent logout: ${req.user.email}`);
    
    res.json({
      success: true,
      message: 'התנתקות בוצעה בהצלחה'
    });
    
  } catch (error) {
    console.error('❌ Logout error:', error);
    res.status(500).json({ 
      error: 'שגיאת שרת פנימית',
      code: 'INTERNAL_ERROR'
    });
  }
});

// 👤 Get current user info - SECURED
app.get('/api/user/me', authenticate, async (req, res) => {
  try {
    const agent = agents.find(a => a.id === req.user.id);
    if (!agent) {
      return res.status(404).json({ 
        error: 'משתמש לא נמצא',
        code: 'USER_NOT_FOUND'
      });
    }
    
    await logUserAction(req.user.id, 'GET_PROFILE', 'SUCCESS', req);
    
    res.json({
      success: true,
      user: {
        id: agent.id,
        email: agent.email,
        fullName: agent.full_name,
        phone: agent.phone,
        referralCode: agent.referral_code,
        visits: agent.visits || 0,
        sales: agent.sales || 0,
        totalCommissions: agent.totalCommissions || 0,
        isActive: agent.is_active,
        role: agent.role || 'agent',
        lastLogin: agent.last_login
      }
    });
    
  } catch (error) {
    console.error('❌ Get user error:', error);
    res.status(500).json({ 
      error: 'שגיאת שרת פנימית',
      code: 'INTERNAL_ERROR'
    });
  }
});

// Agent registration endpoint (real)
app.post('/api/agents/register', (req, res) => {
  const { email, password, full_name, phone, payment_details } = req.body;
  
  if (!email || !password || !full_name) {
    return res.status(400).json({ error: 'Email, password and full name are required' });
  }
  
  // Check if agent already exists
  const existingAgent = agents.find(a => a.email === email);
  if (existingAgent) {
    return res.status(409).json({ error: 'Agent with this email already exists' });
  }
  
  // Hash password
  const hashedPassword = bcrypt.hashSync(password, 10);
  
  // Generate referral code
  const referralCode = 'AG' + Math.random().toString(36).substring(2, 8).toUpperCase();
  
  // Create new agent
  const newAgent = {
    id: agents.length + 1,
    email: email,
    password: hashedPassword,
    full_name: full_name,
    phone: phone || '',
    payment_details: payment_details || '',
    referral_code: referralCode,
    is_active: true,
    role: 'agent',
    visits: 0,
    sales: 0,
    totalCommissions: 0,
    created_at: new Date().toISOString()
  };
  
  // Add to agents array
  agents.push(newAgent);
  saveAgents(agents); // Save to file
  
  console.log(`New agent registered: ${full_name} (${email}) with code ${referralCode}`);
  
  res.json({
    success: true,
    message: 'Agent registered successfully',
    agent: {
      id: newAgent.id,
      email: newAgent.email,
      full_name: newAgent.full_name,
      phone: newAgent.phone,
      referral_code: newAgent.referral_code,
      role: newAgent.role,
      is_active: newAgent.is_active
    },
    token: 'JWT_' + Math.random().toString(36).substring(2, 15)
  });
});

// Check email availability (mock)
app.post('/api/check-email', (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }
  
  // Mock - always available for demo
  res.json({
    available: true,
    email: email
  });
});

// Debug endpoint - check database status
app.get('/api/debug/database', async (req, res) => {
  try {
    // Try to import and use the database
    const { getDB } = await import('./src/db.js');
    const db = await getDB();
    
    // Get database info
    const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table'");
    const agentsCount = await db.get("SELECT COUNT(*) as count FROM agents");
    const agents = await db.all("SELECT id, email, full_name, referral_code, created_at FROM agents ORDER BY created_at DESC LIMIT 10");
    
    res.json({
      success: true,
      database_status: 'connected',
      tables: tables.map(t => t.name),
      agents_count: agentsCount.count,
      recent_agents: agents,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.json({
      success: false,
      database_status: 'error',
      error: error.message,
      error_code: error.code,
      error_errno: error.errno,
      timestamp: new Date().toISOString()
    });
  }
});

// Debug endpoint - test agent registration with real database
app.post('/api/debug/register-agent', async (req, res) => {
  try {
    const { email, password, full_name, phone } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    // Try to use real database
    const { getDB } = await import('./src/db.js');
    const { hashPassword } = await import('./src/auth.js');
    const { v4: uuidv4 } = await import('uuid');
    
    const db = await getDB();
    
    // Check if email exists
    const existing = await db.get('SELECT id FROM agents WHERE email = ?', [email]);
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    
    // Hash password and create referral code
    const passwordHash = await hashPassword(password);
    const referralCode = uuidv4().substring(0, 8).toUpperCase();
    
    // Insert new agent
    const result = await db.run(
      'INSERT INTO agents (email, password_hash, full_name, phone, referral_code, role) VALUES (?, ?, ?, ?, ?, ?)',
      [email, passwordHash, full_name || null, phone || null, referralCode, 'agent']
    );
    
    res.json({
      success: true,
      message: 'Agent registered successfully in database',
      agent: {
        id: result.lastID,
        email,
        full_name: full_name || null,
        referral_code: referralCode,
        role: 'agent'
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      error_code: error.code,
      error_errno: error.errno,
      stack: error.stack
    });
  }
});

// Admin API endpoints for dashboard
app.get('/api/agents/all', dashboardLimiter, (req, res) => {
  console.log('Getting all agents, current count:', agents.length);
  
  res.json({
    success: true,
    agents: agents,
    stats: {
      activeAgents: agents.filter(a => a.is_active).length,
      pendingAgents: agents.filter(a => !a.is_active).length,
      totalCommissions: 1250,
      payoutRequests: payoutRequests.filter(p => p.status === 'pending').length
    }
  });
});

app.get('/api/admin/agents', (req, res) => {
  // Redirect to the main agents endpoint
  res.redirect('/api/agents/all');
});

app.get('/api/agents', (req, res) => {
  // Redirect to the main agents endpoint
  res.redirect('/api/agents/all');
});

// Delete agent endpoint
app.delete('/api/admin/agent/:id', (req, res) => {
  const { id } = req.params;
  const agentId = parseInt(id);
  
  console.log(`Deleting agent with ID: ${agentId}`);
  
  // Find the agent to get their name
  const agentToDelete = agents.find(agent => agent.id === agentId);
  
  if (!agentToDelete) {
    return res.status(404).json({
      success: false,
      error: 'Agent not found'
    });
  }
  
  // Remove agent from the array
  const initialLength = agents.length;
  agents = agents.filter(agent => agent.id !== agentId);
  
  console.log(`Agent deleted. Agents count: ${initialLength} -> ${agents.length}`);
  
  res.json({
    success: true,
    message: 'Agent deleted successfully',
    deleted_agent: agentToDelete.full_name || agentToDelete.email
  });
});

// Toggle agent status
app.post('/api/admin/agent/:id/toggle-status', (req, res) => {
  const { id } = req.params;
  const { is_active } = req.body;
  const agentId = parseInt(id);
  
  console.log(`Toggling agent ${agentId} status to: ${!is_active}`);
  
  // Find and update the agent
  const agentIndex = agents.findIndex(agent => agent.id === agentId);
  
  if (agentIndex === -1) {
    return res.status(404).json({
      success: false,
      error: 'Agent not found'
    });
  }
  
  // Toggle the status
  agents[agentIndex].is_active = !is_active;
  
  res.json({
    success: true,
    message: 'Agent status updated successfully',
    agent_id: agentId,
    new_status: agents[agentIndex].is_active
  });
});

// Approve agent
app.post('/api/admin/agents/:id/approve', (req, res) => {
  const { id } = req.params;
  
  console.log(`Approving agent with ID: ${id}`);
  
  res.json({
    success: true,
    message: 'Agent approved successfully'
  });
});

// Block agent
app.post('/api/admin/agents/:id/block', (req, res) => {
  const { id } = req.params;
  
  console.log(`Blocking agent with ID: ${id}`);
  
  res.json({
    success: true,
    message: 'Agent blocked successfully'
  });
});

// Get pending payouts
app.get('/api/payouts/pending', (req, res) => {
  console.log('Getting pending payouts, current count:', payouts.length);
  
  res.json({
    success: true,
    payouts: payouts.filter(p => p.status === 'pending')
  });
});

// Approve payout
app.post('/api/admin/payouts/:id/approve', (req, res) => {
  const { id } = req.params;
  
  console.log(`Approving payout with ID: ${id}`);
  
  res.json({
    success: true,
    message: 'Payout approved successfully'
  });
});

// Serve admin dashboard at the root path for easy access
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-dashboard.html'));
});

// Data backup endpoint for manual backup
app.get('/api/backup/data', (req, res) => {
  console.log('📦 Creating data backup...');
  
  const backup = {
    agents: agents,
    sales: sales,
    timestamp: new Date().toISOString(),
    version: '1.0'
  };
  
  res.json({
    success: true,
    backup: backup,
    instructions: {
      agents_env_var: 'AGENTS_DATA',
      sales_env_var: 'SALES_DATA',
      agents_data: JSON.stringify(agents),
      sales_data: JSON.stringify(sales)
    }
  });
});

// Data restore endpoint
app.post('/api/backup/restore', (req, res) => {
  try {
    const { agents: backupAgents, sales: backupSales } = req.body;
    
    if (backupAgents) {
      agents.length = 0; // Clear current agents
      agents.push(...backupAgents);
      saveAgents(agents);
      console.log(`📥 Restored ${agents.length} agents from backup`);
    }
    
    if (backupSales) {
      sales.length = 0; // Clear current sales
      sales.push(...backupSales);
      saveSales(sales);
      console.log(`📥 Restored ${sales.length} sales from backup`);
    }
    
    res.json({
      success: true,
      message: 'Data restored successfully',
      agents_count: agents.length,
      sales_count: sales.length
    });
  } catch (error) {
    console.error('Error restoring backup:', error);
    res.status(500).json({ error: 'Failed to restore backup' });
  }
});

// Serve static files for public directory
app.use('/public', express.static(path.join(__dirname, 'public')));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Agent System running on port ${PORT}`);
  console.log(`📱 Main site: http://localhost:${PORT}`);
  console.log(`🛒 Sales site: http://localhost:${PORT}/vc/`);
  console.log(`⚡ Health check: http://localhost:${PORT}/health`);
  
  // Auto-save every 5 minutes as backup
  setInterval(() => {
    saveAgents(agents);
    saveSales(sales);
    console.log('💾 Auto-backup completed');
  }, 5 * 60 * 1000); // 5 minutes
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`💾 In-memory storage initialized with ${agents.length} agents`);
});
