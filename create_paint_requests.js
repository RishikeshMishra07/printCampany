const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS paint_requests (
        id SERIAL PRIMARY KEY,
        deal_id INTEGER REFERENCES deals(id) ON DELETE SET NULL,
        norm_id INTEGER REFERENCES paint_norms(id) ON DELETE SET NULL,
        parts_qty INTEGER NOT NULL,
        primer_standard DECIMAL(10, 2) DEFAULT 0,
        primer_extra DECIMAL(10, 2) DEFAULT 0,
        topcoat_standard DECIMAL(10, 2) DEFAULT 0,
        topcoat_extra DECIMAL(10, 2) DEFAULT 0,
        thinner_standard DECIMAL(10, 2) DEFAULT 0,
        thinner_extra DECIMAL(10, 2) DEFAULT 0,
        reason TEXT,
        status VARCHAR(20) DEFAULT 'Pending',
        requested_by VARCHAR(100),
        approved_by VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Table paint_requests created successfully!");
  } catch (e) {
    console.error("ERROR:", e.message);
  } finally {
    pool.end();
  }
}
run();
