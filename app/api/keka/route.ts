import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { cookies } from 'next/headers';

async function getSession() {
  const cookieStore = await cookies();
  const sessionStr = cookieStore.get('auth_session')?.value;
  if (!sessionStr) return null;
  try {
    return JSON.parse(sessionStr);
  } catch (e) {
    return null;
  }
}

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const res = await query('SELECT * FROM employee_keka_data ORDER BY updated_at DESC');
    return NextResponse.json({ success: true, data: res.rows });
  } catch (error: any) {
    console.error("Keka Fetch Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
