require('dotenv').config({path:'.env.local'});
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query("UPDATE items SET project = 'YCA'").then(() => {
  console.log('All items updated to YCA');
  pool.end();
});
