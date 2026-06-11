import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport(
  process.env.EMAIL_USER && process.env.EMAIL_PASS
    ? {
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      }
    : {
        host: process.env.SMTP_HOST || 'smtp.ethereal.email',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      }
);

export async function sendReminderEmail(toEmail: string, phName: string, date: string) {
  if (!toEmail) {
    console.log(`Skipping email for ${phName} because no email address is set.`);
    return false;
  }

  // If credentials are not set, just log to console instead of crashing
  if (!process.env.SMTP_HOST && !process.env.SMTP_USER && !process.env.EMAIL_USER) {
    console.log(`[MOCK EMAIL] To: ${toEmail} | Subject: URGENT: Daily Paid File Upload Required for ${date}`);
    return true;
  }

  try {
    const info = await transporter.sendMail({
      from: `"Paid File System" <${process.env.EMAIL_USER || process.env.SMTP_USER || 'no-reply@ims.com'}>`,
      to: toEmail,
      subject: `URGENT: Daily Paid File Upload Required for ${date}`,
      text: `Dear ${phName},\n\nYou have not uploaded the Daily Paid File for ${date}. Please upload it immediately.\n\nThank you,\nPaid File System`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px; border-radius: 8px;">
          <h2 style="color: #d32f2f; margin-top: 0;">Daily Paid File Upload Reminder</h2>
          <p>Dear <strong>${phName}</strong>,</p>
          <p>This is an automated reminder that you have <strong>not uploaded</strong> the Daily Paid File for <strong>${date}</strong>.</p>
          <p>Please log in to the portal and upload your file immediately to ensure accurate reporting.</p>
          <br/>
          <p>Thank you,<br/><strong>Paid File System</strong></p>
        </div>
      `,
    });
    console.log(`Email sent to ${toEmail}: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`Failed to send email to ${toEmail}:`, error);
    return false;
  }
}

export async function sendAdminSummaryEmail(adminEmails: string[], date: string, uploadedUsers: any[], missedUsers: any[]) {
  if (!adminEmails || adminEmails.length === 0) return false;

  if (!process.env.SMTP_HOST && !process.env.SMTP_USER && !process.env.EMAIL_USER) {
    console.log(`[MOCK EMAIL] To Admin | Subject: Daily Paid File Upload Summary for ${date}`);
    return true;
  }

  const allUsersHtml = [...missedUsers, ...uploadedUsers].map(u => {
    const isMissed = missedUsers.some(m => m.id === u.id);
    return `
      <tr>
        <td style="padding: 12px 10px; border-bottom: 1px solid #eee; color: #333;">${u.name || 'Unknown'}</td>
        <td style="padding: 12px 10px; border-bottom: 1px solid #eee; color: #555;">${u.employee_id}</td>
        <td style="padding: 12px 10px; border-bottom: 1px solid #eee; text-align: center;">
          ${isMissed 
            ? '<span style="color: #d32f2f; background: #ffebee; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">⚠️ Missed</span>'
            : '<span style="color: #1976d2; background: #e3f2fd; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">✅ Uploaded</span>'}
        </td>
      </tr>
    `;
  }).join('');

  const tableHtml = allUsersHtml || `<tr><td colspan="3" style="padding: 15px; text-align: center; color: #888;">No users found in the system.</td></tr>`;

  try {
    const info = await transporter.sendMail({
      from: `"Paid File System" <${process.env.EMAIL_USER || process.env.SMTP_USER || 'no-reply@ims.com'}>`,
      to: adminEmails.join(','),
      subject: `Daily Paid File Upload Summary for ${date}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; border: 1px solid #e0e0e0; padding: 0; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
          <div style="background-color: #f8f9fa; padding: 20px 25px; border-bottom: 1px solid #e0e0e0;">
            <h2 style="color: #1e293b; margin: 0; font-size: 22px;">Upload Summary for ${date}</h2>
            <p style="color: #64748b; margin: 8px 0 0 0; font-size: 14px;">Here is the status of the Daily Paid File uploads for today.</p>
          </div>
          
          <div style="padding: 25px;">
            <div style="display: flex; gap: 15px; margin-bottom: 25px;">
              <div style="background: #ffebee; border: 1px solid #ffcdd2; border-radius: 8px; padding: 10px 15px; flex: 1;">
                <div style="font-size: 12px; color: #d32f2f; font-weight: bold; text-transform: uppercase;">Missed Uploads</div>
                <div style="font-size: 24px; color: #b71c1c; font-weight: 900; margin-top: 5px;">${missedUsers.length}</div>
              </div>
              <div style="background: #e3f2fd; border: 1px solid #bbdefb; border-radius: 8px; padding: 10px 15px; flex: 1;">
                <div style="font-size: 12px; color: #1976d2; font-weight: bold; text-transform: uppercase;">Completed Uploads</div>
                <div style="font-size: 24px; color: #0d47a1; font-weight: 900; margin-top: 5px;">${uploadedUsers.length}</div>
              </div>
            </div>

            <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 14px;">
              <thead>
                <tr>
                  <th style="padding: 12px 10px; border-bottom: 2px solid #e2e8f0; color: #475569; font-weight: 700; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">User Name</th>
                  <th style="padding: 12px 10px; border-bottom: 2px solid #e2e8f0; color: #475569; font-weight: 700; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">Employee ID</th>
                  <th style="padding: 12px 10px; border-bottom: 2px solid #e2e8f0; color: #475569; font-weight: 700; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; text-align: center;">Status</th>
                </tr>
              </thead>
              <tbody>
                ${tableHtml}
              </tbody>
            </table>
            
            <div style="margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; font-size: 13px; color: #64748b;">
              <p style="margin: 0;">Thank you,<br/><strong style="color: #334155;">Paid File System</strong></p>
            </div>
          </div>
        </div>
      `,
    });
    console.log(`Admin summary email sent to ${adminEmails.join(', ')}: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`Failed to send admin summary email:`, error);
    return false;
  }
}
