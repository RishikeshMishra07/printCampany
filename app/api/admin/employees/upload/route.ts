import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { logAudit } from '@/lib/audit';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const employeeId = formData.get('employee_id') as string || null;
    const employeeName = formData.get('name') as string || null;
    
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Data = buffer.toString('base64');
    const fileName = `${uuidv4()}_${file.name}`;
    
    const jobId = uuidv4();

    // Create the Job Entry as 'PENDING' for KEKA
    await query(`
      INSERT INTO upload_jobs (id, file_path, file_data, uploaded_by_employee_id, uploaded_by_name, status, job_type) 
      VALUES ($1, $2, $3, $4, $5, 'PENDING', 'KEKA')
    `, [jobId, fileName, base64Data, employeeId, employeeName]);

    // Track Audit Log
    if (employeeId) {
        await logAudit(
            'UPLOAD_EXCEL',
            'EMPLOYEE_KEKA_DATA',
            jobId,
            employeeName || 'Unknown',
            { fileName: file.name, action_by_emp_id: employeeId }
        );
    }

    return NextResponse.json({ 
      success: true, 
      message: "Keka data securely uploaded and queued for background processing.",
      jobId
    });

  } catch (error: any) {
    console.error("Employee Upload Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
