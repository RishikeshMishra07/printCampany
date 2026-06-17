import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    console.log('Adding status column...');
    await pool.query(`ALTER TABLE inventory_transactions ADD COLUMN status VARCHAR(20) DEFAULT 'Approved';`);
    console.log('Done!');
  } catch (e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}

run();
