import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    const { rows } = await pool.query(`
      SELECT 
        c.*, d.client_name,
        cr.qty_returned, cr.reason as return_reason
      FROM challans c
      LEFT JOIN deals d ON c.deal_id = d.id
      LEFT JOIN client_returns cr ON cr.challan_ref = c.challan_no
      ORDER BY c.created_at DESC LIMIT 100`);
    return NextResponse.json({ challans: rows });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

export async function POST(req: Request) {
  try {
    const { deal_id, vehicle_no, driver_name, driver_phone, items_json, total_qty, created_by } = await req.json();
    // Auto-generate challan number
    const { rows: countRows } = await pool.query(`SELECT COUNT(*) FROM challans`);
    const count = parseInt(countRows[0].count) + 1;
    const challan_no = `CH-${new Date().getFullYear()}-${String(count).padStart(4, '0')}`;

    const { rows } = await pool.query(
      `INSERT INTO challans (challan_no, deal_id, vehicle_no, driver_name, driver_phone, items_json, total_qty, created_by, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'Final') RETURNING *`,
      [challan_no, deal_id || null, vehicle_no, driver_name, driver_phone, JSON.stringify(items_json || []), total_qty || 0, created_by]
    );
    return NextResponse.json({ challan: rows[0] }, { status: 201 });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
