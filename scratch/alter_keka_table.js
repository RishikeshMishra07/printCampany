const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    await pool.query(`
      ALTER TABLE employee_keka_data 
      ADD COLUMN IF NOT EXISTS location VARCHAR(100),
      ADD COLUMN IF NOT EXISTS doc DATE,
      ADD COLUMN IF NOT EXISTS agent_ohr VARCHAR(100);
    `);
    console.log("Columns added successfully.");
  } catch (err) {
    console.error("Error altering table:", err);
  } finally {
    await pool.end();
  }
}

main();
