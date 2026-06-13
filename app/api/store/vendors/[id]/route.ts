import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const fields = ['name', 'contact_person', 'phone', 'email', 'address', 'items_supplied', 'notes'];
    const sets = fields.map((f, i) => `${f}=$${i + 1}`).join(', ');
    const vals = fields.map(f => body[f] ?? null);
    const { rows } = await pool.query(`UPDATE vendors SET ${sets} WHERE id=$${fields.length + 1} RETURNING *`, [...vals, id]);
    return NextResponse.json({ vendor: rows[0] });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await pool.query('DELETE FROM vendors WHERE id=$1', [id]);
    return NextResponse.json({ success: true });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
