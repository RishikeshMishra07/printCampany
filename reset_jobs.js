const { Pool } = require('pg'); 
require('dotenv').config({path: '.env.local'}); 
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }); 
pool.query("UPDATE upload_jobs SET status = 'PENDING', processed_rows = 0 WHERE status = 'PROCESSING'").then(res => { 
  console.log('Reset ' + res.rowCount + ' jobs'); 
  process.exit(0); 
});
