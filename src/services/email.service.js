import nodemailer from 'nodemailer';

let transporter;

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
};

/**
 * Send a daily reminder email to an employee who hasn't logged hours.
 */
export const sendDailyReminder = async ({ to, name }) => {
  const t = getTransporter();
  await t.sendMail({
    from: process.env.EMAIL_FROM || 'YorkLog <noreply@york-press.com>',
    to,
    subject: "⏰ Don't forget to log your hours today!",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
        <div style="background:#0f2d4a;padding:20px;border-radius:8px 8px 0 0;">
          <h2 style="color:white;margin:0;">YorkLog</h2>
        </div>
        <div style="padding:24px;background:#f8fafc;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;">
          <p style="font-size:16px;color:#1e293b;">Hi <strong>${name}</strong>,</p>
          <p style="color:#475569;">This is a friendly reminder that you haven't logged your work hours for <strong>today</strong> yet.</p>
          <a href="${process.env.FRONTEND_URL}/log-hours"
             style="display:inline-block;background:#0e7490;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0;">
            Log My Hours →
          </a>
          <p style="font-size:12px;color:#94a3b8;margin-top:24px;">
            You're receiving this because you have email reminders enabled.<br>
            <a href="${process.env.FRONTEND_URL}/profile" style="color:#0e7490;">Manage preferences</a>
          </p>
        </div>
      </div>
    `,
  });
};

/**
 * Notify a manager of a new edit request.
 */
export const sendEditRequestNotification = async ({ to, managerName, employeeName, entryDate }) => {
  const t = getTransporter();
  await t.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: `✏️ Edit request from ${employeeName}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
        <h2 style="color:#0f2d4a;">YorkLog — Edit Request</h2>
        <p>Hi <strong>${managerName}</strong>,</p>
        <p><strong>${employeeName}</strong> has submitted an edit request for their entry on <strong>${entryDate}</strong>.</p>
        <a href="${process.env.FRONTEND_URL}/approvals"
           style="display:inline-block;background:#0e7490;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
          Review Request →
        </a>
      </div>
    `,
  });
};
