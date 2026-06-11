import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { cookies } from 'next/headers';

async function checkAuth() {
  const cookieStore = await cookies();
  const sessionStr = cookieStore.get('auth_session')?.value;
  if (!sessionStr) return false;
  try {
    return JSON.parse(sessionStr);
  } catch (e) {
    return false;
  }
}

export async function GET(req: Request) {
  const user = await checkAuth();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString());
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());

    const multiFilters: { col: string; vals: string[] }[] = [];
    const filterKeys = [
      { param: 'tl_name', col: 'supervisor_id' },
      { param: 'client', col: 'car_brand' },
      { param: 'product', col: 'part_type' },
      { param: 'bucket', col: 'material' },
      { param: 'location', col: 'machine_id' },
      { param: 'employee_code', col: 'operator_id' },
    ];
    filterKeys.forEach(({ param, col }) => {
      const vals = searchParams.getAll(param).filter(Boolean);
      if (vals.length > 0) multiFilters.push({ col, vals });
    });

    let baseParams: any[] = [month, year];
    let extraConditions = '';
    multiFilters.forEach(({ col, vals }) => {
      const placeholder = `$${baseParams.length + 1}`;
      extraConditions += ` AND ${col} = ANY(${placeholder})`;
      baseParams.push(vals);
    });

    const dateFilter = `EXTRACT(MONTH FROM upload_at) = $1 AND EXTRACT(YEAR FROM upload_at) = $2${extraConditions}`;

    try {
      // Check if table exists
      await query(`SELECT 1 FROM production_logs LIMIT 1`);
    } catch {
      // If table doesn't exist yet, return empty
      return NextResponse.json({ success: true, data: { summary: {}, clients: [], buckets: [], products: [], locations: [], teamLeaders: [], paymentModes: [], dailyTrend: [], agents: [], aphBreakdown: [], phBreakdown: [] } });
    }

    const [
      totalRes, clientRes, bucketRes, productRes, locationRes,
      tlRes, paymentRes,
      dailyRes, agentRes, summaryExtRes, dupStatsRes
    ] = await Promise.all([
      query(`SELECT COUNT(id) as total_files, COALESCE(SUM(parts_produced), 0) as total_collected FROM production_logs WHERE ${dateFilter}`, baseParams),
      query(`SELECT car_brand as name, COUNT(id) as files, COALESCE(SUM(parts_produced), 0) as collected FROM production_logs WHERE ${dateFilter} AND car_brand IS NOT NULL GROUP BY car_brand ORDER BY collected DESC`, baseParams),
      query(`SELECT material as name, COUNT(id) as files, COALESCE(SUM(parts_produced), 0) as collected FROM production_logs WHERE ${dateFilter} AND material IS NOT NULL GROUP BY material ORDER BY collected DESC`, baseParams),
      query(`SELECT part_type as name, COUNT(id) as files, COALESCE(SUM(parts_produced), 0) as collected FROM production_logs WHERE ${dateFilter} AND part_type IS NOT NULL GROUP BY part_type ORDER BY collected DESC`, baseParams),
      query(`SELECT machine_id::text as name, COUNT(id) as files, COALESCE(SUM(parts_produced), 0) as collected FROM production_logs WHERE ${dateFilter} AND machine_id IS NOT NULL GROUP BY machine_id ORDER BY collected DESC`, baseParams),
      query(`SELECT supervisor_id as name, COUNT(id) as files, COALESCE(SUM(parts_produced), 0) as collected FROM production_logs WHERE ${dateFilter} AND supervisor_id IS NOT NULL GROUP BY supervisor_id ORDER BY collected DESC LIMIT 5`, baseParams),
      query(`SELECT machine_id::text as name, COUNT(id) as files, COALESCE(SUM(parts_produced), 0) as collected FROM production_logs WHERE ${dateFilter} AND machine_id IS NOT NULL GROUP BY machine_id ORDER BY collected DESC`, baseParams),
      query(`SELECT EXTRACT(DAY FROM upload_at)::int as day, COUNT(id) as files, COALESCE(SUM(parts_produced), 0) as collected FROM production_logs WHERE ${dateFilter} AND upload_at IS NOT NULL GROUP BY EXTRACT(DAY FROM upload_at) ORDER BY day ASC`, baseParams),
      query(`SELECT operator_id as name, operator_id as code, COUNT(id) as files, COALESCE(SUM(parts_produced), 0) as collected, COUNT(DISTINCT id) as unique_accounts FROM production_logs WHERE ${dateFilter} AND operator_id IS NOT NULL GROUP BY operator_id ORDER BY collected DESC LIMIT 10`, baseParams),
      query(`SELECT COUNT(DISTINCT id) as unique_accounts, CASE WHEN COUNT(id) > 0 THEN COALESCE(SUM(parts_produced), 0) / COUNT(id) ELSE 0 END as avg_per_file, COUNT(DISTINCT operator_id) as active_agents, COUNT(DISTINCT supervisor_id) as active_tls FROM production_logs WHERE ${dateFilter}`, baseParams),
      query(`
        SELECT 
          COALESCE(SUM(duplicate_prints), 0) as dup_count, 
          0 as dup_amount,
          COALESCE(SUM(defective_parts), 0) as fraud_count,
          0 as fraud_amount,
          COUNT(*) as total_all 
        FROM production_logs WHERE ${dateFilter}
      `, baseParams)
    ]);

    const totalCollected = parseInt(totalRes.rows[0].total_collected) || 0;
    const totalFiles = parseInt(totalRes.rows[0].total_files) || 0;

    const formatData = (rows: any[]) => rows.map((r: any) => ({
      name: r.name,
      files: parseInt(r.files) || 0,
      collected: parseInt(r.collected) || 0,
      percentage: totalCollected > 0 ? ((parseInt(r.collected) || 0) / totalCollected) * 100 : 0
    }));

    const ext = summaryExtRes.rows[0] || {};
    const dupStats = dupStatsRes.rows[0] || {};

    const data = {
      summary: {
        totalCollected, totalFiles,
        topClient: clientRes.rows[0]?.name || 'N/A',
        topBucket: bucketRes.rows[0]?.name || 'N/A',
        uniqueAccounts: parseInt(ext.unique_accounts) || 0,
        avgPerFile: parseFloat(ext.avg_per_file) || 0,
        activeAgents: parseInt(ext.active_agents) || 0,
        activeTLs: parseInt(ext.active_tls) || 0,
        // Blocked stats
        duplicateCount: parseInt(dupStats.dup_count) || 0,
        duplicateAmount: parseFloat(dupStats.dup_amount) || 0,
        fraudCount: parseInt(dupStats.fraud_count) || 0,
        fraudAmount: parseFloat(dupStats.fraud_amount) || 0,
        totalWithDuplicates: parseInt(dupStats.total_all) || 0
      },
      fraudBreakdown: [],
      clients: formatData(clientRes.rows),
      buckets: formatData(bucketRes.rows),
      products: formatData(productRes.rows),
      locations: formatData(locationRes.rows),
      teamLeaders: formatData(tlRes.rows),
      areaManagers: formatData(paymentRes.rows), // using paymentRes as placeholder for areaManagers for now to prevent error
      paymentModes: formatData(paymentRes.rows),
      dailyTrend: dailyRes.rows.map((r: any) => ({ day: parseInt(r.day), files: parseInt(r.files), collected: parseInt(r.collected) })),
      agents: agentRes.rows.map((r: any) => ({
        name: r.name, code: r.code, files: parseInt(r.files), collected: parseInt(r.collected),
        uniqueAccounts: parseInt(r.unique_accounts),
        percentage: totalCollected > 0 ? ((parseInt(r.collected) || 0) / totalCollected) * 100 : 0
      })),
      aphBreakdown: [],
      phBreakdown: []
    };

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Dashboard Analytics Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch dashboard data' }, { status: 500 });
  }
}
