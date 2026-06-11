require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    console.log("Adding columns to upload_jobs...");
    
    await pool.query(`
      ALTER TABLE upload_jobs ADD COLUMN IF NOT EXISTS target_employee_id VARCHAR(100);
      ALTER TABLE upload_jobs ADD COLUMN IF NOT EXISTS is_edited_by_admin BOOLEAN DEFAULT FALSE;
    `);
    
    // Migrate existing data
    await pool.query(`
      UPDATE upload_jobs 
      SET target_employee_id = uploaded_by_employee_id 
      WHERE target_employee_id IS NULL;
    `);
    
    console.log("✅ Schema update complete.");
  } catch (err) {
    console.error("Error updating schema:", err);
  } finally {
    process.exit(0);
  }
}

run();
