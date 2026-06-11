require('dotenv').config({path: '.env.local'});
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:PaymentFileSystemIMS%23.2026@paymentfilesystemims.cd0ii8iysxip.ap-south-1.rds.amazonaws.com:5432/postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    await client.connect();
    const res = await client.query("UPDATE users SET email = 'nietlab123@gmail.com' WHERE role = 'admin' RETURNING id, username, role, email");
    console.log('Updated admin emails:', res.rows);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}
run();
