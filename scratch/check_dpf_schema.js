const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    const r = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'dpf_records'");
    console.log(r.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

main();
