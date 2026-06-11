import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    // 1. Get batches ready for inspection
    const pendingRes = await query(`
      SELECT * FROM paint_batches 
      WHERE stage = 'Ready for QC'
      ORDER BY created_at DESC
    `);
    
    // 2. Get recently completed inspections
    const completedRes = await query(`
      SELECT q.*, p.part_name 
      FROM qc_paint_inspections q
      JOIN paint_batches p ON q.batch_id = p.batch_id
      ORDER BY q.created_at DESC
      LIMIT 20
    `);

    return NextResponse.json({ 
      success: true, 
      pendingBatches: pendingRes.rows,
      inspections: completedRes.rows 
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { batch_id, inspected_qty, passed_qty, rework_qty, defect_reason } = body;
    
    // 1. Log the inspection
    await query(`
      INSERT INTO qc_paint_inspections (batch_id, inspected_qty, passed_qty, rework_qty, defect_reason) 
      VALUES ($1, $2, $3, $4, $5)
    `, [batch_id, inspected_qty, passed_qty, rework_qty, defect_reason]);
    
    // 2. Update the paint_batch stage (either 'Passed QC' or 'Needs Rework')
    const nextStage = rework_qty > 0 ? 'Needs Rework' : 'QC Passed';
    await query(`
      UPDATE paint_batches 
      SET stage = $1 
      WHERE batch_id = $2
    `, [nextStage, batch_id]);

    return NextResponse.json({ success: true, message: 'Inspection logged' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
