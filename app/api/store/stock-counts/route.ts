import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    const { rows } = await pool.query(`SELECT * FROM stock_counts ORDER BY created_at DESC LIMIT 50`);
    return NextResponse.json({ counts: rows });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

export async function POST(req: Request) {
  try {
    const { count_date, counted_by, verified_by, notes, items_json, status } = await req.json();
    const { rows } = await pool.query(
      `INSERT INTO stock_counts (count_date, counted_by, verified_by, notes, items_json, status, closed_at)
       VALUES ($1,$2,$3,$4,$5,$6, CASE WHEN $6='Closed' THEN NOW() ELSE NULL END) RETURNING *`,
      [count_date, counted_by, verified_by || null, notes || null, JSON.stringify(items_json || []), status || 'Open']
    );
    return NextResponse.json({ count: rows[0] }, { status: 201 });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
