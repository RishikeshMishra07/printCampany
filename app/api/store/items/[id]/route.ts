import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { name, category, unit_of_measure, min_stock_level } = await req.json();
    const { rows } = await pool.query(
      `UPDATE items SET name=$1, category=$2, unit_of_measure=$3, min_stock_level=$4 WHERE id=$5 RETURNING *`,
      [name, category, unit_of_measure, min_stock_level, id]
    );
    return NextResponse.json({ item: rows[0] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
