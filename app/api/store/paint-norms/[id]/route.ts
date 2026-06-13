import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { part_name, primer_litres, topcoat_litres, thinner_litres, labour_hours, notes } = await req.json();
    const { rows } = await pool.query(
      `UPDATE paint_norms SET part_name=$1, primer_litres=$2, topcoat_litres=$3, thinner_litres=$4, labour_hours=$5, notes=$6 WHERE id=$7 RETURNING *`,
      [part_name, primer_litres, topcoat_litres, thinner_litres, labour_hours, notes, id]
    );
    return NextResponse.json({ norm: rows[0] });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await pool.query('DELETE FROM paint_norms WHERE id=$1', [id]);
    return NextResponse.json({ success: true });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
