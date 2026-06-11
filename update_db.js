require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    console.log("Connecting to database:", process.env.DATABASE_URL ? "URL loaded" : "URL is undefined");
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS employee_id VARCHAR(100);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255);
      
      ALTER TABLE upload_jobs ADD COLUMN IF NOT EXISTS uploaded_by_employee_id VARCHAR(100);
      ALTER TABLE upload_jobs ADD COLUMN IF NOT EXISTS uploaded_by_name VARCHAR(255);
      
      ALTER TABLE dpf_records ADD COLUMN IF NOT EXISTS uploaded_by_employee_id VARCHAR(100);
      ALTER TABLE dpf_records ADD COLUMN IF NOT EXISTS uploaded_by_name VARCHAR(255);
    `);
    console.log('Database schema successfully updated.');
  } catch (err) {
    console.error("Error updating database schema:", err);
  } finally {
    process.exit(0);
  }
}
run();
