import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import fs from 'fs';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Basic middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Persistent storage functions
const DATA_DIR = path.join(__dirname, 'data');
const AGENTS_FILE = path.join(DATA_DIR, 'agents.json');
const SALES_FILE = path.join(DATA_DIR, 'sales.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Load data from files
function loadAgents() {
  try {
    if (fs.existsSync(AGENTS_FILE)) {
      const data = fs.readFileSync(AGENTS_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading agents:', error);
  }
  return getDefaultAgents();
}

function saveAgents(agents) {
  try {
    fs.writeFileSync(AGENTS_FILE, JSON.stringify(agents, null, 2));
    console.log('Agents saved to file');
  } catch (error) {
    console.error('Error saving agents:', error);
  }
}

function loadSales() {
  try {
    if (fs.existsSync(SALES_FILE)) {
      const data = fs.readFileSync(SALES_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading sales:', error);
  }
  return [];
}

function saveSales(sales) {
  try {
    fs.writeFileSync(SALES_FILE, JSON.stringify(sales, null, 2));
    console.log('Sales saved to file');
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

// Initialize data from files
let agents = loadAgents();
let sales = loadSales();

console.log(`📊 Data loaded: ${agents.length} agents, ${sales.length} sales`);

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

app.get('/agent-dashboard.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'agent-dashboard.html'));
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

// Removed duplicate/incorrect referral link endpoint

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

// Agent login endpoint
app.post('/api/agents/login', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  
  // Find agent by email
  const agent = agents.find(a => a.email === email);
  if (!agent) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  
  // Check if agent is active
  if (!agent.is_active) {
    return res.status(403).json({ error: 'Account is blocked. Contact administrator.' });
  }
  
  // Verify password
  const isPasswordValid = bcrypt.compareSync(password, agent.password);
  if (!isPasswordValid) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  
  console.log(`Agent login successful: ${agent.full_name} (${agent.email})`);
  
  // Generate JWT token (simplified for demo)
  const token = 'JWT_' + Math.random().toString(36).substring(2, 15);
  
  res.json({
    success: true,
    message: 'Login successful',
    token: token,
    agent: {
      id: agent.id,
      email: agent.email,
      full_name: agent.full_name,
      phone: agent.phone,
      referral_code: agent.referral_code,
      visits: agent.visits || 0,
      sales: agent.sales || 0,
      totalCommissions: agent.totalCommissions || 0,
      is_active: agent.is_active
    }
  });
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
app.get('/api/agents/all', (req, res) => {
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
