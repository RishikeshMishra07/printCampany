import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const pendingOnly = searchParams.get('pending') === 'true';

    const whereClause = pendingOnly ? `WHERE t.status = 'Pending'` : '';

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
      ${whereClause}
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
    const { item_id, transaction_type, quantity, deal_id, recorded_by, notes, reference_no, user_role } = await req.json();

    // Inward entries from non-admin users go as 'Pending' — require admin approval
    const status = (transaction_type === 'Inward' && user_role !== 'admin') ? 'Pending' : 'Approved';

    const { rows } = await pool.query(
      `INSERT INTO inventory_transactions (item_id, transaction_type, quantity, deal_id, recorded_by, notes, reference_no, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [item_id, transaction_type, quantity, deal_id || null, recorded_by || null, notes || null, reference_no || null, status]
    );
    return NextResponse.json({ transaction: rows[0], status });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
