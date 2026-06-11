require('dotenv').config({ path: '.env.local' });
if (!process.env.DATABASE_URL) {
  require('dotenv').config({ path: '.env' });
}

const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function setupIndexes() {
  try {
    console.log("Enabling pg_trgm extension...");
    await pool.query("CREATE EXTENSION IF NOT EXISTS pg_trgm;");
    console.log("pg_trgm extension enabled.");

    console.log("Creating trigram index on account_no...");
    await pool.query("CREATE INDEX IF NOT EXISTS idx_dpf_records_account_no_trgm ON dpf_records USING GIN (account_no gin_trgm_ops);");
    
    console.log("Creating trigram index on employee_code...");
    await pool.query("CREATE INDEX IF NOT EXISTS idx_dpf_records_emp_code_trgm ON dpf_records USING GIN (employee_code gin_trgm_ops);");

    console.log("Creating trigram index on employee_name...");
    await pool.query("CREATE INDEX IF NOT EXISTS idx_dpf_records_emp_name_trgm ON dpf_records USING GIN (employee_name gin_trgm_ops);");
    
    console.log("Creating trigram index on phone_no...");
    await pool.query("CREATE INDEX IF NOT EXISTS idx_dpf_records_phone_no_trgm ON dpf_records USING GIN (phone_no gin_trgm_ops);");

    console.log("Indexes created successfully!");

    // Verify
    const res = await pool.query("SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'dpf_records';");
    console.log("\nCurrent Indexes on dpf_records:");
    console.log(JSON.stringify(res.rows, null, 2));

    const res2 = await pool.query("EXPLAIN ANALYZE SELECT * FROM dpf_records WHERE account_no ILIKE '%0005287347821723861%';");
    console.log("\nEXPLAIN ANALYZE for query:");
    console.log(res2.rows.map(r => r['QUERY PLAN']).join('\n'));

  } catch (error) {
    console.error("Error setting up indexes:", error);
  } finally {
    await pool.end();
  }
}
setupIndexes();
