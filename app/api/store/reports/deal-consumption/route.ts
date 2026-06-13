import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const dealId = searchParams.get('deal_id');

    let query = `
      SELECT 
        d.id as deal_id, d.client_name, d.deal_type, d.per_part_paint_budget, d.target_qty, d.status as deal_status,
        i.name as part_name,
        COALESCE(SUM(CASE WHEN t.transaction_type='Inward' THEN t.quantity ELSE 0 END),0) as total_inward,
        COALESCE(SUM(CASE WHEN t.transaction_type='Issue' THEN t.quantity ELSE 0 END),0) as total_paint_used,
        COALESCE(SUM(CASE WHEN t.transaction_type='Outward' THEN t.quantity ELSE 0 END),0) as total_dispatched,
        COALESCE(SUM(CASE WHEN t.transaction_type='Scrap' THEN t.quantity ELSE 0 END),0) as total_scrap,
        COUNT(DISTINCT CASE WHEN t.transaction_type='Outward' THEN t.id END) as dispatch_entries
      FROM deals d
      LEFT JOIN inventory_transactions t ON t.deal_id = d.id
      LEFT JOIN items i ON d.item_id = i.id
    `;
    const params: any[] = [];
    if (dealId) { query += ` WHERE d.id = $1`; params.push(dealId); }
    query += ` GROUP BY d.id, d.client_name, d.deal_type, d.per_part_paint_budget, d.target_qty, d.status, i.name ORDER BY d.client_name`;

    const { rows } = await pool.query(query, params);
    return NextResponse.json({ deals: rows });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
