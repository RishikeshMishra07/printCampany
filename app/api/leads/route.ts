import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '25');
    const search = searchParams.get('q') || searchParams.get('search') || '';
    const searchType = searchParams.get('searchType') || 'all';
    const sortBy = searchParams.get('sortBy') || '';
    
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const queryParams: any[] = [];

    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const sessionStr = cookieStore.get('auth_session')?.value;
    if (sessionStr) {
      const session = JSON.parse(sessionStr);
      if (session.role !== 'admin') {
        conditions.push(`uploaded_by_employee_id = $${queryParams.length + 1}`);
        queryParams.push(session.employee_id);
      }
    }

    if (search) {
      if (searchType === 'account no') {
        conditions.push(`account_no ILIKE $${queryParams.length + 1}`);
        queryParams.push(`%${search}%`);
      } else if (searchType === 'emp code') {
        conditions.push(`employee_code ILIKE $${queryParams.length + 1}`);
        queryParams.push(`%${search}%`);
      } else {
        const p = `$${queryParams.length + 1}`;
        conditions.push(`(account_no ILIKE ${p} OR employee_name ILIKE ${p} OR phone_no ILIKE ${p} OR employee_code ILIKE ${p})`);
        queryParams.push(`%${search}%`);
      }
    }

    const multiMatchFilters = [
      'employee_code', 'product', 'bucket', 'location', 
      'aph', 'ph', 'client', 'tl_name', 'employee_name'
    ];

    multiMatchFilters.forEach(key => {
      const vals = searchParams.getAll(key);
      if (vals.length > 0) {
        conditions.push(`${key} = ANY($${queryParams.length + 1})`);
        queryParams.push(vals);
      }
    });

    const month = searchParams.get('month') || '';
    const year = searchParams.get('year') || '';
    const duplicateOnly = searchParams.get('duplicateOnly') === 'true';

    if (duplicateOnly) {
      conditions.push(`is_duplicate = TRUE`);
    } else {
      conditions.push(`(is_duplicate = FALSE OR is_duplicate IS NULL)`);
    }

    if (month) {
      conditions.push(`EXTRACT(MONTH FROM upload_at) = $${queryParams.length + 1}`);
      queryParams.push(month);
    }
    if (year) {
      conditions.push(`EXTRACT(YEAR FROM upload_at) = $${queryParams.length + 1}`);
      queryParams.push(year);
    }

    const uploadDate = searchParams.get('uploadDate') || '';
    if (uploadDate) {
      conditions.push(`DATE(upload_at) = $${queryParams.length + 1}`);
      queryParams.push(uploadDate);
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    let orderClause = 'ORDER BY id DESC';
    if (sortBy === 'high') {
      orderClause = 'ORDER BY money_collected DESC NULLS LAST, id DESC';
    } else if (sortBy === 'low') {
      orderClause = 'ORDER BY money_collected ASC NULLS LAST, id DESC';
    }

    // Get Total Count
    const countQuery = `SELECT COUNT(*) FROM dpf_records ${whereClause}`;
    const countRes = await pool.query(countQuery, queryParams);
    const totalCount = parseInt(countRes.rows[0].count);

    const isExport = searchParams.get('export') === 'true';

    // Get Data
    // We map dpf_records columns to what the Leads component expects:
    // id -> id
    // account_no -> account_no
    // employee_name -> name
    // money_collected -> outstanding
    // bucket -> bucket
    // am -> agent
    // client -> client
    // product -> product
    // Defaulting status to 'Not Connected'
    
    const dataQuery = `
      SELECT 
        id, 
        account_no, 
        employee_code,
        employee_name as name, 
        client, 
        product, 
        bucket, 
        location,
        money_collected as outstanding, 
        payment_mode,
        tl_name,
        am as agent, 
        aph,
        ph,
        phone_no,
        TO_CHAR(upload_at, 'YYYY-MM-DD') as upload_at,
        COALESCE(is_duplicate, FALSE) as is_duplicate,
        fraud_flag
      FROM dpf_records
      ${whereClause}
      ${orderClause}
      ${isExport ? '' : `LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`}
    `;

    const dataParams = isExport ? queryParams : [...queryParams, limit, offset];
    const dataRes = await pool.query(dataQuery, dataParams);

    return NextResponse.json({
      leads: dataRes.rows,
      total: totalCount
    });

  } catch (error) {
    console.error('Error fetching leads:', error);
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const sessionStr = cookieStore.get('auth_session')?.value;
    if (!sessionStr) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const session = JSON.parse(sessionStr);
    if (session.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const { 
      account_no, employee_code, name, client, product, bucket, location, 
      outstanding, payment_mode, tl_name, agent, aph, ph, phone_no 
    } = body;

    const query = `
      INSERT INTO dpf_records (
        account_no, employee_code, employee_name, client, product, bucket, location,
        money_collected, payment_mode, tl_name, am, aph, ph, phone_no, upload_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, CURRENT_DATE
      ) RETURNING id
    `;
    const values = [
      account_no, employee_code, name, client, product, bucket, location,
      outstanding ? Number(outstanding) : 0, payment_mode, tl_name, agent, aph, ph, phone_no
    ];

    const res = await pool.query(query, values);
    return NextResponse.json({ success: true, id: res.rows[0].id });
  } catch (error: any) {
    console.error('Error creating record:', error);
    return NextResponse.json({ error: 'Failed to create record: ' + error.message }, { status: 500 });
  }
}
