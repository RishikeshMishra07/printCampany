const { Pool } = require('pg'); 
require('dotenv').config({path: '.env.local'}); 
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }); 
pool.query("SELECT id, status, total_rows, processed_rows FROM upload_jobs WHERE status != 'COMPLETED'").then(res => { 
  console.log(res.rows); 
  process.exit(0); 
});
