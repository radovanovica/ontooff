import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

const FROM = process.env.EMAIL_FROM ?? 'ontooff <no-reply@localhost>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? 'ontooff';

function baseTemplate(content: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${APP_NAME}</title>
</head>
<body style="margin:0;padding:0;background:#f5f0eb;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0eb;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#2d5a27 0%,#4a7c59 100%);padding:32px 40px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700;letter-spacing:0.5px;">🌿 ${APP_NAME}</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f5f0eb;padding:24px 40px;text-align:center;border-top:1px solid #e8e0d8;">
              <p style="color:#8b7355;font-size:13px;margin:0;">
                © ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.<br/>
                <a href="${APP_URL}" style="color:#4a7c59;text-decoration:none;">${APP_URL}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function btnStyle(bg = '#2d5a27'): string {
  return `display:inline-block;padding:14px 32px;background:${bg};color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;margin:24px 0;`;
}

// ─────────────────────────────────────────
// EMAIL VERIFICATION
// ─────────────────────────────────────────

export async function sendVerificationEmail(email: string, token: string, name: string): Promise<void> {
  const url = `${APP_URL}/auth/verify-email?token=${token}`;
  const html = baseTemplate(`
    <h2 style="color:#2d5a27;margin:0 0 16px;">Welcome, ${name}! 🌿</h2>
    <p style="color:#4a4a4a;line-height:1.6;font-size:15px;">
      Thanks for creating an account with <strong>${APP_NAME}</strong>. 
      Please verify your email address to get started.
    </p>
    <div style="text-align:center;">
      <a href="${url}" style="${btnStyle()}">Verify Email Address</a>
    </div>
    <p style="color:#8b7355;font-size:13px;text-align:center;">
      This link expires in 24 hours. If you did not create an account, you can ignore this email.
    </p>
  `);
  await transporter.sendMail({ from: FROM, to: email, subject: `Verify your email – ${APP_NAME}`, html });
}

// ─────────────────────────────────────────
// WELCOME EMAIL
// ─────────────────────────────────────────

export async function sendWelcomeEmail(email: string, name: string): Promise<void> {
  const html = baseTemplate(`
    <h2 style="color:#2d5a27;margin:0 0 16px;">Welcome to ${APP_NAME}! 🌲</h2>
    <p style="color:#4a4a4a;line-height:1.6;font-size:15px;">
      Hi <strong>${name}</strong>,<br/><br/>
      Your account is ready. You can now browse activities, find the perfect spot, and make reservations.
    </p>
    <div style="text-align:center;">
      <a href="${APP_URL}" style="${btnStyle()}">Start Exploring</a>
    </div>
  `);
  await transporter.sendMail({ from: FROM, to: email, subject: `Welcome to ${APP_NAME}! 🌿`, html });
}

// ─────────────────────────────────────────
// REGISTRATION CONFIRMATION
// ─────────────────────────────────────────

export interface RegistrationEmailData {
  registrationNumber: string;
  firstName: string;
  locationName: string;
  activityName: string;
  placeName: string;
  startDate: string;
  endDate: string;
  numberOfDays: number;
  spotNames: string[];
  guestSummary: string;
  totalAmount?: number;
  currency?: string;
  paymentMethod?: string;
  requiresPayment: boolean;
  paymentBreakdown?: Array<{ label: string; totalPrice: number }>;
  editToken: string;
}

export async function sendRegistrationConfirmation(
  email: string,
  data: RegistrationEmailData
): Promise<void> {
  const editUrl = `${APP_URL}/registration/edit/${data.editToken}`;

  const spotsHtml = data.spotNames.length
    ? `<p style="color:#4a4a4a;font-size:14px;"><strong>📍 Spot(s):</strong> ${data.spotNames.join(', ')}</p>`
    : '';

  const paymentHtml = data.requiresPayment
    ? `
    <div style="background:#f5f0eb;border-radius:8px;padding:20px;margin:20px 0;">
      <h3 style="color:#2d5a27;margin:0 0 12px;font-size:16px;">💰 Payment Summary</h3>
      ${
        data.paymentBreakdown
          ? data.paymentBreakdown
              .map(
                (item) =>
                  `<p style="color:#4a4a4a;font-size:14px;margin:4px 0;display:flex;justify-content:space-between;">
                    <span>${item.label}</span>
                    <strong>${data.currency} ${Number(item.totalPrice).toFixed(2)}</strong>
                  </p>`
              )
              .join('')
          : ''
      }
      <hr style="border:none;border-top:1px solid #d4c8b8;margin:12px 0;" />
      <p style="color:#2d5a27;font-size:16px;font-weight:700;margin:0;display:flex;justify-content:space-between;">
        <span>Total</span>
        <span>${data.currency} ${Number(data.totalAmount ?? 0).toFixed(2)}</span>
      </p>
      <p style="color:#8b7355;font-size:13px;margin:8px 0 0;">Payment method: <strong>${data.paymentMethod}</strong></p>
    </div>`
    : '<p style="color:#4a7c59;font-size:14px;">✅ This activity is free of charge.</p>';

  const html = baseTemplate(`
    <h2 style="color:#2d5a27;margin:0 0 8px;">Booking Confirmed! 🎉</h2>
    <p style="color:#8b7355;font-size:14px;margin:0 0 24px;">Reservation #${data.registrationNumber}</p>

    <div style="background:#f0f7f0;border-left:4px solid #2d5a27;border-radius:4px;padding:20px;margin:0 0 24px;">
      <p style="color:#4a4a4a;font-size:14px;margin:0 0 8px;"><strong>🌿 Activity:</strong> ${data.activityName}</p>
      <p style="color:#4a4a4a;font-size:14px;margin:0 0 8px;"><strong>📍 Location:</strong> ${data.locationName} – ${data.placeName}</p>
      <p style="color:#4a4a4a;font-size:14px;margin:0 0 8px;"><strong>📅 Dates:</strong> ${data.startDate} → ${data.endDate} (${data.numberOfDays} day${data.numberOfDays > 1 ? 's' : ''})</p>
      ${spotsHtml}
      <p style="color:#4a4a4a;font-size:14px;margin:0;"><strong>👥 Guests:</strong> ${data.guestSummary}</p>
    </div>

    ${paymentHtml}

    <p style="color:#4a4a4a;line-height:1.6;font-size:15px;">
      Need to make changes? Use the link below to edit your reservation anytime.
    </p>
    <div style="text-align:center;">
      <a href="${editUrl}" style="${btnStyle()}">View / Edit Reservation</a>
    </div>
    <p style="color:#8b7355;font-size:12px;text-align:center;">
      This edit link is personal — do not share it publicly.
    </p>
  `);

  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: `Booking Confirmed #${data.registrationNumber} – ${data.activityName}`,
    html,
  });
}

// ─────────────────────────────────────────
// REGISTRATION STATUS UPDATE
// ─────────────────────────────────────────

export async function sendRegistrationStatusUpdate(
  email: string,
  firstName: string,
  registrationNumber: string,
  status: string,
  editToken: string
): Promise<void> {
  const statusMessages: Record<string, { emoji: string; message: string; color: string }> = {
    CONFIRMED: { emoji: '✅', message: 'Your reservation has been confirmed!', color: '#2d5a27' },
    CANCELLED: { emoji: '❌', message: 'Your reservation has been cancelled.', color: '#c0392b' },
    COMPLETED: { emoji: '🎉', message: 'Your activity is complete. Hope you had a great time!', color: '#2d5a27' },
  };

  const info = statusMessages[status] ?? { emoji: 'ℹ️', message: `Your reservation status updated to: ${status}`, color: '#4a7c59' };
  const editUrl = `${APP_URL}/registration/edit/${editToken}`;

  const html = baseTemplate(`
    <h2 style="color:${info.color};margin:0 0 16px;">${info.emoji} ${info.message}</h2>
    <p style="color:#4a4a4a;line-height:1.6;font-size:15px;">
      Hi ${firstName}, your reservation <strong>#${registrationNumber}</strong> status has been updated.
    </p>
    <div style="text-align:center;margin-top:24px;">
      <a href="${editUrl}" style="${btnStyle()}">View Reservation</a>
    </div>
  `);

  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: `Reservation Update #${registrationNumber} – ${APP_NAME}`,
    html,
  });
}

// ─────────────────────────────────────────
// PASSWORD RESET
// ─────────────────────────────────────────

export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  const url = `${APP_URL}/auth/reset-password?token=${token}`;
  const html = baseTemplate(`
    <h2 style="color:#2d5a27;margin:0 0 16px;">Password Reset Request</h2>
    <p style="color:#4a4a4a;line-height:1.6;font-size:15px;">
      We received a request to reset your password. Click below to choose a new password.
    </p>
    <div style="text-align:center;">
      <a href="${url}" style="${btnStyle()}">Reset Password</a>
    </div>
    <p style="color:#8b7355;font-size:13px;text-align:center;">
      This link expires in 1 hour. If you did not request a password reset, you can safely ignore this email.
    </p>
  `);
  await transporter.sendMail({ from: FROM, to: email, subject: `Reset your password – ${APP_NAME}`, html });
}
