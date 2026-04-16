import nodemailer from 'nodemailer';

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function sendPasswordResetEmail(toEmail: string, resetToken: string): Promise<void> {
  const transport = createTransport();
  const resetUrl = `${process.env.APP_URL ?? 'http://localhost:3000'}/reset-password?token=${resetToken}`;

  await transport.sendMail({
    from: process.env.SMTP_FROM ?? 'no-reply@welltrack.app',
    to: toEmail,
    subject: 'Reset your WellTrack password',
    text: `Click the link below to reset your password. It expires in 1 hour.\n\n${resetUrl}`,
    html: `<p>Click the link below to reset your password. It expires in 1 hour.</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
  });
}

export async function sendDailyReminderEmail(toEmail: string, displayName: string): Promise<void> {
  const transport = createTransport();
  const appUrl = process.env.APP_URL ?? 'http://localhost:5173';

  await transport.sendMail({
    from: process.env.SMTP_FROM ?? 'no-reply@welltrack.app',
    to: toEmail,
    subject: 'WellTrack — Daily check-in reminder',
    text: `Hi ${displayName},\n\nJust a friendly reminder to log today's health data in WellTrack.\n\nTracking consistently helps you spot trends and share useful information with your healthcare provider.\n\nLog now: ${appUrl}\n\n— The WellTrack team`,
    html: `
      <p>Hi ${displayName},</p>
      <p>Just a friendly reminder to log today's health data in WellTrack.</p>
      <p>Tracking consistently helps you spot trends and share useful information with your healthcare provider.</p>
      <p><a href="${appUrl}" style="background:#0d9488;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;">Log now</a></p>
      <p style="color:#888;font-size:12px;margin-top:24px;">You're receiving this because you enabled daily reminders in WellTrack settings. <a href="${appUrl}/settings">Manage preferences</a></p>
    `,
  });
}
