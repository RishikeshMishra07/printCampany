import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { cookies } from 'next/headers';

export async function POST(req: Request, context: { params: any }) {
  try {
    const params = await context.params;
    const { id } = params;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Lead ID is required' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const sessionStr = cookieStore.get('auth_session')?.value;
    if (!sessionStr) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    const session = JSON.parse(sessionStr);
    if (session.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden. Admin access required.' }, { status: 403 });
    }

    // Mark as non-duplicate and clear the fraud flag
    const query = `
      UPDATE dpf_records 
      SET is_duplicate = FALSE, fraud_flag = NULL 
      WHERE id = $1
    `;
    await pool.query(query, [id]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error transferring record to leads:', error);
    return NextResponse.json({ success: false, error: 'Failed to transfer record: ' + error.message }, { status: 500 });
  }
}
