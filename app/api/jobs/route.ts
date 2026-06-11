import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const result = await query(`
      SELECT id, file_path, status, total_rows, processed_rows, error_log, created_at
      FROM upload_jobs
      ORDER BY created_at DESC
      LIMIT 50
    `);
    return NextResponse.json(result.rows);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
