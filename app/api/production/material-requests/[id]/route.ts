import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const body = await req.json();
    const { status, approved_by } = body;

    if (!['Approved', 'Rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    await pool.query('BEGIN');

    // Update status
    const { rows } = await pool.query(
      `UPDATE material_requests 
       SET status = $1, approved_by = $2 
       WHERE id = $3 RETURNING *`,
      [status, approved_by || 'Admin', params.id]
    );

    if (rows.length === 0) {
      await pool.query('ROLLBACK');
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    const request = rows[0];

    // If approved, automatically issue stock
    if (status === 'Approved') {
      const note = `Auto-issued from Material Request #${request.id} for ${request.department}`;
      await pool.query(
        `INSERT INTO inventory_transactions 
         (item_id, transaction_type, quantity, recorded_by, status, notes)
         VALUES ($1, 'Issue', $2, $3, 'Approved', $4)`,
        [request.item_id, request.requested_qty, approved_by || 'Admin', note]
      );
    }

    await pool.query('COMMIT');

    return NextResponse.json({ success: true, request });
  } catch (error: any) {
    await pool.query('ROLLBACK');
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
