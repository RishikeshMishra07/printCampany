import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { rows } = await pool.query(`
      SELECT pb.*, d.client_name
      FROM part_batches pb
      LEFT JOIN deals d ON pb.deal_id = d.id
      ORDER BY pb.created_at DESC LIMIT 100`);
    return NextResponse.json({ batches: rows });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

export async function POST(req: Request) {
  try {
    const { batch_no, deal_id, part_name, qty_received, vehicle_no, notes, created_by } = await req.json();
    const { rows } = await pool.query(
      `INSERT INTO part_batches (batch_no, deal_id, part_name, qty_received, qty_in_painting, vehicle_no, notes, created_by, current_stage)
       VALUES ($1,$2,$3,$4,0,$5,$6,$7,'Received') RETURNING *`,
      [batch_no, deal_id || null, part_name, qty_received, vehicle_no, notes, created_by]
    );
    return NextResponse.json({ batch: rows[0] }, { status: 201 });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
