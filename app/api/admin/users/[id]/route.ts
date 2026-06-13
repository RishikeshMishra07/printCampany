import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { employee_id, name, username, password, role, department_id } = await req.json();
    let query: string;
    let values: any[];
    if (password) {
      query = `UPDATE users SET employee_id=$1, name=$2, username=$3, password=$4, role=$5, department_id=$6 WHERE id=$7 RETURNING id`;
      values = [employee_id, name, username, password, role, department_id || null, id];
    } else {
      query = `UPDATE users SET employee_id=$1, name=$2, username=$3, role=$4, department_id=$5 WHERE id=$6 RETURNING id`;
      values = [employee_id, name, username, role, department_id || null, id];
    }
    const { rows } = await pool.query(query, values);
    return NextResponse.json({ user: rows[0] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
