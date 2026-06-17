import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { name, category, unit_of_measure, min_stock_level, project, new_rate, old_rate } = await req.json();
    const { rows } = await pool.query(
      `UPDATE items SET name=$1, category=$2, unit_of_measure=$3, min_stock_level=$4, project=$5, new_rate=$6, old_rate=$7 WHERE id=$8 RETURNING *`,
      [name, category, unit_of_measure, min_stock_level, project, new_rate, old_rate, id]
    );
    return NextResponse.json({ item: rows[0] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
