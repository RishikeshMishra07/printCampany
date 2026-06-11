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

export async function GET(req: Request) {
  if (!(await checkAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  try {
    const { searchParams } = new URL(req.url);
    const monthStr = searchParams.get('month');
    const yearStr = searchParams.get('year');

    let queryText = `
      SELECT id, file_path, status, total_rows, processed_rows, 
      TO_CHAR(created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as created_at, 
      TO_CHAR(upload_at, 'YYYY-MM-DD') as upload_at, uploaded_by_employee_id, uploaded_by_name, target_employee_id, is_edited_by_admin, job_type
      FROM upload_jobs
    `;
    let queryParams: any[] = [];

    if (monthStr && yearStr) {
      const month = parseInt(monthStr);
      const year = parseInt(yearStr);
      queryText += ` WHERE EXTRACT(MONTH FROM COALESCE(upload_at, created_at)) = $1 AND EXTRACT(YEAR FROM COALESCE(upload_at, created_at)) = $2 `;
      queryParams.push(month, year);
    }
    
    queryText += ` ORDER BY created_at DESC`;

    const res = await query(queryText, queryParams);
    return NextResponse.json({ success: true, jobs: res.rows });
  } catch (error: any) {
    console.error('Error fetching upload jobs:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch upload jobs' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const admin = await checkAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'Job ID missing' }, { status: 400 });

    const jobCheck = await query('SELECT file_path FROM upload_jobs WHERE id = $1', [id]);
    if (jobCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const fs = require('fs');
    const path = require('path');
    const fullPath = path.join(process.cwd(), 'public', jobCheck.rows[0].file_path);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }

    await query('DELETE FROM dpf_records WHERE job_id = $1', [id]);
    await query('UPDATE upload_jobs SET status = $1 WHERE id = $2', ['DELETED_BY_ADMIN', id]);

    await logAudit(
      'DELETE_EXCEL',
      'EXCEL_BATCH',
      id,
      admin.username,
      { file_path: jobCheck.rows[0].file_path, action_by_emp_id: admin.employee_id }
    );

    return NextResponse.json({ success: true, message: 'Excel and all associated records deleted successfully.' });
  } catch (error: any) {
    console.error('Error deleting excel job:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete Excel records' }, { status: 500 });
  }
}
