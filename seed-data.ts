import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function seed() {
  const client = await pool.connect();
  try {
    // Seed items
    const items = [
      { name: 'Red Oxide Primer',    category: 'Paint',      unit: 'Litres', min: 20 },
      { name: 'Top Coat — White',    category: 'Paint',      unit: 'Litres', min: 15 },
      { name: 'Top Coat — Black',    category: 'Paint',      unit: 'Litres', min: 15 },
      { name: 'Thinner (Nitro)',     category: 'Paint',      unit: 'Litres', min: 10 },
      { name: 'Masking Tape (25mm)', category: 'Consumable', unit: 'Rolls',  min: 5  },
      { name: 'Sandpaper (P400)',    category: 'Consumable', unit: 'Nos',    min: 50 },
      { name: 'Car Bumper — Front',  category: 'Raw Part',   unit: 'Nos',    min: 0  },
      { name: 'Car Door Panel',      category: 'Raw Part',   unit: 'Nos',    min: 0  },
      { name: 'Car Hood',            category: 'Raw Part',   unit: 'Nos',    min: 0  },
    ];

    for (const i of items) {
      await client.query(
        `INSERT INTO items (name, category, unit_of_measure, min_stock_level) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
        [i.name, i.category, i.unit, i.min]
      );
      console.log(`✓ Item: ${i.name}`);
    }

    // Get item IDs
    const { rows: itemRows } = await client.query(`SELECT id, name FROM items`);
    const getItem = (name: string) => itemRows.find(r => r.name.includes(name))?.id;

    // Seed deals
    const deals = [
      { client: 'Maruti Suzuki Ltd.',  type: 'Open',   item: 'Bumper', target: null, budget: 0.5 },
      { client: 'Tata Motors',         type: 'Closed', item: 'Hood',   target: 5000, budget: 0.3 },
      { client: 'Hyundai India',       type: 'Open',   item: 'Door',   target: null, budget: 0.4 },
    ];

    for (const d of deals) {
      const itemId = getItem(d.item);
      await client.query(
        `INSERT INTO deals (client_name, deal_type, item_id, target_qty, per_part_paint_budget) VALUES ($1,$2,$3,$4,$5)`,
        [d.client, d.type, itemId || null, d.target, d.budget]
      );
      console.log(`✓ Deal: ${d.client} (${d.type})`);
    }

    // Seed transactions
    const { rows: dealRows } = await client.query(`SELECT id, client_name FROM deals`);
    const getDeal = (client: string) => dealRows.find(r => r.client_name.includes(client))?.id;

    const txns = [
      // Inward — paints received from vendor
      { item: 'Red Oxide', type: 'Inward',  qty: 100, deal: null,      by: 'Mohan (Store)', notes: 'Received from XYZ Paints Pvt Ltd' },
      { item: 'Top Coat — White', type: 'Inward', qty: 80, deal: null, by: 'Mohan (Store)', notes: 'Vendor: AkzoNobel' },
      { item: 'Top Coat — Black', type: 'Inward', qty: 60, deal: null, by: 'Mohan (Store)', notes: '' },
      { item: 'Thinner',  type: 'Inward',  qty: 50,  deal: null,      by: 'Mohan (Store)', notes: '' },
      { item: 'Masking',  type: 'Inward',  qty: 30,  deal: null,      by: 'Mohan (Store)', notes: '' },
      { item: 'Sandpaper',type: 'Inward',  qty: 200, deal: null,      by: 'Mohan (Store)', notes: '' },
      // Client parts inward
      { item: 'Bumper',   type: 'Inward',  qty: 500, deal: 'Maruti',  by: 'Mohan (Store)', notes: 'Truck MH04-AB-5678' },
      { item: 'Hood',     type: 'Inward',  qty: 300, deal: 'Tata',    by: 'Mohan (Store)', notes: 'Truck MH12-XY-9090' },
      { item: 'Door',     type: 'Inward',  qty: 800, deal: 'Hyundai', by: 'Mohan (Store)', notes: '' },
      // Issue to production
      { item: 'Red Oxide', type: 'Issue',  qty: 30,  deal: 'Maruti',  by: 'Mohan (Store)', notes: 'Lot #1 — Morning Shift' },
      { item: 'Top Coat — White', type: 'Issue', qty: 20, deal: 'Tata', by: 'Mohan (Store)', notes: 'Lot #2' },
      { item: 'Thinner',  type: 'Issue',   qty: 10,  deal: null,      by: 'Mohan (Store)', notes: '' },
      // Outward (dispatched)
      { item: 'Bumper',   type: 'Outward', qty: 180, deal: 'Maruti',  by: 'Mohan (Store)', notes: 'Challan CH-2025-001, Driver: Suresh' },
      { item: 'Hood',     type: 'Outward', qty: 200, deal: 'Tata',    by: 'Mohan (Store)', notes: 'Challan CH-2025-002' },
      // Scrap
      { item: 'Bumper',   type: 'Scrap',   qty: 5,   deal: 'Maruti',  by: 'Mohan (Store)', notes: 'QC reject — surface damage' },
    ];

    for (const tx of txns) {
      const itemId = getItem(tx.item);
      const dealId = tx.deal ? getDeal(tx.deal) : null;
      if (!itemId) { console.log(`⚠ Skipping (item not found): ${tx.item}`); continue; }
      await client.query(
        `INSERT INTO inventory_transactions (item_id, transaction_type, quantity, deal_id, recorded_by, notes) VALUES ($1,$2,$3,$4,$5,$6)`,
        [itemId, tx.type, tx.qty, dealId || null, tx.by, tx.notes]
      );
      console.log(`✓ Transaction: ${tx.type} — ${tx.item} (${tx.qty})`);
    }

    console.log('\n✅ All seed data inserted successfully!');
  } finally {
    client.release();
    pool.end();
  }
}

seed().catch(console.error);
