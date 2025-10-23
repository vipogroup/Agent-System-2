import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();

// CORS configuration — allow GitHub Pages origin with credentials and proper preflight
const ALLOWED_ORIGINS = new Set([
  'https://vipogroup.github.io',
  'http://localhost:3000'
]);

const corsOptions = {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    cb(ALLOWED_ORIGINS.has(origin) ? null : new Error('Not allowed by CORS'), ALLOWED_ORIGINS.has(origin));
  },
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  optionsSuccessStatus: 204
};

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Vary', 'Origin');
  }
  next();
});

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());
app.use(cookieParser());
const limiter = rateLimit({ 
  windowMs: 60*1000, // 1 minute
  max: 500, // increased from 200 to 500 requests per minute
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// static demo dashboards
app.use('/public', express.static(path.join(__dirname, '..', 'public')));

// serve vc website
app.use('/vc', express.static(path.join(__dirname, '..', 'vc')));

// health endpoint
app.get('/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 10000;

// Root route
app.get('/', (req, res) => {
  res.redirect('/public/index.html');
});

// Initialize the server
const startServer = async () => {
  try {
    console.log('Starting server initialization...');
    
    // Import modules
    const { initializeDatabase, initializeAdmin } = await import('./db.js');
    const { registerRoutes } = await import('./routes.js');
    const { registerAdminRoutes } = await import('./admin.js');
    const { registerSettingsRoutes, registerAgentAdminRoutes } = await import('./auth.js');
    
    // Initialize database
    await initializeDatabase();
    console.log('Database initialized');
    
    // Initialize admin user
    await initializeAdmin();
    console.log('✅ Admin user exists');
    
    // Register routes
    registerRoutes(app);
    registerAdminRoutes(app);
    registerSettingsRoutes(app);
    registerAgentAdminRoutes(app);
    
    // Start listening on all interfaces
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Affiliate skeleton listening on http://localhost:${PORT}`);
      console.log(`Agent dashboard demo: http://localhost:${PORT}/public/dashboard-agent.html`);
      console.log(`Admin dashboard demo: http://localhost:${PORT}/public/dashboard-admin.html`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();
