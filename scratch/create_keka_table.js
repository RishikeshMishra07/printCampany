const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS employee_keka_data (
        emp_code VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255),
        designation VARCHAR(100),
        doj DATE,
        salary NUMERIC,
        tl_name VARCHAR(255),
        am_name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Table employee_keka_data created successfully.");
  } catch (err) {
    console.error("Error creating table:", err);
  } finally {
    await pool.end();
  }
}

main();
