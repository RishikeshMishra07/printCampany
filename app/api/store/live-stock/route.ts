import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    // Basic inventory calculation: (Inward) - (Issue + Outward + Scrap)
    const query = `
      SELECT 
        i.id,
        i.name,
        i.category,
        i.unit_of_measure,
        i.min_stock_level,
        COALESCE(SUM(CASE WHEN t.transaction_type = 'Inward' THEN t.quantity ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN t.transaction_type IN ('Issue', 'Outward', 'Scrap') THEN t.quantity ELSE 0 END), 0) as current_qty
      FROM items i
      LEFT JOIN inventory_transactions t ON i.id = t.item_id
      GROUP BY i.id
      ORDER BY i.name ASC;
    `;
    const { rows } = await pool.query(query);
    return NextResponse.json({ stock: rows });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
