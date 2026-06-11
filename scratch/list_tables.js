const { Pool } = require('pg');

const neonPool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_LMgw6EHNiOK5@ep-frosty-fog-ap50iw9c-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const res = await neonPool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
  console.log('Tables:', res.rows.map(r => r.table_name));
  process.exit(0);
}

run();
