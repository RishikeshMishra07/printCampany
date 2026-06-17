import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const { status, approved_by } = await req.json();

    if (!['Approved', 'Rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const approvalNote = `${status} by ${approved_by || 'Admin'}`;

    const { rows } = await pool.query(
      `UPDATE inventory_transactions 
       SET status = $1,
           notes = CASE 
             WHEN notes IS NULL OR notes = '' THEN $2
             ELSE notes || ' | ' || $2
           END
       WHERE id = $3 RETURNING *`,
      [status, approvalNote, params.id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, transaction: rows[0] });
  } catch (error: any) {
    console.error('PATCH transaction error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
