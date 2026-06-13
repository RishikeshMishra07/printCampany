import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    const { rows } = await pool.query(`
      SELECT u.id, u.employee_id, u.name, u.username, u.role, d.name as department_name
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      ORDER BY u.role DESC, u.name ASC
    `);
    return NextResponse.json({ users: rows });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { employee_id, name, username, password, role, department_id } = await req.json();
    const { rows } = await pool.query(
      `INSERT INTO users (employee_id, name, username, password, role, department_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, employee_id, name, username, role`,
      [employee_id, name, username, password, role, department_id || null]
    );
    return NextResponse.json({ user: rows[0] }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
