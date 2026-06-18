import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    const query = `
      SELECT u.employee_id, u.name, d.name as department_name
      FROM users u
      JOIN departments d ON u.department_id = d.id
      WHERE d.name IN ('Production', 'Printing', 'Quality Control (QC)', 'Dispatch')
      ORDER BY u.name ASC
    `;
    const { rows } = await pool.query(query);
    return NextResponse.json({ success: true, users: rows });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
