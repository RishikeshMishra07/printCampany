import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    const { rows } = await pool.query(`
      SELECT 
        d.*,
        i.name as item_name,
        i.unit_of_measure,
        COALESCE(SUM(CASE WHEN t.transaction_type = 'Outward' THEN t.quantity ELSE 0 END), 0) as dispatched_qty
      FROM deals d
      LEFT JOIN items i ON d.item_id = i.id
      LEFT JOIN inventory_transactions t ON d.id = t.deal_id
      GROUP BY d.id, i.name, i.unit_of_measure
      ORDER BY d.created_at DESC
    `);
    return NextResponse.json({ deals: rows });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { client_name, deal_type, item_id, target_qty, per_part_paint_budget } = await req.json();
    const { rows } = await pool.query(
      `INSERT INTO deals (client_name, deal_type, item_id, target_qty, per_part_paint_budget)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [client_name, deal_type, item_id || null, target_qty || null, per_part_paint_budget || null]
    );
    return NextResponse.json({ deal: rows[0] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
