import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    const { rows } = await pool.query(`SELECT * FROM paint_norms ORDER BY part_name ASC`);
    return NextResponse.json({ norms: rows });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

export async function POST(req: Request) {
  try {
    const { part_name, primer_litres, topcoat_litres, thinner_litres, labour_hours, notes } = await req.json();
    const { rows } = await pool.query(
      `INSERT INTO paint_norms (part_name, primer_litres, topcoat_litres, thinner_litres, labour_hours, notes)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [part_name, primer_litres, topcoat_litres, thinner_litres, labour_hours, notes]
    );
    return NextResponse.json({ norm: rows[0] }, { status: 201 });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
