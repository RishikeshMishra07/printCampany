require('dotenv').config({path:'.env.local'});
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const xlsx = require('xlsx');
const path = require('path');

async function fixImport() {
  const filePath = 'D:/Office/printCampany/File/ALL STOCK -JUNE-26-27 (1).xlsx';
  console.log('Reading excel file...', filePath);
  
  const client = await pool.connect();
  
  try {
    // Read Excel
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { defval: null });
    
    console.log(`Found ${data.length} rows in excel.`);
    
    await client.query('BEGIN');
    
    // 1. Clear out the forced YCA and rates
    console.log('Clearing old data...');
    await client.query('UPDATE items SET project = NULL, new_rate = NULL, old_rate = NULL');
    
    // 2. Re-import based exactly on Excel
    console.log('Importing exact data from Excel...');
    let updatedCount = 0;
    
    for (const row of data) {
      const desc = row['DESCRIPTION'];
      const project = row['PROJECT'];
      const newRate = row['NEW RATE'];
      const oldRate = row['RATE'];
      
      if (!desc) continue;
      
      if (project !== null || newRate !== null || oldRate !== null) {
        // Find the item by description (case insensitive to catch more)
        const updateQuery = `
          UPDATE items 
          SET 
            project = COALESCE($1, project),
            new_rate = COALESCE($2, new_rate),
            old_rate = COALESCE($3, old_rate)
          WHERE LOWER(TRIM(name)) = LOWER($4)
        `;
        
        const result = await client.query(updateQuery, [
          project ? String(project).trim() : null,
          newRate ? String(newRate).trim() : null,
          oldRate ? String(oldRate).trim() : null,
          String(desc).trim()
        ]);
        
        if (result.rowCount > 0) {
          updatedCount += result.rowCount;
        }
      }
    }
    
    await client.query('COMMIT');
    console.log(`Successfully fixed and updated ${updatedCount} items based strictly on Excel.`);
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error fixing data:', err);
  } finally {
    client.release();
    pool.end();
  }
}

fixImport();
