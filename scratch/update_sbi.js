const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    await pool.query('UPDATE clients_master SET client_name = $1 WHERE client_name = $2', ['Sbi Recovery', 'SBI Recovery']);
    console.log('Updated to Sbi Recovery');
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}

run();
