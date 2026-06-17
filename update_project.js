require('dotenv').config({path:'.env.local'});
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query("UPDATE items SET project = 'YCA' WHERE name ILIKE '%TRANSPRANT%' RETURNING id, name, project").then(res => {
  console.log(res.rows);
  pool.end();
});
