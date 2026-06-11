require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const neonPool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_LMgw6EHNiOK5@ep-frosty-fog-ap50iw9c-pooler.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
  ssl: { rejectUnauthorized: false }
});

const rdsPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function getCreateTableSQL(tableName) {
  const res = await neonPool.query(`
    SELECT column_name, data_type, character_maximum_length, column_default, is_nullable
    FROM information_schema.columns 
    WHERE table_name = $1 
    ORDER BY ordinal_position
  `, [tableName]);
  
  if (res.rows.length === 0) return null;

  const cols = res.rows.map(row => {
    let type = row.data_type;
    if (type === 'character varying') {
      type = `VARCHAR(${row.character_maximum_length})`;
    } else if (type === 'timestamp without time zone') {
      type = 'TIMESTAMP';
    } else if (type === 'timestamp with time zone') {
      type = 'TIMESTAMPTZ';
    }
    
    let def = '';
    if (row.column_default) {
      if (row.column_default.includes('nextval')) {
        type = type === 'bigint' ? 'BIGSERIAL' : 'SERIAL';
      } else {
        def = ` DEFAULT ${row.column_default}`;
      }
    }
    
    let nullability = row.is_nullable === 'NO' ? ' NOT NULL' : '';
    
    return `"${row.column_name}" ${type}${def}${nullability}`;
  });
  
  return `CREATE TABLE IF NOT EXISTS ${tableName} (\n  ${cols.join(',\n  ')}\n);`;
}

async function migrateTable(tableName) {
  console.log(`\n--- Migrating table: ${tableName} ---`);
  
  const createSql = await getCreateTableSQL(tableName);
  if (!createSql) {
    console.log(`Table ${tableName} not found in Neon.`);
    return;
  }
  
  console.log('Creating table in RDS...');
  await rdsPool.query(createSql);
  
  const res = await neonPool.query(`SELECT * FROM ${tableName}`);
  const rows = res.rows;
  console.log(`Found ${rows.length} rows in Neon for ${tableName}.`);

  if (rows.length === 0) return;

  const columns = Object.keys(rows[0]);
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
  const insertQuery = `INSERT INTO ${tableName} ("${columns.join('", "')}") VALUES (${placeholders})`;

  let successCount = 0;
  for (const row of rows) {
    const values = columns.map(col => row[col]);
    try {
      await rdsPool.query(insertQuery, values);
      successCount++;
    } catch (err) {
      if (err.code !== '23505') {
        console.error(`Error inserting row into ${tableName}:`, err.message);
      }
    }
  }
  
  console.log(`Successfully migrated ${successCount} rows into AWS RDS for ${tableName}.`);
}

async function run() {
  try {
    await rdsPool.query('SELECT 1');
    console.log("✅ AWS RDS Connected Successfully!");
  } catch (err) {
    console.error("❌ Failed to connect to AWS RDS. Error:", err.message);
    process.exit(1);
  }

  try {
    await migrateTable('users');
    await migrateTable('upload_jobs');
    await migrateTable('dpf_records');
    
    console.log("\n🎉 Migration Completed Successfully!");
  } catch (err) {
    console.error("\n❌ Migration Error:", err);
  } finally {
    await neonPool.end();
    await rdsPool.end();
  }
}

run();
