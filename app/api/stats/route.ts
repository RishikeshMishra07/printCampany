import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const [totalRes, pendingRes, failedRes, todayRes] = await Promise.all([
      query(`SELECT COUNT(*) as count FROM dpf_records`),
      query(`SELECT COUNT(*) as count FROM upload_jobs WHERE status = 'PENDING' OR status = 'PROCESSING'`),
      query(`SELECT COUNT(*) as count FROM upload_jobs WHERE status = 'FAILED'`),
      query(`SELECT COUNT(*) as count FROM dpf_records WHERE job_id IN (SELECT id FROM upload_jobs WHERE created_at::date = CURRENT_DATE)`),
    ]);

    return NextResponse.json({
      totalRecords: parseInt(totalRes.rows[0].count),
      pendingJobs: parseInt(pendingRes.rows[0].count),
      failedJobs: parseInt(failedRes.rows[0].count),
      processedToday: parseInt(todayRes.rows[0].count),
    });
  } catch (error: any) {
    // Tables may not exist yet, return zeros
    return NextResponse.json({ totalRecords: 0, pendingJobs: 0, failedJobs: 0, processedToday: 0 });
  }
}
