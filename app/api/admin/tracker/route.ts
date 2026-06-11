import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { cookies } from 'next/headers';

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
    
    const now = new Date();
    // Default to current month/year
    const month = monthStr ? parseInt(monthStr) : now.getMonth() + 1;
    const year = yearStr ? parseInt(yearStr) : now.getFullYear();

    // Fetch users and their uploads in one go using LEFT JOIN
    // COALESCE ensures we fallback to created_at if upload_at is missing
    const query = `
      SELECT 
        u.employee_id, 
        u.name,
        u.username,
        TO_CHAR(COALESCE(uj.upload_at, uj.created_at), 'YYYY-MM-DD') as upload_date,
        uj.status as job_status,
        uj.is_edited_by_admin,
        uj.uploaded_by_employee_id
      FROM users u
      LEFT JOIN upload_jobs uj 
        ON u.employee_id = uj.target_employee_id
        AND EXTRACT(MONTH FROM COALESCE(uj.upload_at, uj.created_at)) = $1
        AND EXTRACT(YEAR FROM COALESCE(uj.upload_at, uj.created_at)) = $2
      WHERE u.role = 'user'
      ORDER BY u.name, u.username, uj.created_at DESC
    `;

    const res = await pool.query(query, [month, year]);

    // Group by user
    const usersMap: Record<string, any> = {};
    
    for (const row of res.rows) {
      const empId = row.employee_id || row.username;
      if (!usersMap[empId]) {
        usersMap[empId] = {
          employee_id: row.employee_id,
          name: row.name || row.username,
          username: row.username,
          uploads: {} // date string -> status string
        };
      }
      
      if (row.upload_date) {
        // Only set if not already set (since ordered DESC, we get latest first)
        if (!usersMap[empId].uploads[row.upload_date]) {
          let cellStatus = 'UPLOADED';
          
          if (row.job_status === 'DELETED_BY_ADMIN') {
            cellStatus = 'DELETED_BY_ADMIN';
          } else if (row.job_status === 'FAILED') {
            cellStatus = 'FAILED';
          } else if (row.uploaded_by_employee_id && row.uploaded_by_employee_id !== row.employee_id) {
            cellStatus = 'UPLOADED_BY_ADMIN';
          }
          
          usersMap[empId].uploads[row.upload_date] = cellStatus;
        }
      }
    }

    const trackerData = Object.values(usersMap);

    return NextResponse.json({ success: true, month, year, data: trackerData });

  } catch (error: any) {
    console.error('Error fetching tracker data:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch tracker data' }, { status: 500 });
  }
}
