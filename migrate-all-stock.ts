import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: '.env.local' });
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function migrate() {
  const client = await pool.connect();
  try {
    const dataPath = path.join(process.cwd(), 'all_stock_data.json');
    if (!fs.existsSync(dataPath)) {
        throw new Error(`Data file not found at ${dataPath}`);
    }
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    
    let itemsAdded = 0;
    
    // Skip first two rows (headers)
    for (let i = 2; i < data.length; i++) {
      const row = data[i];
      if (!row || !row[2]) continue; // Skip empty rows or rows without description

      const partNo = row[1] ? String(row[1]).trim() : '';
      let description = String(row[2]).trim();
      if (partNo && partNo !== 'null') {
          description = `[${partNo}] ${description}`;
      }
      
      const uom = row[3] ? String(row[3]).trim() : 'NOS';
      const category = row[5] ? String(row[5]).trim() : 'Uncategorized';
      let closingStock = parseFloat(row[43]);
      
      if (isNaN(closingStock)) {
         closingStock = parseFloat(row[8]) || 0; // Fallback to opening stock
      }

      // Check if item already exists to avoid conflict errors
      const checkRes = await client.query(`SELECT id FROM items WHERE name = $1`, [description]);
      let itemId;
      
      if (checkRes.rows.length > 0) {
          itemId = checkRes.rows[0].id;
      } else {
          try {
              const insertItemRes = await client.query(
                `INSERT INTO items (name, category, unit_of_measure, min_stock_level) VALUES ($1, $2, $3, 0) RETURNING id`,
                [description, category, uom]
              );
              itemId = insertItemRes.rows[0].id;
              itemsAdded++;
          } catch (err: any) {
              console.warn(`Could not insert item ${description}: ${err.message}`);
              continue;
          }
      }

      if (itemId && closingStock > 0) {
        // Insert opening balance transaction
        await client.query(
          `INSERT INTO inventory_transactions (item_id, transaction_type, quantity, recorded_by, notes) VALUES ($1, 'Inward', $2, 'System Migration', 'Opening Balance from Excel (Closing Stock)')`,
          [itemId, closingStock]
        );
      }
    }
    
    console.log(`Migration completed! Added ${itemsAdded} new items and their stock balances.`);
  } catch (error) {
    console.error("Migration Failed:", error);
  } finally {
    client.release();
    pool.end();
  }
}

migrate().catch(console.error);
