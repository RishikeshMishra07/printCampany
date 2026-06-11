const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
    let queryText = `
      SELECT 
          r.employee_code, 
          r.employee_name,
          r.tl_name,
          r.am as am_name,
          r.ph,
          r.client,
          r.location,
          r.product,
          r.bucket,
          COUNT(r.id) as total_records, 
          COALESCE(SUM(CAST(NULLIF(regexp_replace(r.money_collected::text, '[^0-9.]', '', 'g'), '') AS NUMERIC)), 0) as total_money_collected
      FROM dpf_records r
      WHERE (is_duplicate = FALSE OR is_duplicate IS NULL)
      GROUP BY r.employee_code, r.employee_name, r.tl_name, r.am, r.ph, r.client, r.location, r.product, r.bucket
    `;

    const res = await pool.query(queryText);
    console.log(`Individual collections: ${res.rows.length}`);
    pool.end();
}
run();
