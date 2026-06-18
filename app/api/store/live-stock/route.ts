import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const dateQuery = searchParams.get('date'); // format: 'YYYY-MM-DD'
    const month = searchParams.get('month'); // fallback for older clients

    let startDate = '1970-01-01';
    let endDate = '2100-01-01';

    if (dateQuery) {
      startDate = dateQuery;
      // calculate next day for endDate (exclusive < endDate)
      const date = new Date(startDate);
      date.setDate(date.getDate() + 1);
      endDate = date.toISOString().split('T')[0];
    } else if (month) {
      startDate = `${month}-01`;
      // calculate first day of next month for endDate (exclusive < endDate)
      const date = new Date(startDate);
      date.setMonth(date.getMonth() + 1);
      endDate = date.toISOString().split('T')[0];
    }

    const query = `
      SELECT 
        i.id, i.name, i.category, i.project, i.new_rate, i.old_rate, i.unit_of_measure, i.min_stock_level,
        
        -- Opening Qty: Net transactions BEFORE start date
        COALESCE(SUM(CASE WHEN t.created_at < $1 THEN 
          CASE WHEN t.transaction_type = 'Inward' AND (t.status IS NULL OR t.status = 'Approved') THEN t.quantity
               WHEN t.transaction_type IN ('Issue', 'Outward', 'Scrap') THEN -t.quantity
               ELSE 0 END
        ELSE 0 END), 0) as opening_qty,
        
        -- Inward during period
        COALESCE(SUM(CASE WHEN t.created_at >= $1 AND t.created_at < $2 AND t.transaction_type = 'Inward' AND (t.status IS NULL OR t.status = 'Approved') THEN t.quantity ELSE 0 END), 0) as inward_qty,
        
        -- Outward during period
        COALESCE(SUM(CASE WHEN t.created_at >= $1 AND t.created_at < $2 AND t.transaction_type IN ('Issue', 'Outward', 'Scrap') THEN t.quantity ELSE 0 END), 0) as outward_qty,
        
        -- Closing Qty: Total up to end date (Opening + Inward - Outward)
        COALESCE(SUM(CASE WHEN t.created_at < $2 THEN 
          CASE WHEN t.transaction_type = 'Inward' AND (t.status IS NULL OR t.status = 'Approved') THEN t.quantity
               WHEN t.transaction_type IN ('Issue', 'Outward', 'Scrap') THEN -t.quantity
               ELSE 0 END
        ELSE 0 END), 0) as closing_qty,

        -- Fallback current_qty for compatibility
        COALESCE(SUM(CASE WHEN t.created_at < $2 THEN 
          CASE WHEN t.transaction_type = 'Inward' AND (t.status IS NULL OR t.status = 'Approved') THEN t.quantity
               WHEN t.transaction_type IN ('Issue', 'Outward', 'Scrap') THEN -t.quantity
               ELSE 0 END
        ELSE 0 END), 0) as current_qty
        
      FROM items i
      LEFT JOIN inventory_transactions t ON i.id = t.item_id
      GROUP BY i.id
      ORDER BY i.name ASC;
    `;
    const { rows } = await pool.query(query, [startDate, endDate]);
    return NextResponse.json({ stock: rows });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

