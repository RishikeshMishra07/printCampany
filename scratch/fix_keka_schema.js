const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    // Add new columns
    await pool.query(`
      ALTER TABLE employee_keka_data 
      ADD COLUMN IF NOT EXISTS location VARCHAR(100),
      ADD COLUMN IF NOT EXISTS doc DATE,
      ADD COLUMN IF NOT EXISTS agent_ohr VARCHAR(100);
    `);
    
    // Rename emp_code to employee_id
    await pool.query(`
      ALTER TABLE employee_keka_data
      RENAME COLUMN emp_code TO employee_id;
    `);

    console.log("Schema fixed successfully.");
  } catch (err) {
    if (err.code === '42703') {
       console.log("Column might already be renamed:", err.message);
    } else {
       console.error("Error altering table:", err);
    }
  } finally {
    await pool.end();
  }
}

main();
