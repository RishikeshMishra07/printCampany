import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const { employee_id, password } = await request.json();

    if (!employee_id || !password) {
      return NextResponse.json({ success: false, message: 'Missing credentials' }, { status: 400 });
    }

    const result = await query(
      `SELECT id, employee_id, role FROM users WHERE employee_id = $1 AND password = $2 AND role = 'admin'`,
      [employee_id, password]
    );

    if (result.rows.length > 0) {
      // Credentials are valid. Fetch departments.
      const deptResult = await query(`SELECT id, name FROM departments ORDER BY name ASC`);
      return NextResponse.json({ 
        success: true, 
        message: 'Credentials verified', 
        departments: deptResult.rows 
      });
    } else {
      return NextResponse.json({ success: false, message: 'Invalid credentials or role mismatch' }, { status: 401 });
    }
  } catch (error: any) {
    console.error("Verify Admin Error:", error);
    return NextResponse.json({ success: false, message: 'Internal server error', error: error.message }, { status: 500 });
  }
}
