require('dotenv').config({path:'.env.local'});
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const xlsx = require('xlsx');
const path = require('path');

async function importFromExcel() {
  const filePath = 'D:/Office/printCampany/File/ALL STOCK -JUNE-26-27 (1).xlsx';
  console.log('Reading excel file...', filePath);
  
  try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { defval: null });
    
    console.log(`Found ${data.length} rows in excel.`);
    
    let updatedCount = 0;
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      for (const row of data) {
        const desc = row['DESCRIPTION'];
        const project = row['PROJECT'];
        const newRate = row['NEW RATE'];
        const oldRate = row['RATE'];
        
        if (!desc) continue;
        
        // Only update if we have something to update
        if (project !== null || newRate !== null || oldRate !== null) {
          const query = `
            UPDATE items 
            SET 
              project = COALESCE($1, project),
              new_rate = COALESCE($2, new_rate),
              old_rate = COALESCE($3, old_rate)
            WHERE name = $4
          `;
          
          const result = await client.query(query, [
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
      console.log(`Successfully updated ${updatedCount} items.`);
      
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
    
  } catch (err) {
    console.error('Error importing:', err);
  } finally {
    pool.end();
  }
}

importFromExcel();
