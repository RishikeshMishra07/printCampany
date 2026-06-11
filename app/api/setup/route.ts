import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    // Create the users table
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL,
        email VARCHAR(255)
      );
    `);

    // Create Printing Records Table
    await query(`
      CREATE TABLE IF NOT EXISTS printing_records (
        id SERIAL PRIMARY KEY,
        machine_id VARCHAR(50),
        material VARCHAR(50),
        duration_mins INT,
        status VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create QC Inspections Table
    await query(`
      CREATE TABLE IF NOT EXISTS qc_inspections (
        id SERIAL PRIMARY KEY,
        part_id VARCHAR(50),
        inspector_id VARCHAR(50),
        defect_type VARCHAR(100),
        status VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create Dispatch Logs Table
    await query(`
      CREATE TABLE IF NOT EXISTS dispatch_logs (
        id SERIAL PRIMARY KEY,
        order_id VARCHAR(50),
        client_name VARCHAR(100),
        courier VARCHAR(50),
        status VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Car Painting: Paint Shop Batches Table
    await query(`
      CREATE TABLE IF NOT EXISTS paint_batches (
        id SERIAL PRIMARY KEY,
        batch_id VARCHAR(50) UNIQUE,
        part_name VARCHAR(100),
        total_qty INT,
        completed_qty INT DEFAULT 0,
        in_progress_qty INT DEFAULT 0,
        stage VARCHAR(50) DEFAULT 'Prepping',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Car Painting: QC Inspections Table
    await query(`
      CREATE TABLE IF NOT EXISTS qc_paint_inspections (
        id SERIAL PRIMARY KEY,
        batch_id VARCHAR(50) REFERENCES paint_batches(batch_id),
        inspected_qty INT,
        passed_qty INT,
        rework_qty INT,
        defect_reason VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Car Painting: Dispatch Shipments Table
    await query(`
      CREATE TABLE IF NOT EXISTS dispatch_shipments (
        id SERIAL PRIMARY KEY,
        batch_id VARCHAR(50) REFERENCES paint_batches(batch_id),
        rack_id VARCHAR(50),
        client_name VARCHAR(100),
        status VARCHAR(50) DEFAULT 'Packed',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    return NextResponse.json({ 
      message: 'Database setup complete. Department and workflow tables created.',
      success: true
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
