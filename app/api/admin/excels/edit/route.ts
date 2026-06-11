import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { cookies } from 'next/headers';
import { logAudit } from '@/lib/audit';

async function checkAdmin() {
  const cookieStore = await cookies();
  const sessionStr = cookieStore.get('auth_session')?.value;
  if (!sessionStr) return null;
  try {
    const session = JSON.parse(sessionStr);
    return session.role === 'admin' ? session : null;
  } catch (e) {
    return null;
  }
}

export async function POST(req: Request) {
  const admin = await checkAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  try {
    const { id } = await req.json();

    if (!id) return NextResponse.json({ error: 'Job ID missing' }, { status: 400 });

    const jobCheck = await query('SELECT file_path FROM upload_jobs WHERE id = $1', [id]);
    if (jobCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    await query('UPDATE upload_jobs SET is_edited_by_admin = true WHERE id = $1', [id]);

    await logAudit(
      'EDIT_EXCEL_FLAG',
      'EXCEL_BATCH',
      id,
      admin.username,
      { file_path: jobCheck.rows[0].file_path, action_by_emp_id: admin.employee_id }
    );

    return NextResponse.json({ success: true, message: 'Job marked as edited by admin successfully.' });
  } catch (error: any) {
    console.error('Error updating excel job:', error);
    return NextResponse.json({ success: false, error: 'Failed to update Excel record' }, { status: 500 });
  }
}
