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

  try {
    const res = await query('SELECT * FROM clients_master ORDER BY client_name ASC');
    return NextResponse.json({ success: true, clients: res.rows });
  } catch (error: any) {
    console.error("Fetch clients error:", error);
    return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    if (!body.client_name) {
      return NextResponse.json({ error: 'Client name is required' }, { status: 400 });
    }

    const res = await query(
      'INSERT INTO clients_master (client_name) VALUES ($1) RETURNING *',
      [body.client_name.trim()]
    );
    return NextResponse.json({ success: true, client: res.rows[0] });
  } catch (error: any) {
    console.error("Create client error:", error);
    if (error.code === '23505') {
        return NextResponse.json({ error: 'Client already exists' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create client' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Client ID is required' }, { status: 400 });
    }

    await query('DELETE FROM clients_master WHERE id = $1', [id]);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete client error:", error);
    return NextResponse.json({ error: 'Failed to delete client' }, { status: 500 });
  }
}
