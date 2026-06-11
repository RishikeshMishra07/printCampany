require('dotenv').config({path:'.env.local'});
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'").then(r => console.log(r.rows)).catch(console.error).finally(() => pool.end());
