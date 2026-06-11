import { config } from 'dotenv';
config({ path: '.env.local' });

import * as xlsx from 'xlsx';
import { Pool } from 'pg';
import { exec } from 'child_process';
import util from 'util';
import path from 'path';
import { unlink } from 'fs/promises';
import cron from 'node-cron';
import { sendReminderEmail, sendAdminSummaryEmail } from './lib/email';

const execAsync = util.promisify(exec);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle database client', err);
});

async function startWorker() {
  console.log("👷 Native Background Worker Started! Polling Database every 5 seconds...");

  // Start Daily Reminder Cron Job (runs at 8:00 PM every day)
  cron.schedule('0 20 * * *', async () => {
    console.log("⏰ Running daily check for missing Paid Files...");
    try {
      // 1. Get all active users
      const usersRes = await pool.query(`SELECT employee_id, name, email FROM users WHERE role = 'user' AND email IS NOT NULL`);
      const phUsers = usersRes.rows;

      if (phUsers.length === 0) {
        console.log("No PH users with email addresses found.");
        return;
      }

      // 2. Get today's date in YYYY-MM-DD for the query
      // using UTC timezone to avoid local server timezone issues
      const today = new Date().toISOString().split('T')[0];

      // 3. Get all employee_ids who have uploaded a file today
      const uploadsRes = await pool.query(`
        SELECT DISTINCT uploaded_by_employee_id 
        FROM upload_jobs 
        WHERE DATE(created_at) = $1 AND status = 'COMPLETED'
      `, [today]);
      
      const uploadedEmpIds = uploadsRes.rows.map(r => r.uploaded_by_employee_id);

      // 4. Find defaulters and completed users
      const missedUsers = [];
      const uploadedUsers = [];

      for (const user of phUsers) {
        if (!uploadedEmpIds.includes(user.employee_id)) {
          missedUsers.push(user);
          console.log(`⚠️ User ${user.name} (${user.employee_id}) missed today's upload. Sending reminder...`);
          await sendReminderEmail(user.email, user.name || user.employee_id, today);
        } else {
          uploadedUsers.push(user);
        }
      }

      // 5. Send Admin Summary Email
      const adminsRes = await pool.query(`SELECT email FROM users WHERE role = 'admin' AND email IS NOT NULL`);
      const adminEmails = adminsRes.rows.map(r => r.email);

      if (adminEmails.length > 0) {
        console.log(`📊 Sending Daily Upload Summary to Admins: ${adminEmails.join(', ')}`);
        await sendAdminSummaryEmail(adminEmails, today, uploadedUsers, missedUsers);
      }
    } catch (err) {
      console.error("Cron Job Error:", err);
    }
  });


  // Initialize Tables with actual DPF columns
  await pool.query(`
    CREATE TABLE IF NOT EXISTS upload_jobs (
      id UUID PRIMARY KEY,
      file_path TEXT,
      status VARCHAR(50) DEFAULT 'PENDING',
      total_rows INT DEFAULT 0,
      processed_rows INT DEFAULT 0,
      error_log JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      uploaded_by_employee_id VARCHAR(100),
      uploaded_by_name VARCHAR(255)
    );

    ALTER TABLE upload_jobs ADD COLUMN IF NOT EXISTS password VARCHAR(255);
    ALTER TABLE upload_jobs ADD COLUMN IF NOT EXISTS uploaded_by_employee_id VARCHAR(100);
    ALTER TABLE upload_jobs ADD COLUMN IF NOT EXISTS uploaded_by_name VARCHAR(255);
    ALTER TABLE upload_jobs ADD COLUMN IF NOT EXISTS job_type VARCHAR(50) DEFAULT 'DPF';

    DROP TABLE IF EXISTS dpf_records;
    CREATE TABLE dpf_records (
      id SERIAL PRIMARY KEY,
      account_no       VARCHAR(100),
      employee_code    VARCHAR(100),
      employee_name    VARCHAR(255),
      client           VARCHAR(255),
      product          VARCHAR(255),
      bucket           VARCHAR(100),
      location         VARCHAR(255),
      money_collected  DECIMAL(14,2),
      payment_mode     VARCHAR(100),
      tl_name          VARCHAR(255),
      am               VARCHAR(255),
      aph              VARCHAR(255),
      ph               VARCHAR(255),
      phone_no         VARCHAR(30),
      job_id           UUID,
      upload_at        DATE,
      uploaded_by_employee_id VARCHAR(100),
      uploaded_by_name VARCHAR(255),
      is_duplicate     BOOLEAN DEFAULT FALSE,
      duplicate_of     INT,
      fraud_flag       VARCHAR(255),
      created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Ensure is_duplicate and fraud_flag columns exist (for existing tables)
  await pool.query(`
    ALTER TABLE dpf_records ADD COLUMN IF NOT EXISTS is_duplicate BOOLEAN DEFAULT FALSE;
    ALTER TABLE dpf_records ADD COLUMN IF NOT EXISTS duplicate_of INT;
    ALTER TABLE dpf_records ADD COLUMN IF NOT EXISTS fraud_flag VARCHAR(255);
  `);

  let isProcessing = false;

  // Start the Poller
  setInterval(async () => {
    if (isProcessing) return;
    
    try {
      isProcessing = true;
      const res = await pool.query(`
        UPDATE upload_jobs 
        SET status = 'PROCESSING' 
        WHERE id = (
          SELECT id FROM upload_jobs WHERE status = 'PENDING' ORDER BY created_at ASC LIMIT 1 FOR UPDATE SKIP LOCKED
        ) 
        RETURNING *;
      `);

      if (res.rows.length === 0) {
        isProcessing = false;
        return;
      }

      const job = res.rows[0];
      const jobId = job.id;
      const jobType = job.job_type || 'DPF';
      const password = job.password;
      const fileData = job.file_data;
      const fileName = job.file_path || `job_${jobId}.xlsx`;
      const uploadAt = job.upload_at;
      const uploadedByEmpId = job.uploaded_by_employee_id;
      const uploadedByName = job.uploaded_by_name;
      const clientOverride = job.client_override;

      console.log(`\n⏳ Found New Upload! Processing Job: ${jobId} (Type: ${jobType})`);
      
      let currentFilePath = '';
      let decFilePath = '';
      let originalFilePath = '';

      try {
        const os = require('os');
        const { writeFile } = require('fs/promises');
        
        originalFilePath = path.join(os.tmpdir(), fileName);
        currentFilePath = originalFilePath;
        
        // Restore physical file from DB base64
        if (fileData) {
          const buffer = Buffer.from(fileData, 'base64');
          await writeFile(originalFilePath, buffer);
        } else {
           // fallback for legacy
           originalFilePath = job.file_path;
           currentFilePath = job.file_path;
        }

        if (password) {
          decFilePath = originalFilePath + '_dec.xlsx';
          console.log(`\n🔑 Decrypting Job: ${jobId} with python msoffcrypto-tool...`);
          await execAsync(`msoffcrypto-tool -p "${password.replace(/"/g, '\\"')}" "${originalFilePath}" "${decFilePath}"`);
          currentFilePath = decFilePath;
        }

        const workbook = xlsx.readFile(currentFilePath);
        
        if (jobType === 'KEKA') {
             const sheetName = workbook.SheetNames[0];
             const sheet = workbook.Sheets[sheetName];
             const rawRows = xlsx.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
             
             let headerIndex = 0;
             for (let i = 0; i < Math.min(10, rawRows.length); i++) {
                 if (rawRows[i] && rawRows[i].filter(c => typeof c === 'string').length >= 3) {
                     headerIndex = i;
                     break;
                 }
             }
             const dataRows = xlsx.utils.sheet_to_json(sheet, { range: headerIndex }) as any[];
             const normalize = (s: string) => String(s || "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
             
             const totalRows = dataRows.length;
             await pool.query(`UPDATE upload_jobs SET total_rows = $1 WHERE id = $2`, [totalRows, jobId]);
             
             let processed = 0;
             let failed = 0;
             for (const row of dataRows) {
                 const get = (keys: string[]) => {
                     for (const k of keys) {
                         const target = normalize(k);
                         const foundKey = Object.keys(row).find(r => normalize(r) === target);
                         if (foundKey !== undefined && row[foundKey] !== undefined && row[foundKey] !== '') return row[foundKey];
                     }
                     return null;
                 };
                 
                 const location = get(['Location']);
                 const empCode = get(['Employee_Code', 'Employee Code', 'EmpCode', 'EMP CODE']);
                 const name = get(['Name', 'Employee Name', 'EmpName']);
                 const designation = get(['Designation', 'Role', 'DESIGNATION']);
                 const agentOhr = String(get(['Agent OHR', 'AgentOHR', 'OHR']) || '');
                 const dojRaw = get(['DOJ', 'Date of Joining']);
                 let dojDate = null;
                 if (dojRaw) {
                     if (typeof dojRaw === 'number') dojDate = new Date(Math.round((dojRaw - 25569) * 86400 * 1000));
                     else dojDate = new Date(dojRaw);
                 }
                 const docRaw = get(['DOC', 'Date of Calling']);
                 let docDate = null;
                 if (docRaw) {
                     if (typeof docRaw === 'number') docDate = new Date(Math.round((docRaw - 25569) * 86400 * 1000));
                     else docDate = new Date(docRaw);
                 }
                 const salaryStr = String(get(['Salary', 'CTC', 'Target', 'salary']) || '0').replace(/,/g, '');
                 const salary = parseFloat(salaryStr) || 0;
                 
                 if (!empCode) {
                     failed++;
                 } else {
                     try {
                         await pool.query(`
                             INSERT INTO employee_keka_data (location, employee_id, name, designation, agent_ohr, doj, doc, salary, updated_at)
                             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
                             ON CONFLICT (employee_id) DO UPDATE SET 
                                 location = EXCLUDED.location, name = EXCLUDED.name, designation = EXCLUDED.designation,
                                 agent_ohr = EXCLUDED.agent_ohr, doj = EXCLUDED.doj, doc = EXCLUDED.doc, salary = EXCLUDED.salary,
                                 updated_at = CURRENT_TIMESTAMP
                         `, [location, empCode, name, designation, agentOhr, dojDate, docDate, salary]);
                         processed++;
                     } catch (err) {
                         failed++;
                     }
                 }
                 if ((processed + failed) % 50 === 0) {
                     await pool.query(`UPDATE upload_jobs SET processed_rows = $1 WHERE id = $2`, [processed + failed, jobId]);
                 }
             }
             await pool.query(`UPDATE upload_jobs SET processed_rows = $1, status = 'COMPLETED', error_log = $2 WHERE id = $3`, [processed + failed, JSON.stringify({ failed_count: failed, status: 'Success' }), jobId]);
             console.log(`🎉 KEKA Job ${jobId} Finished! Processed: ${processed}, Failed: ${failed}`);
             
        } else {
        let bestSheetData: any[] = [];
        let bestHeaderIndex = 0;
        let maxTotalMatches = -1;
        let bestSheetName = "";

        const targetFields = ['Account_No', 'Employee_Code', 'Employee_Name', 'Client', 'Product', 'Bucket', 'Location', 'Money_Collected', 'Payment_Mode', 'TL_Name', 'AM', 'APH', 'PH', 'Phone_No'];
        const normalize = (s: string) => String(s || "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();

        for (const sheetName of workbook.SheetNames) {
          const sheet = workbook.Sheets[sheetName];
          const rawRows = xlsx.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
          if (!rawRows || rawRows.length === 0) continue;

          let currentSheetMaxMatches = 0;
          let currentSheetHeaderIndex = 0;

          for (let i = 0; i < Math.min(50, rawRows.length); i++) {
            const row = rawRows[i];
            if (!Array.isArray(row)) continue;
            const rowKeys = row.map(k => normalize(String(k)));
            let matches = 0;
            targetFields.forEach(f => {
              if (rowKeys.includes(normalize(f))) matches++;
            });
            if (matches > currentSheetMaxMatches) {
              currentSheetMaxMatches = matches;
              currentSheetHeaderIndex = i;
            }
          }

          if (currentSheetMaxMatches > maxTotalMatches) {
            maxTotalMatches = currentSheetMaxMatches;
            bestHeaderIndex = currentSheetHeaderIndex;
            bestSheetName = sheetName;
            bestSheetData = xlsx.utils.sheet_to_json(sheet, { range: bestHeaderIndex }) as any[];
          }
        }

        if (maxTotalMatches === 0) {
          throw new Error("No matching headers found in any sheet.");
        }

        // ─── PRE-VALIDATION: FILTER FRAUDS & DUPLICATES BEFORE INSERT ─────────────────
        const allAccountNos = bestSheetData.map(row => {
          const get = (keys: string[]) => {
            for (const k of keys) {
              const target = normalize(k);
              const foundKey = Object.keys(row).find(r => normalize(r) === target);
              if (foundKey !== undefined && row[foundKey] !== undefined && row[foundKey] !== '') return row[foundKey];
            }
            return null;
          };
          return get(['Account_No', 'Account No', 'LAN', 'Loan No']);
        }).filter(Boolean);

        const uniqueAccounts = [...new Set(allAccountNos)];
        
        let existingRecords: any[] = [];
        if (uniqueAccounts.length > 0) {
          console.log(`🔍 Fetching existing records for ${uniqueAccounts.length} unique accounts to check duplicates...`);
          // Chunk unique accounts to avoid query size limits
          for (let i = 0; i < uniqueAccounts.length; i += 1000) {
             const chunk = uniqueAccounts.slice(i, i + 1000);
             const res = await pool.query(`
               SELECT account_no, money_collected, payment_mode, employee_code, upload_at 
               FROM dpf_records 
               WHERE account_no = ANY($1) 
                 AND EXTRACT(MONTH FROM upload_at) = EXTRACT(MONTH FROM $2::date)
                 AND EXTRACT(YEAR FROM upload_at) = EXTRACT(YEAR FROM $2::date)
             `, [chunk, uploadAt]);
             existingRecords.push(...res.rows);
          }
        }

        const validData = [];
        let totalDups = 0;
        
        const intraFileSet = new Set(); // to detect duplicates within the same file

        for (const row of bestSheetData) {
            const get = (keys: string[]) => {
              for (const k of keys) {
                const target = normalize(k);
                const foundKey = Object.keys(row).find(r => normalize(r) === target);
                if (foundKey !== undefined && row[foundKey] !== undefined && row[foundKey] !== '') return row[foundKey];
              }
              return null;
            };
            
            const accNo = get(['Account_No', 'Account No', 'LAN', 'Loan No']);
            const moneyStr = String(get(['Money_Collected', 'Money Collected', 'Amount']) || '0').replace(/,/g, '');
            const money = parseFloat(moneyStr) || 0;
            const payMode = String(get(['Payment_Mode', 'Payment Mode', 'Mode of Payment']) || '').toLowerCase();
            const empCode = get(['Employee_Code', 'Employee Code', 'EmpCode']);
            
            // 2. Intra-file duplicate
            const intraKey = `${accNo}_${money}_${payMode}`;
            if (intraFileSet.has(intraKey)) {
                totalDups++;
                row._isDuplicate = true;
                row._duplicateReason = 'EXACT_DUPLICATE';
            }
            
            // 3. Database existing checks
            let isBad = false;
            const matches = existingRecords.filter(r => r.account_no == accNo);
            
            for (const match of matches) {
                const dbMoney = parseFloat(match.money_collected) || 0;
                const dbPayMode = String(match.payment_mode || '').toLowerCase();

                // Exact Duplicate
                if (dbMoney === money && dbPayMode === payMode) {
                   isBad = true; totalDups++; break;
                }
            }
            
            if (isBad && !row._isDuplicate) {
                row._isDuplicate = true;
                row._duplicateReason = 'EXACT_DUPLICATE';
            }
            
            intraFileSet.add(intraKey);
            validData.push(row);
        }
        
        // We skip the throw Error to allow partial uploads (ignoring duplicates)

        const totalRows = validData.length;
        await pool.query(`UPDATE upload_jobs SET total_rows = $1 WHERE id = $2`, [totalRows, jobId]);

        const BATCH_SIZE = 500;
        let processed = 0;
        let failed = 0;
        let lastError = null;

        for (let i = 0; i < totalRows; i += BATCH_SIZE) {
          const batch = validData.slice(i, i + BATCH_SIZE);
          
          try {
            const values: any[] = [];
            const placeholders: string[] = [];
            let paramIndex = 1;
            
            for (const row of batch) {
              const get = (keys: string[]) => {
                for (const k of keys) {
                  const target = normalize(k);
                  const foundKey = Object.keys(row).find(r => normalize(r) === target);
                  if (foundKey !== undefined && row[foundKey] !== undefined && row[foundKey] !== '') return row[foundKey];
                }
                return null;
              };
              
              placeholders.push(`($${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++}, $${paramIndex++})`);
              values.push(
                get(['Account_No', 'Account No', 'LAN', 'Loan No']),
                get(['Employee_Code', 'Employee Code', 'EmpCode']),
                get(['Employee_Name', 'Employee Name', 'EmpName']),
                clientOverride ? clientOverride : get(['Client', 'client', 'Customer']),
                get(['Product', 'product', 'Scheme']),
                get(['Bucket', 'bucket', 'Delinquency']),
                get(['Location', 'location', 'City']),
                parseFloat(String(get(['Money_Collected', 'Money Collected', 'Amount']) || '0').replace(/,/g, '')) || 0,
                get(['Payment_Mode', 'Payment Mode', 'Mode of Payment']),
                get(['TL_Name', 'TL Name', 'Team Leader']),
                get(['AM', 'am', 'Area Manager']),
                get(['APH', 'aph']),
                get(['PH', 'ph']),
                String(get(['Phone_No', 'Phone No', 'Mobile', 'Contact']) || '').replace(/\D/g, '').slice(-10) || null,
                jobId,
                uploadAt,
                uploadedByEmpId,
                uploadedByName,
                row._isDuplicate ? true : false,
                row._duplicateReason || null
              );
            }

            await pool.query(`
              INSERT INTO dpf_records 
                (account_no, employee_code, employee_name, client, product, bucket, location, money_collected, payment_mode, tl_name, am, aph, ph, phone_no, job_id, upload_at, uploaded_by_employee_id, uploaded_by_name, is_duplicate, fraud_flag)
              VALUES ${placeholders.join(', ')}
            `, values);
            processed += batch.length;
          } catch (batchErr: any) {
            failed += batch.length;
            lastError = batchErr.message;
            console.error("Batch insert failed:", batchErr.message);
          }
          
          await pool.query(`UPDATE upload_jobs SET processed_rows = $1, error_log = $2 WHERE id = $3`, [processed, lastError ? JSON.stringify({ last_error: lastError, failed_count: failed }) : null, jobId]);
          console.log(`✅ Progress: ${processed}/${totalRows} (Failed: ${failed})`);
        }

        await pool.query(`UPDATE upload_jobs SET status = 'COMPLETED', error_log = $2 WHERE id = $1`, [
          jobId,
          JSON.stringify({ duplicates_found: totalDups, failed_count: failed, last_error: lastError, status: 'Blocked records prevented from upload' })
        ]);
        console.log(`🎉 Job ${jobId} Finished! Inserted: ${processed}, Blocked: ${totalDups}`);
        }

      } catch (fileError: any) {
        console.error(`❌ Processing Failed:`, fileError);
        await pool.query(
          `UPDATE upload_jobs SET status = 'FAILED', error_log = $1 WHERE id = $2`,
          [JSON.stringify(fileError.message), jobId]
        );
      } finally {
        if (decFilePath) {
          await unlink(decFilePath).catch(() => {});
        }
        if (originalFilePath && fileData) {
          await unlink(originalFilePath).catch(() => {});
        }
        isProcessing = false;
      }
    } catch (err) {
      console.error('Fatal Poller Error:', err);
      isProcessing = false;
    }
  }, 5000);
}

startWorker().catch(console.error);
