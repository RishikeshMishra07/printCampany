import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    const { rows } = await pool.query(`SELECT * FROM vendors ORDER BY name ASC`);
    return NextResponse.json({ vendors: rows });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

export async function POST(req: Request) {
  try {
    const { name, contact_person, phone, email, address, items_supplied, notes } = await req.json();
    const { rows } = await pool.query(
      `INSERT INTO vendors (name, contact_person, phone, email, address, items_supplied, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [name, contact_person, phone, email, address, items_supplied, notes]
    );
    return NextResponse.json({ vendor: rows[0] }, { status: 201 });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
