require('dotenv').config({ path: '.env.local' });
if (!process.env.DATABASE_URL) {
  require('dotenv').config({ path: '.env' });
}

const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkIndex() {
  try {
    const res = await pool.query("SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'dpf_records';");
    console.log("Indexes on dpf_records:");
    console.log(JSON.stringify(res.rows, null, 2));

    const res2 = await pool.query("EXPLAIN ANALYZE SELECT * FROM dpf_records WHERE account_no ILIKE '%0005287347821723861%' OR employee_name ILIKE '%0005287347821723861%';");
    console.log("\nEXPLAIN ANALYZE for query:");
    console.log(res2.rows.map(r => r['QUERY PLAN']).join('\n'));

  } catch (error) {
    console.error(error);
  } finally {
    await pool.end();
  }
}
checkIndex();
