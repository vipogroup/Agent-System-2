import pg from 'pg';
const { Pool } = pg;

// PostgreSQL connection
let pool;

// Initialize PostgreSQL connection
export async function initPostgres() {
  try {
    // Use Render's PostgreSQL connection string
    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    
    if (!connectionString) {
      console.log('⚠️ No PostgreSQL connection string found, using fallback storage');
      return false;
    }

    pool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    // Test connection
    const client = await pool.connect();
    console.log('✅ Connected to PostgreSQL successfully');
    
    // Create tables if they don't exist
    await createTables(client);
    client.release();
    
    return true;
  } catch (error) {
    console.error('❌ PostgreSQL connection error:', error.message);
    return false;
  }
}

// Create tables
async function createTables(client) {
  try {
    // Create agents table
    await client.query(`
      CREATE TABLE IF NOT EXISTS agents (
        id BIGINT PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        referral_code VARCHAR(50) UNIQUE,
        is_active BOOLEAN DEFAULT true,
        role VARCHAR(50) DEFAULT 'agent',
        total_commissions DECIMAL(10,2) DEFAULT 0,
        visits INTEGER DEFAULT 0,
        sales INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create sales table
    await client.query(`
      CREATE TABLE IF NOT EXISTS sales (
        id SERIAL PRIMARY KEY,
        agent_id BIGINT REFERENCES agents(id),
        amount DECIMAL(10,2) NOT NULL,
        commission DECIMAL(10,2) NOT NULL,
        product VARCHAR(255),
        customer VARCHAR(255),
        status VARCHAR(50) DEFAULT 'completed',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create index for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_agents_email ON agents(email);
      CREATE INDEX IF NOT EXISTS idx_agents_referral_code ON agents(referral_code);
      CREATE INDEX IF NOT EXISTS idx_sales_agent_id ON sales(agent_id);
    `);

    console.log('✅ PostgreSQL tables created/verified');
  } catch (error) {
    console.error('❌ Error creating tables:', error.message);
    throw error;
  }
}

// Agent operations
export async function getAgentsFromPostgres() {
  try {
    if (!pool) return null;
    
    const result = await pool.query('SELECT * FROM agents ORDER BY created_at DESC');
    console.log(`📊 Loaded ${result.rows.length} agents from PostgreSQL`);
    
    // Convert to the format expected by the app
    return result.rows.map(row => ({
      id: parseInt(row.id),
      full_name: row.full_name,
      email: row.email,
      password: row.password,
      phone: row.phone,
      referral_code: row.referral_code,
      is_active: row.is_active,
      role: row.role,
      totalCommissions: parseFloat(row.total_commissions || 0),
      visits: row.visits || 0,
      sales: row.sales || 0,
      created_at: row.created_at?.toISOString()
    }));
  } catch (error) {
    console.error('❌ Error loading agents from PostgreSQL:', error.message);
    return null;
  }
}

export async function saveAgentToPostgres(agent) {
  try {
    if (!pool) return false;
    
    await pool.query(`
      INSERT INTO agents (id, full_name, email, password, phone, referral_code, is_active, role, total_commissions, visits, sales, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        email = EXCLUDED.email,
        password = EXCLUDED.password,
        phone = EXCLUDED.phone,
        referral_code = EXCLUDED.referral_code,
        is_active = EXCLUDED.is_active,
        role = EXCLUDED.role,
        total_commissions = EXCLUDED.total_commissions,
        visits = EXCLUDED.visits,
        sales = EXCLUDED.sales,
        updated_at = CURRENT_TIMESTAMP
    `, [
      agent.id,
      agent.full_name,
      agent.email,
      agent.password,
      agent.phone,
      agent.referral_code,
      agent.is_active,
      agent.role,
      agent.totalCommissions || 0,
      agent.visits || 0,
      agent.sales || 0,
      agent.created_at ? new Date(agent.created_at) : new Date()
    ]);
    
    console.log(`💾 Agent saved to PostgreSQL: ${agent.full_name}`);
    return true;
  } catch (error) {
    console.error('❌ Error saving agent to PostgreSQL:', error.message);
    return false;
  }
}

export async function saveAllAgentsToPostgres(agents) {
  try {
    if (!pool || !agents.length) return false;
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Clear existing agents
      await client.query('DELETE FROM agents');
      
      // Insert all agents
      for (const agent of agents) {
        await client.query(`
          INSERT INTO agents (id, full_name, email, password, phone, referral_code, is_active, role, total_commissions, visits, sales, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `, [
          agent.id,
          agent.full_name,
          agent.email,
          agent.password,
          agent.phone,
          agent.referral_code,
          agent.is_active,
          agent.role,
          agent.totalCommissions || 0,
          agent.visits || 0,
          agent.sales || 0,
          agent.created_at ? new Date(agent.created_at) : new Date()
        ]);
      }
      
      await client.query('COMMIT');
      console.log(`💾 Saved ${agents.length} agents to PostgreSQL`);
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Error saving agents to PostgreSQL:', error.message);
    return false;
  }
}

// Sales operations
export async function getSalesFromPostgres() {
  try {
    if (!pool) return null;
    
    const result = await pool.query('SELECT * FROM sales ORDER BY created_at DESC');
    console.log(`📊 Loaded ${result.rows.length} sales from PostgreSQL`);
    
    // Convert to the format expected by the app
    return result.rows.map(row => ({
      id: row.id,
      agent_id: parseInt(row.agent_id),
      amount: parseFloat(row.amount),
      commission: parseFloat(row.commission),
      product: row.product,
      customer: row.customer,
      status: row.status,
      date: row.created_at?.toISOString()
    }));
  } catch (error) {
    console.error('❌ Error loading sales from PostgreSQL:', error.message);
    return null;
  }
}

export async function saveSaleToPostgres(sale) {
  try {
    if (!pool) return false;
    
    await pool.query(`
      INSERT INTO sales (agent_id, amount, commission, product, customer, status, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      sale.agent_id,
      sale.amount,
      sale.commission,
      sale.product,
      sale.customer,
      sale.status,
      sale.date ? new Date(sale.date) : new Date()
    ]);
    
    console.log(`💾 Sale saved to PostgreSQL: ₪${sale.amount}`);
    return true;
  } catch (error) {
    console.error('❌ Error saving sale to PostgreSQL:', error.message);
    return false;
  }
}

export async function saveAllSalesToPostgres(sales) {
  try {
    if (!pool || !sales.length) return false;
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Clear existing sales
      await client.query('DELETE FROM sales');
      
      // Insert all sales
      for (const sale of sales) {
        await client.query(`
          INSERT INTO sales (agent_id, amount, commission, product, customer, status, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          sale.agent_id,
          sale.amount,
          sale.commission,
          sale.product,
          sale.customer,
          sale.status,
          sale.date ? new Date(sale.date) : new Date()
        ]);
      }
      
      await client.query('COMMIT');
      console.log(`💾 Saved ${sales.length} sales to PostgreSQL`);
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Error saving sales to PostgreSQL:', error.message);
    return false;
  }
}

// Health check
export async function checkPostgresHealth() {
  try {
    if (!pool) return false;
    
    const result = await pool.query('SELECT NOW()');
    return result.rows.length > 0;
  } catch (error) {
    console.error('❌ PostgreSQL health check failed:', error.message);
    return false;
  }
}

// Close connection
export async function closePostgres() {
  if (pool) {
    await pool.end();
    console.log('🔌 PostgreSQL connection closed');
  }
}
