import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { current_stage, qty_in_painting, qty_qc, qty_dispatched, qty_rejected, notes } = await req.json();
    const { rows } = await pool.query(
      `UPDATE part_batches SET current_stage=$1, qty_in_painting=COALESCE($2,qty_in_painting), qty_qc=COALESCE($3,qty_qc), qty_dispatched=COALESCE($4,qty_dispatched), qty_rejected=COALESCE($5,qty_rejected), notes=COALESCE($6,notes), updated_at=NOW() WHERE id=$7 RETURNING *`,
      [current_stage, qty_in_painting, qty_qc, qty_dispatched, qty_rejected, notes, id]
    );
    return NextResponse.json({ batch: rows[0] });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
