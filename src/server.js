import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();

// Add async error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());
const limiter = rateLimit({ windowMs: 60*1000, max: 200 });
app.use(limiter);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// static demo dashboards
app.use('/public', express.static(path.join(__dirname, '..', 'public')));

// health endpoint
app.get('/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;

// Initialize the server
const startServer = async () => {
  try {
    // Import modules
    const { getDB } = await import('./db.js');
    const { registerRoutes } = await import('./routes.js');
    const { 
      registerAdminRoutes, 
      registerSettingsRoutes, 
      registerAgentAdminRoutes 
    } = await import('./admin.js');

    // Initialize database connection
    const db = await getDB(); // This will create tables if they don't exist
    
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
