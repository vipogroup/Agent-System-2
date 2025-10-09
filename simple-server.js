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
