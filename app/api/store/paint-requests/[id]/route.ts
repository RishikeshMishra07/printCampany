import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { status, approved_by } = await req.json();

    if (!['Approved', 'Rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const { rows: reqRows } = await pool.query(
      'UPDATE paint_requests SET status = $1, approved_by = $2 WHERE id = $3 RETURNING *',
      [status, approved_by || 'Admin', id]
    );

    const request = reqRows[0];
    if (!request) return NextResponse.json({ error: 'Request not found' }, { status: 404 });

    // If approved, create the Issue transactions for Primer, Topcoat, Thinner
    if (status === 'Approved') {
      const getFirstItem = async (keyword: string) => {
        const res = await pool.query('SELECT id FROM items WHERE name ILIKE $1 LIMIT 1', [`%${keyword}%`]);
        return res.rows[0]?.id;
      };

      const primerId = await getFirstItem('Primer');
      const topcoatId = await getFirstItem('Top Coat');
      const thinnerId = await getFirstItem('Thinner');

      const transactions = [];
      const dealId = request.deal_id;
      const refNo = `PAINT-REQ-${request.id}`;

      const totalPrimer = parseFloat(request.primer_standard) + parseFloat(request.primer_extra);
      const totalTopcoat = parseFloat(request.topcoat_standard) + parseFloat(request.topcoat_extra);
      const totalThinner = parseFloat(request.thinner_standard) + parseFloat(request.thinner_extra);

      if (primerId && totalPrimer > 0) {
        transactions.push(pool.query(
          `INSERT INTO inventory_transactions (item_id, transaction_type, quantity, deal_id, recorded_by, notes, reference_no, status) VALUES ($1, 'Issue', $2, $3, $4, $5, $6, 'Approved')`,
          [primerId, totalPrimer, dealId, approved_by || 'Admin', 'Auto-issued via Paint Request', refNo]
        ));
      }
      if (topcoatId && totalTopcoat > 0) {
        transactions.push(pool.query(
          `INSERT INTO inventory_transactions (item_id, transaction_type, quantity, deal_id, recorded_by, notes, reference_no, status) VALUES ($1, 'Issue', $2, $3, $4, $5, $6, 'Approved')`,
          [topcoatId, totalTopcoat, dealId, approved_by || 'Admin', 'Auto-issued via Paint Request', refNo]
        ));
      }
      if (thinnerId && totalThinner > 0) {
        transactions.push(pool.query(
          `INSERT INTO inventory_transactions (item_id, transaction_type, quantity, deal_id, recorded_by, notes, reference_no, status) VALUES ($1, 'Issue', $2, $3, $4, $5, $6, 'Approved')`,
          [thinnerId, totalThinner, dealId, approved_by || 'Admin', 'Auto-issued via Paint Request', refNo]
        ));
      }

      await Promise.all(transactions);
    }

    return NextResponse.json({ request });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
