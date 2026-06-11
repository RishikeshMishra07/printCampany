import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    // 1. Get batches that passed QC and are ready to be dispatched
    const pendingRes = await query(`
      SELECT * FROM paint_batches 
      WHERE stage = 'QC Passed'
      ORDER BY created_at DESC
    `);
    
    // 2. Get active shipments
    const shipmentsRes = await query(`
      SELECT s.*, p.part_name, p.total_qty 
      FROM dispatch_shipments s
      JOIN paint_batches p ON s.batch_id = p.batch_id
      ORDER BY s.created_at DESC
      LIMIT 20
    `);

    return NextResponse.json({ 
      success: true, 
      readyToPack: pendingRes.rows,
      shipments: shipmentsRes.rows 
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { batch_id, rack_id, client_name } = body;
    
    // 1. Log the shipment
    await query(`
      INSERT INTO dispatch_shipments (batch_id, rack_id, client_name, status) 
      VALUES ($1, $2, $3, 'In Transit')
    `, [batch_id, rack_id, client_name]);
    
    // 2. Update the paint_batch stage to Dispatched
    await query(`
      UPDATE paint_batches 
      SET stage = 'Dispatched' 
      WHERE batch_id = $1
    `, [batch_id]);

    return NextResponse.json({ success: true, message: 'Shipment logged and dispatched' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
