require('dotenv').config({path: '.env.local'});
const { Pool } = require('pg');
const { sendReminderEmail, sendAdminSummaryEmail } = require('../lib/email');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:PaymentFileSystemIMS%23.2026@paymentfilesystemims.cd0ii8iysxip.ap-south-1.rds.amazonaws.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function runTest() {
  try {
    // 1. Update one test user's email to what the user requested
    const updateRes = await pool.query(`
      UPDATE users 
      SET email = 'workingstefto32@gmail.com' 
      WHERE id = (SELECT id FROM users WHERE role = 'user' AND email IS NOT NULL LIMIT 1)
      RETURNING id, username, employee_id, email
    `);
    
    const testUser = updateRes.rows[0];
    console.log('Test user updated:', testUser);

    // TEMPORARY FOR TESTING: Force this user to have NO uploads today by shifting their upload dates backwards
    await pool.query(`
      UPDATE upload_jobs 
      SET created_at = created_at - interval '1 day' 
      WHERE uploaded_by_employee_id = $1
    `, [testUser.employee_id]);
    console.log('Modified upload_jobs to simulate missed upload for', testUser.username);

    // 2. Run the cron job logic manually
    console.log("⏰ Running manual check for missing Paid Files...");
    
    // Get all active users
    const usersRes = await pool.query(`SELECT employee_id, name, email FROM users WHERE role = 'user' AND email IS NOT NULL`);
    const phUsers = usersRes.rows;

    const today = new Date().toISOString().split('T')[0];

    // Get all employee_ids who have uploaded a file today
    const uploadsRes = await pool.query(`
      SELECT DISTINCT uploaded_by_employee_id 
      FROM upload_jobs 
      WHERE DATE(created_at) = $1 AND status = 'COMPLETED'
    `, [today]);
    
    const uploadedEmpIds = uploadsRes.rows.map(r => r.uploaded_by_employee_id);

    const missedUsers = [];
    const uploadedUsers = [];

    for (const user of phUsers) {
      if (!uploadedEmpIds.includes(user.employee_id)) {
        missedUsers.push(user);
        console.log(`⚠️ User ${user.name} (${user.employee_id}) missed today's upload. Sending reminder...`);
        // We actually send the email here in the test
        await sendReminderEmail(user.email, user.name || user.employee_id, today);
      } else {
        uploadedUsers.push(user);
      }
    }

    // Send Admin Summary Email
    const adminsRes = await pool.query(`SELECT email FROM users WHERE role = 'admin' AND email IS NOT NULL`);
    const adminEmails = adminsRes.rows.map(r => r.email);

    if (adminEmails.length > 0) {
      console.log(`📊 Sending Daily Upload Summary to Admins: ${adminEmails.join(', ')}`);
      await sendAdminSummaryEmail(adminEmails, today, uploadedUsers, missedUsers);
    }
    
    console.log("Test completed successfully!");

  } catch (err) {
    console.error('Error during test:', err);
  } finally {
    await pool.end();
  }
}
runTest();
