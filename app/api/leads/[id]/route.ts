import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { cookies } from 'next/headers';

async function checkAdmin() {
  const cookieStore = await cookies();
  const sessionStr = cookieStore.get('auth_session')?.value;
  if (!sessionStr) return false;
  try {
    const session = JSON.parse(sessionStr);
    return session.role === 'admin';
  } catch (e) {
    return false;
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await checkAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;

  try {
    const body = await req.json();
    const { 
      account_no, employee_code, name, client, product, bucket, location, 
      outstanding, payment_mode, tl_name, agent, aph, ph, phone_no 
    } = body;

    const query = `
      UPDATE dpf_records SET
        account_no = $1, employee_code = $2, employee_name = $3, client = $4, product = $5, 
        bucket = $6, location = $7, money_collected = $8, payment_mode = $9, tl_name = $10, 
        am = $11, aph = $12, ph = $13, phone_no = $14
      WHERE id = $15
      RETURNING id
    `;
    const values = [
      account_no, employee_code, name, client, product, bucket, location,
      outstanding ? Number(outstanding) : 0, payment_mode, tl_name, agent, aph, ph, phone_no, id
    ];

    const res = await pool.query(query, values);
    if (res.rowCount === 0) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Record updated successfully' });
  } catch (error: any) {
    console.error('Error updating record:', error);
    return NextResponse.json({ error: 'Failed to update record: ' + error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await checkAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;

  try {
    const res = await pool.query('DELETE FROM dpf_records WHERE id = $1', [id]);
    if (res.rowCount === 0) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Record deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting record:', error);
    return NextResponse.json({ error: 'Failed to delete record: ' + error.message }, { status: 500 });
  }
}
