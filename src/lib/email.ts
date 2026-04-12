import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: process.env.SMTP_SECURE === 'true',       // false → STARTTLS on 587
  requireTLS: process.env.SMTP_REQUIRE_TLS !== 'false', // default true
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
  tls: {
    ciphers: 'SSLv3',
    rejectUnauthorized: process.env.SMTP_TLS_REJECT_UNAUTHORIZED !== 'false', // false → trust self-signed
  },
  connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT ?? 5000),
  greetingTimeout:   Number(process.env.SMTP_GREETING_TIMEOUT   ?? 3000),
  socketTimeout:     Number(process.env.SMTP_SOCKET_TIMEOUT     ?? 5000),
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
            <td style="background:linear-gradient(135deg,#2d5a27 0%,#4a7c59 100%);padding:28px 40px;text-align:center;">
              <img src="${APP_URL}/assets/images/logo.svg" alt="${APP_NAME}" width="48" height="48" style="display:block;margin:0 auto 10px;" />
              <h1 style="color:#ffffff;margin:0;font-size:26px;font-weight:800;letter-spacing:1px;text-transform:lowercase;">🌿 ${APP_NAME}</h1>
              <p style="color:rgba(255,255,255,0.75);margin:4px 0 0;font-size:13px;letter-spacing:0.5px;">book nature activities</p>
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
      You can view or edit your reservation at any time using the link below.
    </p>
    <div style="text-align:center;">
      <a href="${editUrl}" style="${btnStyle()}">View / Edit Reservation</a>
    </div>
    <p style="color:#8b7355;font-size:13px;text-align:center;margin-top:8px;">
      If this link doesn't work, copy and paste the following URL into your browser:<br/>
      <span style="color:#4a7c59;word-break:break-all;">${editUrl}</span>
    </p>
    <p style="color:#8b7355;font-size:11px;text-align:center;">
      ⚠️ This edit link is personal — do not share it publicly.
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

export async function sendPasswordResetEmail(email: string, token: string, name = 'there'): Promise<void> {
  const url = `${APP_URL}/auth/reset-password?token=${token}`;
  const html = baseTemplate(`
    <h2 style="color:#2d5a27;margin:0 0 16px;">Reset your password 🔑</h2>
    <p style="color:#4a4a4a;line-height:1.6;font-size:15px;">
      Hi <strong>${name}</strong>,<br/><br/>
      We received a request to reset the password for your <strong>${APP_NAME}</strong> account.
      Click the button below to choose a new password.
    </p>
    <div style="text-align:center;">
      <a href="${url}" style="${btnStyle()}">Reset Password</a>
    </div>
    <p style="color:#8b7355;font-size:13px;text-align:center;margin-top:8px;">
      If this link doesn't work, copy and paste the following URL into your browser:<br/>
      <span style="color:#4a7c59;word-break:break-all;">${url}</span>
    </p>
    <p style="color:#8b7355;font-size:13px;text-align:center;">
      This link expires in <strong>1 hour</strong>. If you did not request a password reset, you can safely ignore this email.
    </p>
  `);
  await transporter.sendMail({ from: FROM, to: email, subject: `Reset your ${APP_NAME} password`, html });
}

// ─────────────────────────────────────────
// OWNER NEW BOOKING NOTIFICATION
// ─────────────────────────────────────────

export interface OwnerBookingNotificationData {
  registrationId: string;
  registrationNumber: string;
  guestName: string;
  guestEmail: string;
  guestPhone?: string;
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
  requiresPayment: boolean;
  editToken: string;
}

export async function sendOwnerNewBookingNotification(
  ownerEmail: string,
  data: OwnerBookingNotificationData
): Promise<void> {
  const viewUrl  = `${APP_URL}/owner/bookings/${data.registrationId}`;
  const approveUrl = `${APP_URL}/api/registrations/${data.registrationId}/approve?token=${data.editToken}`;

  const spotsHtml = data.spotNames.length
    ? `<p style="color:#4a4a4a;font-size:14px;margin:4px 0;"><strong>📍 Spot(s):</strong> ${data.spotNames.join(', ')}</p>`
    : '';

  const amountHtml = data.requiresPayment && data.totalAmount != null
    ? `<p style="color:#4a4a4a;font-size:14px;margin:4px 0;"><strong>💰 Amount:</strong> ${data.currency} ${Number(data.totalAmount).toFixed(2)}</p>`
    : '';

  const phoneHtml = data.guestPhone
    ? `<p style="color:#4a4a4a;font-size:14px;margin:4px 0;"><strong>📞 Phone:</strong> ${data.guestPhone}</p>`
    : '';

  const html = baseTemplate(`
    <h2 style="color:#2d5a27;margin:0 0 8px;">New Booking Received 🎉</h2>
    <p style="color:#8b7355;font-size:14px;margin:0 0 24px;">Reservation #${data.registrationNumber} – ${data.placeName}</p>

    <div style="background:#f0f7f0;border-left:4px solid #2d5a27;border-radius:4px;padding:20px;margin:0 0 20px;">
      <p style="color:#4a4a4a;font-size:15px;font-weight:700;margin:0 0 12px;">📋 Booking Details</p>
      <p style="color:#4a4a4a;font-size:14px;margin:4px 0;"><strong>🌿 Activity:</strong> ${data.activityName}</p>
      <p style="color:#4a4a4a;font-size:14px;margin:4px 0;"><strong>📍 Location:</strong> ${data.locationName}</p>
      <p style="color:#4a4a4a;font-size:14px;margin:4px 0;"><strong>📅 Dates:</strong> ${data.startDate} → ${data.endDate} (${data.numberOfDays} day${data.numberOfDays > 1 ? 's' : ''})</p>
      ${spotsHtml}
      <p style="color:#4a4a4a;font-size:14px;margin:4px 0;"><strong>👥 Guests:</strong> ${data.guestSummary}</p>
      ${amountHtml}
    </div>

    <div style="background:#fff8f0;border-left:4px solid #e67e22;border-radius:4px;padding:20px;margin:0 0 24px;">
      <p style="color:#4a4a4a;font-size:15px;font-weight:700;margin:0 0 12px;">👤 Guest Information</p>
      <p style="color:#4a4a4a;font-size:14px;margin:4px 0;"><strong>Name:</strong> ${data.guestName}</p>
      <p style="color:#4a4a4a;font-size:14px;margin:4px 0;"><strong>✉️ Email:</strong> <a href="mailto:${data.guestEmail}" style="color:#4a7c59;">${data.guestEmail}</a></p>
      ${phoneHtml}
    </div>

    <p style="color:#4a4a4a;font-size:14px;margin:0 0 20px;">
      This booking is currently <strong>pending your approval</strong>. Use the buttons below to confirm it or view the full details in your dashboard.
    </p>

    <div style="text-align:center;margin-bottom:12px;">
      <a href="${approveUrl}" style="${btnStyle('#2d5a27')}">✅ Confirm Booking</a>
    </div>
    <div style="text-align:center;margin-bottom:24px;">
      <a href="${viewUrl}" style="${btnStyle('#4a7c59')}">👁️ View in Dashboard</a>
    </div>

    <p style="color:#8b7355;font-size:12px;text-align:center;">
      Clicking "Confirm Booking" will immediately set the status to <strong>Confirmed</strong> and notify the guest.
    </p>
  `);

  await transporter.sendMail({
    from: FROM,
    to: ownerEmail,
    subject: `New Booking #${data.registrationNumber} – ${data.guestName} – ${data.activityName}`,
    html,
  });
}

// ─────────────────────────────────────────
// ORGANIZATION REGISTRATION
// ─────────────────────────────────────────

export async function sendOrgRegistrationEmail(email: string, orgName: string): Promise<void> {
  const html = baseTemplate(`
    <h2 style="color:#2d5a27;margin:0 0 16px;">Organization Registration Received 🏢</h2>
    <p style="color:#4a4a4a;line-height:1.6;font-size:15px;">
      Thank you for registering <strong>${orgName}</strong> on ${APP_NAME}.
    </p>
    <p style="color:#4a4a4a;line-height:1.6;font-size:15px;">
      Your application is currently <strong>under review</strong>. Our team will verify your details
      and you will receive an email once your organization has been approved.
    </p>
    <p style="color:#8b7355;font-size:13px;">
      This process typically takes 1-2 business days.
    </p>
  `);
  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: `Organization registration received – ${APP_NAME}`,
    html,
  });
}

export async function sendOrgApprovalEmail(email: string, orgName: string): Promise<void> {
  const html = baseTemplate(`
    <h2 style="color:#2d5a27;margin:0 0 16px;">Your Organization is Approved! 🎉</h2>
    <p style="color:#4a4a4a;line-height:1.6;font-size:15px;">
      Congratulations! <strong>${orgName}</strong> has been approved on ${APP_NAME}.
    </p>
    <div style="text-align:center;">
      <a href="${APP_URL}/auth/signin" style="${btnStyle()}">Sign In Now</a>
    </div>
  `);
  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: `Organization approved – ${APP_NAME}`,
    html,
  });
}

/**
 * Sent when an organization is approved AND a new PLACE_OWNER account is created.
 * Includes the temporary password so the owner can sign in immediately.
 */
export async function sendOrgApprovedWithCredentials(
  email: string,
  orgName: string,
  ownerName: string,
  temporaryPassword: string
): Promise<void> {
  const html = baseTemplate(`
    <h2 style="color:#2d5a27;margin:0 0 16px;">Your Organization is Approved! 🎉</h2>
    <p style="color:#4a4a4a;line-height:1.6;font-size:15px;">
      Congratulations, <strong>${ownerName}</strong>! <strong>${orgName}</strong> has been approved on ${APP_NAME}.
    </p>
    <p style="color:#4a4a4a;line-height:1.6;font-size:15px;">
      An account has been created for you. Use the credentials below to sign in:
    </p>
    <div style="background:#f0f7f0;border-radius:8px;padding:20px;margin:20px 0;">
      <p style="color:#2d5a27;font-size:15px;margin:0 0 8px;"><strong>Email:</strong> ${email}</p>
      <p style="color:#2d5a27;font-size:15px;margin:0;"><strong>Temporary Password:</strong> <code style="background:#e8f5e9;padding:2px 8px;border-radius:4px;font-size:15px;">${temporaryPassword}</code></p>
    </div>
    <p style="color:#c0392b;font-size:13px;">
      ⚠️ Please change your password after your first sign-in.
    </p>
    <div style="text-align:center;">
      <a href="${APP_URL}/auth/signin" style="${btnStyle()}">Sign In Now</a>
    </div>
    <p style="color:#8b7355;font-size:12px;text-align:center;">
      You can manage your places and activities from your dashboard.
    </p>
  `);
  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: `Organization approved – your login credentials – ${APP_NAME}`,
    html,
  });
}

export async function sendOrgRejectionEmail(email: string, orgName: string, reason?: string): Promise<void> {
  const html = baseTemplate(`
    <h2 style="color:#c0392b;margin:0 0 16px;">Organization Application Update</h2>
    <p style="color:#4a4a4a;line-height:1.6;font-size:15px;">
      We're sorry to inform you that the registration for <strong>${orgName}</strong> was not approved at this time.
    </p>
    ${reason ? `<p style="color:#4a4a4a;line-height:1.6;font-size:15px;"><strong>Reason:</strong> ${reason}</p>` : ''}
    <p style="color:#4a4a4a;line-height:1.6;font-size:15px;">
      If you believe this is an error or would like to reapply, please contact us at 
      <a href="mailto:${process.env.SMTP_USER}" style="color:#4a7c59;">${process.env.SMTP_USER}</a>.
    </p>
  `);
  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: `Organization application update – ${APP_NAME}`,
    html,
  });
}
