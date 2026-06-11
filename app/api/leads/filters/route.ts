import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('q') || searchParams.get('search') || '';
    const searchType = searchParams.get('searchType') || 'all';

    const baseConditions: string[] = [];
    const baseParams: any[] = [];

    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const sessionStr = cookieStore.get('auth_session')?.value;
    if (sessionStr) {
      const session = JSON.parse(sessionStr);
      if (session.role !== 'admin') {
        baseConditions.push(`uploaded_by_employee_id = $${baseParams.length + 1}`);
        baseParams.push(session.employee_id);
      }
    }

    if (search) {
      if (searchType === 'account no') {
        baseConditions.push(`account_no ILIKE $${baseParams.length + 1}`);
        baseParams.push(`%${search}%`);
      } else if (searchType === 'emp code') {
        baseConditions.push(`employee_code ILIKE $${baseParams.length + 1}`);
        baseParams.push(`%${search}%`);
      } else {
        const p = `$${baseParams.length + 1}`;
        baseConditions.push(`(account_no ILIKE ${p} OR employee_name ILIKE ${p} OR phone_no ILIKE ${p} OR employee_code ILIKE ${p})`);
        baseParams.push(`%${search}%`);
      }
    }

    const month = searchParams.get('month') || '';
    const year = searchParams.get('year') || '';
    const duplicateOnly = searchParams.get('duplicateOnly') === 'true';

    if (duplicateOnly) {
      baseConditions.push(`is_duplicate = TRUE`);
    } else {
      baseConditions.push(`(is_duplicate = FALSE OR is_duplicate IS NULL)`);
    }

    if (month) {
      baseConditions.push(`EXTRACT(MONTH FROM upload_at) = $${baseParams.length + 1}`);
      baseParams.push(month);
    }
    if (year) {
      baseConditions.push(`EXTRACT(YEAR FROM upload_at) = $${baseParams.length + 1}`);
      baseParams.push(year);
    }

    const uploadDate = searchParams.get('uploadDate') || '';
    if (uploadDate) {
      baseConditions.push(`DATE(upload_at) = $${baseParams.length + 1}`);
      baseParams.push(uploadDate);
    }

    const fields = [
      { name: 'employeeCode', column: 'employee_code' },
      { name: 'product', column: 'product' },
      { name: 'bucket', column: 'bucket' },
      { name: 'location', column: 'location' },
      { name: 'aph', column: 'aph' },
      { name: 'ph', column: 'ph' },
      { name: 'client', column: 'client' },
      { name: 'tlName', column: 'tl_name' },
      { name: 'agentName', column: 'employee_name' }
    ];

    const results = await Promise.all(
      fields.map(async (field) => {
        const conditions = [...baseConditions];
        const queryParams = [...baseParams];

        // Apply all filters EXCEPT the current field
        fields.forEach(f => {
          if (f.column !== field.column) {
            const vals = searchParams.getAll(f.column);
            if (vals.length > 0) {
              conditions.push(`${f.column} = ANY($${queryParams.length + 1})`);
              queryParams.push(vals);
            }
          }
        });

        // Add IS NOT NULL for current field
        conditions.push(`${field.column} IS NOT NULL AND ${field.column} != ''`);

        const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
        const res = await query(`SELECT DISTINCT ${field.column} FROM dpf_records ${whereClause} ORDER BY ${field.column} ASC`, queryParams);
        return { [field.name]: res.rows.map(r => r[field.column]) };
      })
    );

    const filterData = results.reduce((acc, curr) => ({ ...acc, ...curr }), {});

    return NextResponse.json({ success: true, filters: filterData });
  } catch (error: any) {
    console.error('Error fetching filters:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch filters' }, { status: 500 });
  }
}
