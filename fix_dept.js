require('dotenv').config({path:'.env.local'});
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function fixDept() {
  try {
    await pool.query("UPDATE departments SET name = 'Production' WHERE name = 'Printing'");
    console.log("Renamed Printing to Production in DB");
  } catch(e) {
    console.log(e);
  } finally {
    pool.end();
  }
}
fixDept();
