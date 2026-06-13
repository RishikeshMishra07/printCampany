import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(`
      -- Paint Norms: standard paint usage per part type
      CREATE TABLE IF NOT EXISTS paint_norms (
        id SERIAL PRIMARY KEY,
        part_name VARCHAR(200) NOT NULL,
        primer_litres NUMERIC(8,3) DEFAULT 0,
        topcoat_litres NUMERIC(8,3) DEFAULT 0,
        thinner_litres NUMERIC(8,3) DEFAULT 0,
        labour_hours NUMERIC(6,2) DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Vendors/Suppliers master
      CREATE TABLE IF NOT EXISTS vendors (
        id SERIAL PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        contact_person VARCHAR(200),
        phone VARCHAR(30),
        email VARCHAR(200),
        address TEXT,
        items_supplied TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Purchase Requests
      CREATE TABLE IF NOT EXISTS purchase_requests (
        id SERIAL PRIMARY KEY,
        item_id INTEGER REFERENCES items(id),
        vendor_id INTEGER REFERENCES vendors(id),
        requested_qty NUMERIC(12,3) NOT NULL,
        unit_of_measure VARCHAR(50),
        reason TEXT,
        status VARCHAR(20) DEFAULT 'Pending',
        raised_by VARCHAR(200),
        approved_by VARCHAR(200),
        approved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Part Batches (WIP tracking)
      CREATE TABLE IF NOT EXISTS part_batches (
        id SERIAL PRIMARY KEY,
        batch_no VARCHAR(100) NOT NULL,
        deal_id INTEGER REFERENCES deals(id),
        part_name VARCHAR(200),
        qty_received INTEGER DEFAULT 0,
        qty_in_painting INTEGER DEFAULT 0,
        qty_qc INTEGER DEFAULT 0,
        qty_dispatched INTEGER DEFAULT 0,
        qty_rejected INTEGER DEFAULT 0,
        current_stage VARCHAR(50) DEFAULT 'Received',
        vehicle_no VARCHAR(50),
        notes TEXT,
        created_by VARCHAR(200),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Outward Challans
      CREATE TABLE IF NOT EXISTS challans (
        id SERIAL PRIMARY KEY,
        challan_no VARCHAR(100) UNIQUE NOT NULL,
        deal_id INTEGER REFERENCES deals(id),
        vehicle_no VARCHAR(50),
        driver_name VARCHAR(200),
        driver_phone VARCHAR(30),
        items_json JSONB DEFAULT '[]',
        total_qty INTEGER DEFAULT 0,
        status VARCHAR(20) DEFAULT 'Draft',
        created_by VARCHAR(200),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Client Returns / Rejections
      CREATE TABLE IF NOT EXISTS client_returns (
        id SERIAL PRIMARY KEY,
        deal_id INTEGER REFERENCES deals(id),
        item_id INTEGER REFERENCES items(id),
        challan_ref VARCHAR(100),
        qty_returned INTEGER NOT NULL,
        reason VARCHAR(500),
        return_type VARCHAR(50) DEFAULT 'Rejection',
        action_taken VARCHAR(200),
        recorded_by VARCHAR(200),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Physical Stock Count sessions
      CREATE TABLE IF NOT EXISTS stock_counts (
        id SERIAL PRIMARY KEY,
        count_date DATE NOT NULL DEFAULT CURRENT_DATE,
        status VARCHAR(20) DEFAULT 'Open',
        counted_by VARCHAR(200),
        verified_by VARCHAR(200),
        notes TEXT,
        items_json JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        closed_at TIMESTAMP
      );
    `);
    console.log('✅ All new tables created successfully!');

    // Seed paint norms
    const norms = [
      { part: 'Car Bumper — Front', primer: 0.5, topcoat: 0.8, thinner: 0.3, labour: 0.5 },
      { part: 'Car Bumper — Rear',  primer: 0.4, topcoat: 0.7, thinner: 0.25, labour: 0.4 },
      { part: 'Car Door Panel',     primer: 0.3, topcoat: 0.5, thinner: 0.2,  labour: 0.3 },
      { part: 'Car Hood',           primer: 0.7, topcoat: 1.0, thinner: 0.4,  labour: 0.8 },
      { part: 'Car Fender',         primer: 0.25,topcoat: 0.4, thinner: 0.15, labour: 0.3 },
      { part: 'Car Trunk Lid',      primer: 0.5, topcoat: 0.8, thinner: 0.3,  labour: 0.5 },
      { part: 'Side Mirror',        primer: 0.05,topcoat: 0.1, thinner: 0.05, labour: 0.1 },
      { part: 'Roof Panel',         primer: 0.8, topcoat: 1.2, thinner: 0.5,  labour: 1.0 },
    ];
    for (const n of norms) {
      await client.query(
        `INSERT INTO paint_norms (part_name, primer_litres, topcoat_litres, thinner_litres, labour_hours)
         VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
        [n.part, n.primer, n.topcoat, n.thinner, n.labour]
      );
      console.log(`✓ Paint norm: ${n.part}`);
    }

    // Seed vendors
    const vendors = [
      { name: 'AkzoNobel India Ltd.',      contact: 'Rajesh Sharma',  phone: '9876543210', items: 'Top Coat, Primer, Thinner' },
      { name: 'Berger Paints India Ltd.',   contact: 'Sunil Kumar',    phone: '9876543211', items: 'Top Coat, Primer' },
      { name: 'Asian Paints PPG',           contact: 'Priya Verma',    phone: '9876543212', items: 'Specialty Coatings, Thinner' },
      { name: 'Kansai Nerolac Paints Ltd.', contact: 'Anil Singh',     phone: '9876543213', items: 'Primer, Top Coat' },
    ];
    for (const v of vendors) {
      await client.query(
        `INSERT INTO vendors (name, contact_person, phone, items_supplied) VALUES ($1,$2,$3,$4)`,
        [v.name, v.contact, v.phone, v.items]
      );
      console.log(`✓ Vendor: ${v.name}`);
    }

    console.log('\n✅ Migration + seed complete!');
  } finally {
    client.release();
    pool.end();
  }
}

migrate().catch(console.error);
