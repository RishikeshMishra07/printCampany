import { query } from './lib/db';

async function check() {
  const jobs = await query('SELECT * FROM upload_jobs ORDER BY created_at DESC LIMIT 5');
  console.log('JOBS:', jobs.rows);
  const count = await query('SELECT COUNT(*) FROM dpf_records');
  console.log('TOTAL RECORDS:', count.rows[0].total);
}

check();
