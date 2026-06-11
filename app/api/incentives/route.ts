import { NextResponse } from 'next/server';
import pool from '@/lib/db';
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

// Associate Fixed Slab Logic (0-3 Months)
function getAssociateFixedIncentive(collection: number, monthOfVintage: number) {
    if (monthOfVintage === 0) {
        if (collection >= 400000) return 16000;
        if (collection >= 350000) return 10500;
        if (collection >= 300000) return 9000;
        if (collection >= 250000) return 7500;
        if (collection >= 200000) return 6000;
        if (collection >= 175000) return 5000;
        if (collection >= 150000) return 4000;
        if (collection >= 100000) return 3000;
        if (collection >= 75000) return 2000;
        if (collection >= 50000) return 1000;
        if (collection >= 25000) return 500;
    } else if (monthOfVintage === 1) {
        if (collection >= 400000) return 16000;
        if (collection >= 350000) return 10500;
        if (collection >= 300000) return 9000;
        if (collection >= 250000) return 7500;
        if (collection >= 200000) return 5000;
        if (collection >= 175000) return 3500;
        if (collection >= 150000) return 2750;
        if (collection >= 100000) return 1500;
        if (collection >= 75000) return 500;
    } else if (monthOfVintage === 2) {
        if (collection >= 400000) return 16000;
        if (collection >= 350000) return 10500;
        if (collection >= 300000) return 9000;
        if (collection >= 250000) return 7500;
        if (collection >= 200000) return 4000;
        if (collection >= 175000) return 3375;
        if (collection >= 150000) return 2500;
        if (collection >= 100000) return 500;
    } else if (monthOfVintage === 3) {
        if (collection >= 400000) return 16000;
        if (collection >= 350000) return 10500;
        if (collection >= 300000) return 9000;
        if (collection >= 250000) return 7500;
        if (collection >= 200000) return 4000;
        if (collection >= 175000) return 2000;
        if (collection >= 150000) return 1000;
    }
    return 0;
}

// Associate Percentage Slab Logic (>3 Months)
function getAssociateTenuredIncentivePercentage(collection: number, salary: number) {
    if (collection >= 400000) return 0.04;
    if (collection >= 350000) return 0.0325;

    if (salary > 24000) return 0; // >24k only eligible at 350k+

    if (collection >= 300000) {
        return 0.03;
    }
    if (collection >= 280000) {
        if (salary <= 18000) return 0.025;
        if (salary > 18000 && salary <= 24000) return 0.025; // Handled by salary>24k check above
    }
    if (collection >= 260000) {
        if (salary <= 18000) return 0.025;
    }
    if (collection >= 225000) {
        if (salary < 16000) return 0.025;
    }
    return 0;
}

// TL Incentive Percentage Slab Logic
function getTlIncentivePercentage(pcp: number) {
    if (pcp >= 300000) return 0.0115;
    if (pcp >= 270000) return 0.0100;
    if (pcp >= 250000) return 0.0080;
    if (pcp >= 230000) return 0.0070;
    if (pcp >= 215000) return 0.0060;
    if (pcp >= 200000) return 0.0045;
    return 0;
}

// AM Incentive Percentage Slab Logic
function getAmIncentivePercentage(pcp: number) {
    if (pcp >= 275000) return 0.0040;
    if (pcp >= 250000) return 0.0035;
    if (pcp >= 240000) return 0.0030;
    if (pcp >= 235000) return 0.0025;
    if (pcp >= 225000) return 0.0020;
    if (pcp >= 215000) return 0.0012;
    return 0;
}

function calculateVintageDays(doc: Date, currentCalcDate: Date) {
    const msDiff = currentCalcDate.getTime() - doc.getTime();
    return Math.max(0, Math.floor(msDiff / (1000 * 60 * 60 * 24)));
}

export async function GET(req: Request) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { searchParams } = new URL(req.url);
        const conditions: string[] = [];
        const queryParams: any[] = [];

        // Base filter: no duplicates
        conditions.push(`(is_duplicate = FALSE OR is_duplicate IS NULL)`);

        const month = searchParams.get('month');
        const year = searchParams.get('year');

        // Determine the calculation boundary date
        const now = new Date();
        let currentCalcDate = new Date();
        if (month && year) {
            conditions.push(`EXTRACT(MONTH FROM upload_at) = $${queryParams.length + 1}`);
            queryParams.push(month);
            conditions.push(`EXTRACT(YEAR FROM upload_at) = $${queryParams.length + 1}`);
            queryParams.push(year);

            const isCurrentMonth = (now.getMonth() + 1).toString() === month && now.getFullYear().toString() === year;
            if (!isCurrentMonth) {
                // End of the selected month
                currentCalcDate = new Date(parseInt(year), parseInt(month), 0);
            }
        }

        // Complex Filters from Live Records
        const multiMatchFilters = [
            'employee_code', 'product', 'bucket', 'location',
            'aph', 'ph', 'client', 'tl_name', 'employee_name'
        ];

        multiMatchFilters.forEach(key => {
            const vals = searchParams.getAll(key);
            if (vals.length > 0) {
                conditions.push(`r.${key} = ANY($${queryParams.length + 1})`);
                queryParams.push(vals);
            }
        });

        const outMin = searchParams.get('outMin');

        // Admin sees all, User sees only their own or their team's data
        /*
        if (session.role !== 'admin') {
          // In a real scenario, TLs might want to see their team's data. 
          // For now, limiting to their own uploaded data or self-emp_code.
          conditions.push(`(r.uploaded_by_employee_id = $${queryParams.length + 1} OR r.employee_code = $${queryParams.length + 1})`);
          queryParams.push(session.employee_id);
        }
        */

        const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

        // 1. Fetch Master Data from Keka
        const kekaRes = await pool.query(`SELECT * FROM employee_keka_data`);
        const kekaEmployees = kekaRes.rows;

        // 2. Fetch individual collections from DPF
        let queryText = `
      SELECT 
          r.employee_code, 
          r.employee_name,
          r.tl_name,
          r.am as am_name,
          r.aph,
          r.ph,
          r.client,
          r.location,
          r.product,
          r.bucket,
          COUNT(r.id) as total_records, 
          COALESCE(SUM(CAST(NULLIF(regexp_replace(r.money_collected::text, '[^0-9.]', '', 'g'), '') AS NUMERIC)), 0) as total_money_collected
      FROM dpf_records r
      ${whereClause}
      GROUP BY r.employee_code, r.employee_name, r.tl_name, r.am, r.aph, r.ph, r.client, r.location, r.product, r.bucket
    `;

        const res = await pool.query(queryText, queryParams);
        const individualCollections = res.rows; console.log('Found rows:', res.rows.length);

        // 3. Pre-calculate Team Collections and Headcounts
        const tlTeamData: Record<string, { collection: number, headcount: Set<string> }> = {};
        const amTeamData: Record<string, { collection: number, headcount: Set<string> }> = {};

        individualCollections.forEach(row => {
            const coll = parseFloat(row.total_money_collected);

            // Match TL exactly as per Keka/DPF mapping
            if (row.tl_name) {
                const tl = row.tl_name.toLowerCase().trim();
                if (!tlTeamData[tl]) tlTeamData[tl] = { collection: 0, headcount: new Set() };
                tlTeamData[tl].collection += coll;
                if (row.employee_code) tlTeamData[tl].headcount.add(row.employee_code);
            }

            // Match AM
            if (row.am_name) {
                const am = row.am_name.toLowerCase().trim();
                if (!amTeamData[am]) amTeamData[am] = { collection: 0, headcount: new Set() };
                amTeamData[am].collection += coll;
                if (row.employee_code) amTeamData[am].headcount.add(row.employee_code);
            }
        });

        // 3.5 Inject missing AMs and TLs who have 0 personal collections
        const existingEmpCodes = new Set(individualCollections.map(r => r.employee_code).filter(Boolean));
        for (const emp of kekaEmployees) {
            if (!existingEmpCodes.has(emp.employee_id)) {
                const nameKey = emp.name?.toLowerCase().trim() || '';
                const firstName = nameKey.split(' ')[0];
                const rawDesig = (emp.designation || '').toLowerCase();
                
                const isAM = rawDesig.includes('manager') || rawDesig === 'am' || Object.keys(amTeamData).some(am => nameKey.includes(am) || am.includes(firstName));
                const isTL = rawDesig.includes('leader') || rawDesig === 'tl' || Object.keys(tlTeamData).some(tl => nameKey.includes(tl) || tl.includes(firstName));
                
                if (isAM || isTL) {
                    individualCollections.push({
                        employee_code: emp.employee_id,
                        employee_name: emp.name,
                        tl_name: emp.tl_name || '—',
                        am_name: emp.am_name || '—',
                        aph: emp.aph || '—',
                        ph: emp.ph || '—',
                        client: emp.client || '—',
                        location: emp.location || '—',
                        product: emp.product || '—',
                        bucket: emp.bucket || '—',
                        total_money_collected: 0
                    });
                }
            }
        }

        // 4. Calculate Incentives
        const calculatedResults = [];

        // Use individuals from DPF (plus injected AMs/TLs)
        for (const record of individualCollections) {
            const empCode = record.employee_code;
            const collection = parseFloat(record.total_money_collected) || 0;
            const empName = record.employee_name;

            const kekaData = kekaEmployees.find(e => e.employee_id === empCode);
            const rawDesignation = (kekaData?.designation || '').toLowerCase();
            const doc = kekaData?.doc ? new Date(kekaData.doc) : null;
            const salary = kekaData?.salary ? parseFloat(kekaData.salary) : 0;

            let designation = rawDesignation || 'associate';
            const nameKey = empName?.toLowerCase().trim() || '';
            const firstName = nameKey.split(' ')[0];

            // Only infer if not explicitly set
            if (!rawDesignation.includes('manager') && rawDesignation !== 'am' && !rawDesignation.includes('leader') && rawDesignation !== 'tl') {
                const isAM = Object.keys(amTeamData).some(am => nameKey.includes(am) || am.includes(firstName));
                const isTL = Object.keys(tlTeamData).some(tl => nameKey.includes(tl) || tl.includes(firstName));
                
                if (isAM) designation = 'am';
                else if (isTL) designation = 'tl';
            }

            if (outMin && !isNaN(Number(outMin)) && collection < Number(outMin)) {
                if (!designation.includes('manager') && designation !== 'am' && !designation.includes('leader') && designation !== 'tl') {
                    continue; // Skip associates under min, but AM/TL still get team incentive
                }
            }

            let incentive = 0;
            let incentivePercent = 0;
            let vintageMonths = 0;
            let pcp = 0;
            let teamCollection = 0;
            let teamHeadcount = 0;

            if (designation.includes('leader') || designation === 'tl') {
                // Team Leader Logic
                const tlKeyMatch = Object.keys(tlTeamData).find(tl => nameKey.includes(tl) || tl.includes(firstName));
                const tlKey = tlKeyMatch || record.tl_name?.toLowerCase().trim() || '';
                const tlData = tlTeamData[tlKey] || { collection: 0, headcount: new Set() };
                teamCollection = tlData.collection;
                teamHeadcount = tlData.headcount.size || 1; // avoid div by 0
                pcp = teamCollection / teamHeadcount;

                incentivePercent = getTlIncentivePercentage(pcp);
                incentive = teamCollection * incentivePercent;

            } else if (designation.includes('manager') || designation === 'am') {
                // Assistant Manager Logic
                const amKeyMatch = Object.keys(amTeamData).find(am => nameKey.includes(am) || am.includes(firstName));
                const amKey = amKeyMatch || record.am_name?.toLowerCase().trim() || '';
                const amData = amTeamData[amKey] || { collection: 0, headcount: new Set() };
                teamCollection = amData.collection;
                teamHeadcount = amData.headcount.size || 1;
                pcp = teamCollection / teamHeadcount;

                incentivePercent = getAmIncentivePercentage(pcp);
                incentive = teamCollection * incentivePercent;

            } else {
                // Associate Logic
                if (doc) {
                    const vintageDays = calculateVintageDays(doc, currentCalcDate);
                    let slabMonth = -1;
                    if (vintageDays <= 30) slabMonth = 0;
                    else if (vintageDays <= 60) slabMonth = 1;
                    else if (vintageDays <= 90) slabMonth = 2;
                    else if (vintageDays <= 120) slabMonth = 3;

                    vintageMonths = vintageDays; // passing raw days

                    if (slabMonth !== -1) {
                        incentive = getAssociateFixedIncentive(collection, slabMonth);
                    } else {
                        incentivePercent = getAssociateTenuredIncentivePercentage(collection, salary);
                        incentive = collection * incentivePercent;
                    }
                } else {
                    // If no DOC, assume tenured with base salary rule (worst case)
                    vintageMonths = 999;
                    incentivePercent = getAssociateTenuredIncentivePercentage(collection, salary || 25000);
                    incentive = collection * incentivePercent;
                }
            }

            calculatedResults.push({
                employee_code: record.employee_code,
                employee_name: record.employee_name,
                tl_name: record.tl_name,
                am_name: record.am_name,
                aph: record.aph,
                client: record.client,
                ph: record.ph,
                location: record.location,
                product: record.product,
                bucket: record.bucket,
                designation: designation.toUpperCase(), // expose inferred
                doc: kekaData?.doc || null,
                vintage: vintageMonths,
                salary: salary,
                total_collection: collection,
                team_collection: teamCollection,
                team_headcount: teamHeadcount,
                pcp: pcp,
                incentive_percent: (incentivePercent * 100).toFixed(2) + '%',
                incentive: incentive
            });
        }

        // 5. Apply Group By from UI
        const groupByParam = searchParams.get('groupBy') || 'ph';
        const allowedGroupBy = ['ph', 'tl_name', 'employee_name', 'employee_code', 'client', 'location', 'product', 'bucket'];
        const groupBy = allowedGroupBy.includes(groupByParam) ? groupByParam : 'ph';

        const groupedData: Record<string, any> = {};

        for (const res of calculatedResults) {
            let groupKey = res[groupBy as keyof typeof res] as string;
            if (!groupKey) groupKey = 'Unknown';

            if (!groupedData[groupKey]) {
                groupedData[groupKey] = {
                    employee_id: groupKey, // UI maps `employee_id` and `name`
                    name: groupKey,
                    total_records: 0,
                    total_collection: 0,
                    incentive: 0,
                    // Additional fields for detail view
                    designation: res.designation,
                    vintage: res.vintage,
                    salary: res.salary,
                    team_collection: 0,
                    pcp: 0,
                    incentive_percent: res.incentive_percent,
                    tl_name: res.tl_name,
                    am_name: res.am_name,
                    aph: res.aph,
                    ph: res.ph
                };
            }

            groupedData[groupKey].total_records += 1;
            groupedData[groupKey].total_collection += res.total_collection;
            groupedData[groupKey].incentive += res.incentive;

            // If grouped by employee, keep precise details
            if (groupBy === 'employee_code' || groupBy === 'employee_name') {
                groupedData[groupKey].team_collection = res.team_collection;
                groupedData[groupKey].pcp = res.pcp;
                groupedData[groupKey].vintage = res.vintage;
                groupedData[groupKey].salary = res.salary;
                groupedData[groupKey].tl_name = res.tl_name;
                groupedData[groupKey].am_name = res.am_name;
                groupedData[groupKey].aph = res.aph;
                groupedData[groupKey].ph = res.ph;
            }
        }

        const finalData = Object.values(groupedData).sort((a: any, b: any) => b.total_collection - a.total_collection);

        return NextResponse.json({ success: true, data: finalData });
    } catch (error) {
        console.error('Incentive Fetch Error:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch incentive data' }, { status: 500 });
    }
}
