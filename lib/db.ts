import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

// Required for Neon to work in Node.js environments (Next.js server-side)
neonConfig.webSocketConstructor = ws;

// Create a single connection pool to the database using Neon Serverless
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Helper function to easily run SQL queries from your API routes
export const query = (text: string, params?: any[]) => {
  return pool.query(text, params);
};

export default pool;
