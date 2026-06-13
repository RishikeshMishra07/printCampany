import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { rows } = await pool.query(`
      SELECT cr.*, d.client_name, i.name as item_name, i.unit_of_measure
      FROM client_returns cr
      LEFT JOIN deals d ON cr.deal_id = d.id
      LEFT JOIN items i ON cr.item_id = i.id
      ORDER BY cr.created_at DESC`);
    return NextResponse.json({ returns: rows });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

export async function POST(req: Request) {
  try {
    const { deal_id, item_id, challan_ref, qty_returned, reason, return_type, action_taken, recorded_by } = await req.json();
    const { rows } = await pool.query(
      `INSERT INTO client_returns (deal_id, item_id, challan_ref, qty_returned, reason, return_type, action_taken, recorded_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [deal_id || null, item_id || null, challan_ref, qty_returned, reason, return_type || 'Rejection', action_taken, recorded_by]
    );
    return NextResponse.json({ return: rows[0] }, { status: 201 });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
