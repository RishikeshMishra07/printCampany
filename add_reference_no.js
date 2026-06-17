const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    await pool.query(`ALTER TABLE inventory_transactions ADD COLUMN reference_no VARCHAR(100);`);
    console.log("Column added successfully!");
  } catch (e) {
    console.error("ERROR:", e.message);
  } finally {
    pool.end();
  }
}
run();
