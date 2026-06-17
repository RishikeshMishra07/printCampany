import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const { rows } = await pool.query(`
      SELECT 
        pr.*,
        pn.part_name as norm_part_name,
        d.client_name
      FROM paint_requests pr
      LEFT JOIN paint_norms pn ON pr.norm_id = pn.id
      LEFT JOIN deals d ON pr.deal_id = d.id
      ORDER BY pr.created_at DESC
    `);
    return NextResponse.json({ requests: rows });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const {
      deal_id, norm_id, parts_qty,
      primer_standard, primer_extra,
      topcoat_standard, topcoat_extra,
      thinner_standard, thinner_extra,
      reason, requested_by
    } = data;

    const { rows } = await pool.query(
      `INSERT INTO paint_requests (
        deal_id, norm_id, parts_qty,
        primer_standard, primer_extra,
        topcoat_standard, topcoat_extra,
        thinner_standard, thinner_extra,
        reason, requested_by, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'Pending') RETURNING *`,
      [
        deal_id || null, norm_id || null, parts_qty,
        primer_standard || 0, primer_extra || 0,
        topcoat_standard || 0, topcoat_extra || 0,
        thinner_standard || 0, thinner_extra || 0,
        reason || null, requested_by || 'Unknown'
      ]
    );

    return NextResponse.json({ request: rows[0] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
