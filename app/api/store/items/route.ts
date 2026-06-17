import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    const { rows } = await pool.query('SELECT * FROM items ORDER BY created_at DESC');
    return NextResponse.json({ items: rows });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { name, category, unit_of_measure, min_stock_level, project, new_rate, old_rate } = await req.json();
    const { rows } = await pool.query(
      'INSERT INTO items (name, category, unit_of_measure, min_stock_level, project, new_rate, old_rate) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [name, category, unit_of_measure, min_stock_level, project, new_rate, old_rate]
    );
    return NextResponse.json({ item: rows[0] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
