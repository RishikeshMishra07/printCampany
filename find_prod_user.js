const { Pool } = require('pg');
require('dotenv').config({path: '.env.local'});
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function findProdUser() {
  try {
    const res = await pool.query(`
      SELECT u.employee_id, u.name, d.name as department_name
      FROM users u
      JOIN departments d ON u.department_id = d.id
      WHERE d.name IN ('Production', 'Printing', 'Quality Control (QC)', 'Dispatch')
      LIMIT 1
    `);
    if(res.rows.length > 0) {
       console.log("Found production user:", res.rows[0]);
    } else {
       console.log("No production user found.");
    }
  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
findProdUser();
