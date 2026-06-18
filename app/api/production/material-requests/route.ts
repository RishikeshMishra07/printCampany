import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const department = searchParams.get('department'); // Optional filter

    let query = `
      SELECT m.*, i.name as item_name, i.unit_of_measure, i.category 
      FROM material_requests m
      JOIN items i ON m.item_id = i.id
    `;
    const params: any[] = [];

    if (department) {
      query += ` WHERE m.department = $1 `;
      params.push(department);
    }

    query += ` ORDER BY m.created_at DESC`;

    const { rows } = await pool.query(query, params);
    return NextResponse.json({ success: true, requests: rows });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { item_id, department, requested_qty, reason, requested_by } = body;

    if (!item_id || !department || !requested_qty) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { rows } = await pool.query(
      `INSERT INTO material_requests 
       (item_id, department, requested_qty, reason, requested_by, status)
       VALUES ($1, $2, $3, $4, $5, 'Pending') RETURNING *`,
      [item_id, department, requested_qty, reason, requested_by]
    );

    return NextResponse.json({ success: true, request: rows[0] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
