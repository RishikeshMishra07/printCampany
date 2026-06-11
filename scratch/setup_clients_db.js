const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    // Create clients_master table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS clients_master (
        id SERIAL PRIMARY KEY,
        client_name VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Created clients_master table.");

    // Add indexes to dpf_records
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_dpf_client ON dpf_records (client);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_dpf_emp_code ON dpf_records (employee_code);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_dpf_upload_at ON dpf_records (upload_at);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_dpf_duplicate ON dpf_records (is_duplicate);`);
    console.log("Added performance indexes to dpf_records.");

    // Seed some initial clients if empty
    const res = await pool.query('SELECT COUNT(*) FROM clients_master');
    if (parseInt(res.rows[0].count) === 0) {
        await pool.query(`INSERT INTO clients_master (client_name) VALUES ('SBI Recovery'), ('HDFC') ON CONFLICT DO NOTHING;`);
        console.log("Seeded initial clients.");
    }
  } catch(e) {
    console.error("Error setting up DB:", e);
  } finally {
    pool.end();
  }
}

run();
