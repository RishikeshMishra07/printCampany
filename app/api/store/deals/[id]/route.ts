import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { status } = await req.json();
    const { rows } = await pool.query(
      'UPDATE deals SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );
    return NextResponse.json({ deal: rows[0] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
