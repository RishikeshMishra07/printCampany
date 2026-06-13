import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const { rows } = await pool.query(`
      SELECT t.*, i.name as item_name, i.category, i.unit_of_measure, d.client_name
      FROM inventory_transactions t
      LEFT JOIN items i ON t.item_id = i.id
      LEFT JOIN deals d ON t.deal_id = d.id
      WHERE t.created_at::date = $1
      ORDER BY t.created_at DESC`, [date]);

    const summary = {
      date,
      total: rows.length,
      inward:  rows.filter(r => r.transaction_type === 'Inward').reduce((a: number, b: any) => a + parseFloat(b.quantity), 0),
      issue:   rows.filter(r => r.transaction_type === 'Issue').reduce((a: number, b: any) => a + parseFloat(b.quantity), 0),
      outward: rows.filter(r => r.transaction_type === 'Outward').reduce((a: number, b: any) => a + parseFloat(b.quantity), 0),
      scrap:   rows.filter(r => r.transaction_type === 'Scrap').reduce((a: number, b: any) => a + parseFloat(b.quantity), 0),
    };
    return NextResponse.json({ transactions: rows, summary });
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
