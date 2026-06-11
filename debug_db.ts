import { Pool } from 'pg';
import { config } from 'dotenv';
config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function debug() {
  console.log('--- DEBUG START ---');
  try {
    const jobs = await pool.query('SELECT * FROM upload_jobs ORDER BY created_at DESC LIMIT 5');
    console.log('Last 5 Jobs:');
    jobs.rows.forEach(j => console.log(`ID: ${j.id}, Status: ${j.status}, Rows: ${j.processed_rows}/${j.total_rows}, Error: ${j.error_log}`));

    const records = await pool.query('SELECT COUNT(*) FROM dpf_records');
    console.log('\nTotal Records in dpf_records:', records.rows[0].count);

    if (records.rows[0].count > 0) {
      const sample = await pool.query('SELECT * FROM dpf_records LIMIT 1');
      console.log('Sample Record:', sample.rows[0]);
    }
  } catch (err) {
    console.error('Debug Error:', err);
  }
  console.log('--- DEBUG END ---');
  process.exit();
}

debug();
