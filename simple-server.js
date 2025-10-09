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
    target_site: 'https://agent-system-2.onrender.com/vc/'
  });
});

app.post('/api/track-visit', (req, res) => {
  console.log('Visit tracked:', req.body);
  res.json({ success: true, message: 'Visit tracked' });
});

app.post('/api/record-sale', (req, res) => {
  const { referral_code, sale_amount } = req.body;
  const commission = Math.round(sale_amount * 0.1);
  
  console.log('Sale recorded:', { referral_code, sale_amount, commission });
  
  res.json({
    success: true,
    message: 'Sale recorded',
    sale_id: Date.now(),
    commission_amount: commission
  });
});

app.get('/api/agents/all', (req, res) => {
  // Mock data
  const agents = [
    {
      id: 1,
      email: 'demo@agent.com',
      full_name: 'Demo Agent',
      referral_code: 'DEMO001',
      role: 'agent',
      is_active: 1,
      created_at: new Date().toISOString()
    }
  ];
  
  res.json({
    success: true,
    items: agents,
    count: agents.length
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
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
