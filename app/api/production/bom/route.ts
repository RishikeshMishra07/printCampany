import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';

    let query = `SELECT * FROM production_bom`;
    const params: any[] = [];

    if (search) {
      query += ` WHERE 
        part_name ILIKE $1 OR 
        part_no ILIKE $1 OR 
        group_name ILIKE $1 OR 
        specification ILIKE $1`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY id ASC LIMIT 500`;

    const { rows } = await pool.query(query, params);
    return NextResponse.json({ success: true, items: rows });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { product_name, specification, part_name, unit, qty, group_name } = body;
    let { part_no } = body;

    if (!part_no || part_no.trim() === '') {
      // Generate a unique part number
      const timestamp = Date.now().toString().slice(-6);
      const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      part_no = `PART-${timestamp}-${random}`;
    }

    const query = `
      INSERT INTO production_bom 
        (product_name, specification, part_name, part_no, unit, qty, group_name) 
      VALUES ($1, $2, $3, $4, $5, $6, $7) 
      RETURNING *
    `;
    const params = [
      product_name || null,
      specification || null,
      part_name || null,
      part_no,
      unit || null,
      qty || 0,
      group_name || null
    ];

    const { rows } = await pool.query(query, params);
    return NextResponse.json({ success: true, item: rows[0] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
