import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const department = searchParams.get('department'); // e.g. 'Printing', 'QC', 'Dispatch'

    // Get all items that have a positive production_remaining balance
    const query = `
      SELECT 
        i.id as item_id, 
        i.name, 
        i.category, 
        i.unit_of_measure,
        i.project,
        SUM(t.production_remaining) as total_remaining
      FROM items i
      JOIN inventory_transactions t ON i.id = t.item_id
      WHERE t.transaction_type = 'Issue' 
        AND t.production_remaining > 0
        AND t.status = 'Approved'
      GROUP BY i.id, i.name, i.category, i.unit_of_measure, i.project
      HAVING SUM(t.production_remaining) > 0
      ORDER BY i.name ASC;
    `;
    const { rows } = await pool.query(query);
    return NextResponse.json({ success: true, stock: rows });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { item_id, consumed_qty, recorded_by, department } = body;

    if (!item_id || !consumed_qty || consumed_qty <= 0) {
      return NextResponse.json({ error: 'Invalid input parameters' }, { status: 400 });
    }

    // Begin Transaction
    await pool.query('BEGIN');

    // 1. Get the oldest issue transactions for this item that have remaining stock
    const { rows: issues } = await pool.query(
      `SELECT id, production_remaining 
       FROM inventory_transactions 
       WHERE item_id = $1 
         AND transaction_type = 'Issue' 
         AND production_remaining > 0 
         AND status = 'Approved'
       ORDER BY created_at ASC`,
      [item_id]
    );

    let qtyToDeduct = parseFloat(consumed_qty);

    // Calculate total available to see if they are trying to consume more than they have
    const totalAvailable = issues.reduce((sum, issue) => sum + parseFloat(issue.production_remaining), 0);
    if (qtyToDeduct > totalAvailable) {
      await pool.query('ROLLBACK');
      return NextResponse.json({ error: 'Cannot consume more than available remaining stock' }, { status: 400 });
    }

    // 2. Deduct from the oldest issues first (FIFO)
    for (const issue of issues) {
      if (qtyToDeduct <= 0) break;

      const issueRemaining = parseFloat(issue.production_remaining);
      const deductAmount = Math.min(issueRemaining, qtyToDeduct);

      await pool.query(
        `UPDATE inventory_transactions 
         SET production_remaining = production_remaining - $1 
         WHERE id = $2`,
        [deductAmount, issue.id]
      );

      qtyToDeduct -= deductAmount;
    }

    // 3. Create a Consumption record
    const note = `Consumed ${consumed_qty} from Production Remaining Stock`;
    await pool.query(
      `INSERT INTO inventory_transactions 
       (item_id, transaction_type, quantity, recorded_by, status, notes)
       VALUES ($1, 'Production Consumption', $2, $3, 'Approved', $4)`,
      [item_id, consumed_qty, recorded_by || 'Production User', note]
    );

    await pool.query('COMMIT');

    return NextResponse.json({ success: true, message: 'Stock consumed successfully' });
  } catch (error: any) {
    await pool.query('ROLLBACK');
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
