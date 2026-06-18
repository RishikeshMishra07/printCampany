import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const floor = searchParams.get('floor');

    let query = `
      SELECT w.*, u.name as assigned_to_name, b.part_name, b.part_no, b.unit
      FROM work_assignments w
      LEFT JOIN users u ON w.assigned_to = u.employee_id
      LEFT JOIN production_bom b ON w.bom_id = b.id
    `;
    const params: any[] = [];

    if (floor) {
      query += ` WHERE w.floor_name = $1`;
      params.push(floor);
    }

    query += ` ORDER BY w.created_at DESC`;

    const { rows } = await pool.query(query, params);
    return NextResponse.json({ success: true, assignments: rows });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { floor_name, assigned_to, bom_id, task_description, target_qty, assigned_by } = body;

    if (!floor_name || !assigned_to) {
      return NextResponse.json({ error: 'floor_name and assigned_to are required' }, { status: 400 });
    }

    const query = `
      INSERT INTO work_assignments 
        (floor_name, assigned_to, bom_id, task_description, target_qty, assigned_by) 
      VALUES ($1, $2, $3, $4, $5, $6) 
      RETURNING *
    `;
    const params = [
      floor_name,
      assigned_to,
      bom_id || null,
      task_description || null,
      target_qty || null,
      assigned_by || null
    ];

    const { rows } = await pool.query(query, params);
    return NextResponse.json({ success: true, assignment: rows[0] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
