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
