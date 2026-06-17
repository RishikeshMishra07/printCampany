require('dotenv').config({path:'.env.local'});
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function updateDb() {
  try {
    // Add columns
    await pool.query('ALTER TABLE items ADD COLUMN IF NOT EXISTS new_rate VARCHAR(255)');
    await pool.query('ALTER TABLE items ADD COLUMN IF NOT EXISTS old_rate VARCHAR(255)');
    
    // Update sample item so user can see it
    await pool.query("UPDATE items SET new_rate = '120.00', old_rate = '100.00' WHERE name ILIKE '%TRANSPRANT%'");
    
    console.log('Columns added and sample data updated.');
  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
}

updateDb();
