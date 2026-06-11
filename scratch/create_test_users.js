require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    console.log("Creating test users...");
    
    // 1. Create 2 test PH users
    await pool.query(`
      INSERT INTO users (employee_id, name, username, password, role, email) 
      VALUES 
        ('PH001', 'Rahul Sharma', 'rahul_ph', 'password123', 'user', 'rahul@test.com'),
        ('PH002', 'Priya Singh', 'priya_ph', 'password123', 'user', 'priya@test.com')
      ON CONFLICT (username) DO NOTHING;
    `);
    console.log("✅ Test users (Rahul Sharma, Priya Singh) created.");

    // 2. Insert a fake successful upload job for PH001 (Rahul) for TODAY
    const today = new Date().toISOString().split('T')[0];
    const uuidv4 = require('crypto').randomUUID(); // Need random UUID for job
    
    await pool.query(`
      INSERT INTO upload_jobs (id, file_path, status, total_rows, processed_rows, uploaded_by_employee_id, uploaded_by_name, upload_at)
      VALUES ($1, 'fake_file_rahul.xlsx', 'COMPLETED', 100, 100, 'PH001', 'Rahul Sharma', $2)
    `, [uuidv4, today]);
    
    console.log(`✅ Fake upload created for Rahul Sharma for Date: ${today}`);
    console.log("Priya Singh has NO uploads (will show as Pending ❌).");
    console.log("Done! You can now check the Daily Tracker UI in Admin Panel.");

  } catch (err) {
    console.error("Error setting up test data:", err);
  } finally {
    process.exit(0);
  }
}

run();
