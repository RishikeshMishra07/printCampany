import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { logAudit } from '@/lib/audit';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { query } from '@/lib/db';


export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const password = formData.get('password') as string || null;
    const uploadAt = formData.get('upload_at') as string || null;
    const clientOverride = formData.get('client_override') as string || null;
    const employeeId = formData.get('employee_id') as string || null;
    const employeeName = formData.get('name') as string || null;
    const targetEmployeeId = formData.get('target_employee_id') as string || employeeId;
    
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 1. Convert file to Base64 (Vercel has read-only disk, so we save to Postgres directly)
    const base64Data = buffer.toString('base64');
    const fileName = `${uuidv4()}_${file.name}`;
    
    // 2. Initialize Database Tables for Jobs (if they don't exist)
    const jobId = uuidv4();
    await query(`
      CREATE TABLE IF NOT EXISTS upload_jobs (
        id UUID PRIMARY KEY,
        file_path TEXT,
        file_data TEXT,
        password VARCHAR(255),
        status VARCHAR(50) DEFAULT 'PENDING',
        total_rows INT DEFAULT 0,
        processed_rows INT DEFAULT 0,
        error_log JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      ALTER TABLE upload_jobs ADD COLUMN IF NOT EXISTS password VARCHAR(255);
      ALTER TABLE upload_jobs ADD COLUMN IF NOT EXISTS file_data TEXT;
      ALTER TABLE upload_jobs ADD COLUMN IF NOT EXISTS upload_at DATE;
      ALTER TABLE upload_jobs ADD COLUMN IF NOT EXISTS uploaded_by_employee_id VARCHAR(100);
      ALTER TABLE upload_jobs ADD COLUMN IF NOT EXISTS uploaded_by_name VARCHAR(255);
      ALTER TABLE upload_jobs ADD COLUMN IF NOT EXISTS target_employee_id VARCHAR(100);
      ALTER TABLE upload_jobs ADD COLUMN IF NOT EXISTS client_override VARCHAR(255);
      ALTER TABLE upload_jobs ADD COLUMN IF NOT EXISTS is_edited_by_admin BOOLEAN DEFAULT FALSE;
    `);

    // 3. Create the Job Entry as 'PENDING'
    await query(`
      INSERT INTO upload_jobs (id, file_path, file_data, password, upload_at, client_override, uploaded_by_employee_id, uploaded_by_name, status, target_employee_id) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PENDING', $9)
    `, [jobId, fileName, base64Data, password, uploadAt, clientOverride, employeeId, employeeName, targetEmployeeId]);

    // Track Audit Log
    await logAudit(
      'UPLOAD_EXCEL',
      'EXCEL_BATCH',
      jobId,
      employeeName || 'Unknown',
      { fileName: file.name, size: file.size, action_by_emp_id: employeeId }
    );

    // 4. No third-party message queue needed! 
    // The native Postgres worker will automatically pick up this 'PENDING' job using "FOR UPDATE SKIP LOCKED"
    
    // 5. Instantly return success to the user so the frontend never hangs!
    return NextResponse.json({ 
      success: true, 
      message: "File securely uploaded and queued for background processing.",
      jobId 
    });

  } catch (error: any) {
    console.error("Upload Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
