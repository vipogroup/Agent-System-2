import { MongoClient } from 'mongodb';

// MongoDB Atlas connection string (will be set via environment variable)
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/agent-system';
const DB_NAME = 'agent-system';

let client;
let db;

// Connect to MongoDB
export async function connectDB() {
  try {
    if (!client) {
      console.log('🔌 Connecting to MongoDB...');
      client = new MongoClient(MONGODB_URI);
      await client.connect();
      db = client.db(DB_NAME);
      console.log('✅ Connected to MongoDB successfully');
    }
    return db;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    // Fallback to in-memory storage if MongoDB fails
    return null;
  }
}

// Get database instance
export function getDB() {
  return db;
}

// Close connection
export async function closeDB() {
  if (client) {
    await client.close();
    console.log('🔌 MongoDB connection closed');
  }
}

// Agents collection operations
export async function getAgents() {
  try {
    const database = await connectDB();
    if (!database) return null;
    
    const agents = await database.collection('agents').find({}).toArray();
    console.log(`📊 Loaded ${agents.length} agents from MongoDB`);
    return agents;
  } catch (error) {
    console.error('Error loading agents from MongoDB:', error);
    return null;
  }
}

export async function saveAgent(agent) {
  try {
    const database = await connectDB();
    if (!database) return false;
    
    const result = await database.collection('agents').replaceOne(
      { id: agent.id },
      agent,
      { upsert: true }
    );
    
    console.log(`💾 Agent saved to MongoDB: ${agent.full_name}`);
    return true;
  } catch (error) {
    console.error('Error saving agent to MongoDB:', error);
    return false;
  }
}

export async function saveAllAgents(agents) {
  try {
    const database = await connectDB();
    if (!database) return false;
    
    // Clear existing agents and insert new ones
    await database.collection('agents').deleteMany({});
    if (agents.length > 0) {
      await database.collection('agents').insertMany(agents);
    }
    
    console.log(`💾 Saved ${agents.length} agents to MongoDB`);
    return true;
  } catch (error) {
    console.error('Error saving agents to MongoDB:', error);
    return false;
  }
}

// Sales collection operations
export async function getSales() {
  try {
    const database = await connectDB();
    if (!database) return null;
    
    const sales = await database.collection('sales').find({}).toArray();
    console.log(`📊 Loaded ${sales.length} sales from MongoDB`);
    return sales;
  } catch (error) {
    console.error('Error loading sales from MongoDB:', error);
    return null;
  }
}

export async function saveSale(sale) {
  try {
    const database = await connectDB();
    if (!database) return false;
    
    await database.collection('sales').insertOne(sale);
    console.log(`💾 Sale saved to MongoDB: ₪${sale.amount}`);
    return true;
  } catch (error) {
    console.error('Error saving sale to MongoDB:', error);
    return false;
  }
}

export async function saveAllSales(sales) {
  try {
    const database = await connectDB();
    if (!database) return false;
    
    // Clear existing sales and insert new ones
    await database.collection('sales').deleteMany({});
    if (sales.length > 0) {
      await database.collection('sales').insertMany(sales);
    }
    
    console.log(`💾 Saved ${sales.length} sales to MongoDB`);
    return true;
  } catch (error) {
    console.error('Error saving sales to MongoDB:', error);
    return false;
  }
}

// Health check
export async function checkDBHealth() {
  try {
    const database = await connectDB();
    if (!database) return false;
    
    await database.admin().ping();
    return true;
  } catch (error) {
    console.error('MongoDB health check failed:', error);
    return false;
  }
}
