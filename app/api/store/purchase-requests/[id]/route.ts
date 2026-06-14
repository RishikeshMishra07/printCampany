import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { status, approved_by } = await req.json();
    const { rows } = await pool.query(
      `UPDATE purchase_requests SET status=$1, approved_by=$2, approved_at=CASE WHEN $4 IN ('Approved','Rejected') THEN NOW() ELSE NULL END WHERE id=$3 RETURNING *`,
      [status, approved_by || null, id, status]
    );
    return NextResponse.json({ request: rows[0] });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
