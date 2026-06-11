import { NextResponse } from 'next/server';
import pool from '@/lib/db';
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

export async function GET() {
  if (!(await checkAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  try {
    const query = `
      SELECT id, employee_id, name, username, role, email, location 
      FROM users 
      ORDER BY id ASC;
    `;
    const res = await pool.query(query);
    return NextResponse.json({ users: res.rows });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const admin = await checkAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  try {
    const { userId, newPassword } = await req.json();
    
    if (!userId || !newPassword) {
      return NextResponse.json({ error: 'Missing userId or newPassword' }, { status: 400 });
    }

    const query = 'UPDATE users SET password = $1 WHERE id = $2 RETURNING id;';
    const res = await pool.query(query, [newPassword, userId]);

    if (res.rowCount === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Track Audit Log
    await logAudit(
      'UPDATE_PASSWORD',
      'USER',
      userId.toString(),
      admin.username,
      { targetUserId: userId, action_by_emp_id: admin.employee_id }
    );

    return NextResponse.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error updating password:', error);
    return NextResponse.json({ error: 'Failed to update password' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const admin = await checkAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  try {
    const { employee_id, name, username, password, role, email, location } = await req.json();

    if (!username || !password || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const checkQuery = 'SELECT id FROM users WHERE username = $1';
    const checkRes = await pool.query(checkQuery, [username]);
    if (checkRes.rows.length > 0) {
      return NextResponse.json({ error: 'Username already exists' }, { status: 400 });
    }

    const query = 'INSERT INTO users (employee_id, name, username, password, role, email, location) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, employee_id, name, username, role, email, location';
    const res = await pool.query(query, [employee_id || username, name || username, username, password, role, email || null, location || null]);
    const newUserId = res.rows[0].id;

    // Track Audit Log
    await logAudit(
      'CREATE_USER',
      'USER',
      newUserId.toString(),
      admin.username,
      { employee_id, name, username, role, email, action_by_emp_id: admin.employee_id }
    );

    return NextResponse.json({ success: true, message: 'User created successfully', user: res.rows[0] });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const admin = await checkAdmin();
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('id');

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const userRes = await pool.query('SELECT employee_id, username, role FROM users WHERE id = $1', [userId]);
    if (userRes.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    if (userRes.rows[0].role === 'admin') {
      return NextResponse.json({ error: 'Cannot delete an Admin account' }, { status: 403 });
    }
    
    const empId = userRes.rows[0].employee_id || userRes.rows[0].username;

    // Delete associated dpf_records
    await pool.query(`
      DELETE FROM dpf_records 
      WHERE job_id IN (
        SELECT id FROM upload_jobs 
        WHERE uploaded_by_employee_id = $1 OR target_employee_id = $1
      )
    `, [empId]);

    // Delete associated upload_jobs
    await pool.query(`
      DELETE FROM upload_jobs 
      WHERE uploaded_by_employee_id = $1 OR target_employee_id = $1
    `, [empId]);

    const query = 'DELETE FROM users WHERE id = $1 RETURNING id';
    const res = await pool.query(query, [userId]);

    // Track Audit Log
    await logAudit(
      'DELETE_USER',
      'USER',
      userId,
      admin.username,
      { targetUserId: userId, action_by_emp_id: admin.employee_id }
    );

    return NextResponse.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
