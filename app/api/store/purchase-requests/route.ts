import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const { rows } = await pool.query(`
      SELECT pr.*, i.name as item_name, i.unit_of_measure, v.name as vendor_name
      FROM purchase_requests pr
      LEFT JOIN items i ON pr.item_id = i.id
      LEFT JOIN vendors v ON pr.vendor_id = v.id
      ORDER BY pr.created_at DESC LIMIT $1`, [limit]);
    return NextResponse.json({ requests: rows });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

export async function POST(req: Request) {
  try {
    const { item_id, vendor_id, requested_qty, unit_of_measure, reason, raised_by } = await req.json();
    const { rows } = await pool.query(
      `INSERT INTO purchase_requests (item_id, vendor_id, requested_qty, unit_of_measure, reason, raised_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [item_id, vendor_id || null, requested_qty, unit_of_measure, reason, raised_by]
    );
    return NextResponse.json({ request: rows[0] }, { status: 201 });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
