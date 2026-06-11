import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const search = searchParams.get('search') || '';
    const PAGE_SIZE = 20;
    const offset = (page - 1) * PAGE_SIZE;

    const whereClause = search
      ? `WHERE employee_name ILIKE $3 OR employee_code ILIKE $3 OR lan ILIKE $3 OR mobile_number ILIKE $3 OR client ILIKE $3`
      : '';
    
    const params = search
      ? [PAGE_SIZE, offset, `%${search}%`]
      : [PAGE_SIZE, offset];

    const [recordsResult, countResult] = await Promise.all([
      query(`
        SELECT id, employee_code, employee_name, client, product, bucket, date,
               lan, mobile_number, money_collected, payment_mode, tl_name, am, aph, ph, job_id
        FROM dpf_records
        ${whereClause}
        ORDER BY id DESC
        LIMIT $1 OFFSET $2
      `, params),
      query(`
        SELECT COUNT(*) as total FROM dpf_records
        ${search ? `WHERE employee_name ILIKE $1 OR employee_code ILIKE $1 OR lan ILIKE $1 OR mobile_number ILIKE $1 OR client ILIKE $1` : ''}
      `, search ? [`%${search}%`] : []),
    ]);

    return NextResponse.json({
      records: recordsResult.rows,
      total: parseInt(countResult.rows[0].total),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
