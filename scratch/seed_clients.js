const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const clients = [
  "Axis",
  "Encore",
  "Citi",
  "SBI",
  "Pooanwalla",
  "Axis Bank",
  "Abhishek",
  "SBI Recovery",
  "Uday",
  "Kotak Recovery",
  "Jyaullah",
  "Kotak NPA",
  "Axis Recovery",
  "Money View Bkt X",
  "Money View Bkt1",
  "Money View Bkt2",
  "Money View NPA",
  "Money View Recovery",
  "Kotak CD 2",
  "SBI CD 3-7"
];

async function run() {
  try {
    for (const client of clients) {
      await pool.query(
        'INSERT INTO clients_master (client_name) VALUES ($1) ON CONFLICT (client_name) DO NOTHING',
        [client.trim()]
      );
    }
    console.log('Successfully inserted all unique clients!');
  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}

run();
