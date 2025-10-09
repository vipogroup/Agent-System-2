import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Basic middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Serve static files
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/vc', express.static(path.join(__dirname, 'vc')));

// Root route
app.get('/', (req, res) => {
  res.redirect('/public/index.html');
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    ok: true, 
    message: 'Agent System is running',
    timestamp: new Date().toISOString()
  });
});

// Simple API endpoints for demo
app.post('/api/agents/register', (req, res) => {
  const { full_name, email, password } = req.body;
  
  if (!full_name || !email || !password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  // Generate referral code
  const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase() + 
                      Math.random().toString(36).substring(2, 4).toUpperCase();
  
  // Mock response
  const agent = {
    id: Date.now(),
    full_name,
    email,
    referral_code: referralCode,
    role: 'agent',
    created_at: new Date().toISOString()
  };
  
  res.json({
    success: true,
    agent,
    token: 'mock_token_' + Date.now()
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

app.post('/api/track-visit', (req, res) => {
  console.log('Visit tracked:', req.body);
  res.json({ success: true, message: 'Visit tracked successfully' });
});

// Mock API endpoints for demo
app.get('/api/agent/referral-link/:id', (req, res) => {
  const { id } = req.params;
  res.json({
    referral_link: `https://agent-system-2.onrender.com/shop?ref=AGENT${id}`,
    referral_code: `AGENT${id}`
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

// Mock sales data
app.get('/api/agent/:id/sales', (req, res) => {
  res.json([
    {
      id: 1,
      date: '2025-10-08',
      product: 'עיסוי שוודי',
      customer: 'customer1@example.com',
      amount: 500,
      commission: 50,
      status: 'completed'
    },
    {
      id: 2,
      date: '2025-10-07',
      product: 'עיסוי רקמות עמוק',
      customer: 'customer2@example.com',
      amount: 300,
      commission: 30,
      status: 'completed'
    }
  ]);
});

// Agent registration endpoint (mock)
app.post('/api/agents/register', (req, res) => {
  const { email, password, full_name, phone, payment_details } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  
  // Mock successful registration
  const referralCode = 'DEMO' + Math.random().toString(36).substring(2, 8).toUpperCase();
  
  res.json({
    success: true,
    message: 'Agent registered successfully',
    agent: {
      id: Date.now(),
      email,
      full_name: full_name || null,
      referral_code: referralCode,
      role: 'agent'
    },
    token: 'mock-jwt-token'
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
});
