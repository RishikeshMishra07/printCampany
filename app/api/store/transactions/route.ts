import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    const { rows } = await pool.query(`
      SELECT 
        t.*,
        i.name as item_name,
        i.category,
        i.unit_of_measure,
        d.client_name
      FROM inventory_transactions t
      LEFT JOIN items i ON t.item_id = i.id
      LEFT JOIN deals d ON t.deal_id = d.id
      ORDER BY t.created_at DESC
      LIMIT $1
    `, [limit]);

    return NextResponse.json({ transactions: rows });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { item_id, transaction_type, quantity, deal_id, recorded_by, notes } = await req.json();
    const { rows } = await pool.query(
      `INSERT INTO inventory_transactions (item_id, transaction_type, quantity, deal_id, recorded_by, notes)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [item_id, transaction_type, quantity, deal_id || null, recorded_by || null, notes || null]
    );
    return NextResponse.json({ transaction: rows[0] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
