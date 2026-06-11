import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const res = await query(`SELECT * FROM paint_batches ORDER BY created_at DESC`);
    return NextResponse.json({ success: true, batches: res.rows });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { batch_id, part_name, total_qty } = body;
    
    await query(`
      INSERT INTO paint_batches (batch_id, part_name, total_qty) 
      VALUES ($1, $2, $3)
    `, [batch_id, part_name, total_qty]);
    
    return NextResponse.json({ success: true, message: 'Batch added successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { batch_id, completed_qty, in_progress_qty, stage } = body;
    
    await query(`
      UPDATE paint_batches 
      SET completed_qty = $1, in_progress_qty = $2, stage = $3 
      WHERE batch_id = $4
    `, [completed_qty, in_progress_qty, stage, batch_id]);
    
    return NextResponse.json({ success: true, message: 'Batch updated successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
