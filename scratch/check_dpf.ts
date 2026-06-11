import { config } from 'dotenv';
config({ path: '.env.local' });
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function check() {
  const res = await pool.query('SELECT COUNT(*) as total FROM dpf_records');
  console.log('Total records:', res.rows[0].total);

  const res2 = await pool.query('SELECT upload_at, created_at FROM dpf_records LIMIT 5');
  console.log('Sample dates:', res2.rows);

  const res3 = await pool.query(`SELECT EXTRACT(MONTH FROM upload_at) as m, EXTRACT(YEAR FROM upload_at) as y, COUNT(*) as c FROM dpf_records GROUP BY m, y`);
  console.log('Grouped by month/year:', res3.rows);

  pool.end();
}

check().catch(console.error);
