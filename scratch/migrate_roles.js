require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    console.log("Updating existing roles to 'user'...");
    
    const res = await pool.query(`
      UPDATE users 
      SET role = 'user' 
      WHERE role IN ('hr', 'agent', 'ph', 'HR', 'AGENT', 'PH')
      RETURNING id, username, role;
    `);
    
    console.log(`✅ Successfully updated ${res.rowCount} users to 'user' role.`);
  } catch (err) {
    console.error("Error updating roles:", err);
  } finally {
    process.exit(0);
  }
}

run();
