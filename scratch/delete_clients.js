const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    const res = await pool.query(`DELETE FROM clients_master WHERE client_name IN ('Abhishek', 'Uday', 'Jyaullah')`);
    console.log('Deleted rows: ', res.rowCount);
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}

run();
