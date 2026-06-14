const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    const res = await pool.query(`SELECT * FROM inventory_transactions ORDER BY created_at DESC LIMIT 5`);
    console.log(res.rows);
  } catch (e) {
    console.error("ERROR:", e.message);
  } finally {
    pool.end();
  }
}
run();
