require('dotenv').config({path: '.env.local'});
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function createTable() {
  const query = `
    CREATE TABLE IF NOT EXISTS work_assignments (
        id SERIAL PRIMARY KEY,
        floor_name VARCHAR(50) NOT NULL,
        assigned_to VARCHAR(100) REFERENCES users(employee_id),
        bom_id INTEGER REFERENCES production_bom(id),
        task_description TEXT,
        target_qty NUMERIC,
        status VARCHAR(20) DEFAULT 'Pending',
        assigned_by VARCHAR(100) REFERENCES users(employee_id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    await pool.query(query);
    console.log("Table work_assignments created successfully.");
  } catch (error) {
    console.error("Error creating table:", error);
  } finally {
    pool.end();
  }
}

createTable();
