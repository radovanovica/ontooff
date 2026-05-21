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

/** Optional place branding passed through to guest-facing emails */
export interface PlaceBranding {
  name: string;
  logoUrl?: string | null;
  color?: string | null;
  phone?: string | null;
  website?: string | null;
  facebookUrl?: string | null;
  instagramUrl?: string | null;
  twitterUrl?: string | null;
  tiktokUrl?: string | null;
  youtubeUrl?: string | null;
  linkedinUrl?: string | null;
}

/** Build the From header with an optional place name override */
function buildFrom(place?: PlaceBranding): string {
  if (!place?.name) return FROM;
  // Keep the exact email address from FROM — only replace the display name.
  // This avoids sender-verification failures for non-existent addresses.
  const email = FROM.match(/<([^>]+)>/)?.[1] ?? FROM;
  const safe = place.name.replace(/[",]/g, '').trim();
  return `${safe} <${email}>`;
}

function baseTemplate(content: string, preheader = ''): string {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${APP_NAME}</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f2ede8;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>` : ''}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f2ede8;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <!--[if mso]><table role="presentation" width="600"><tr><td><![endif]-->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e0d8d0;">
          
          <!-- Header -->
          <tr>
            <td style="background-color:#2d5a27;padding:32px 48px;text-align:center;">
              <img src="${APP_URL}/assets/images/logo.svg" alt="${APP_NAME}" width="44" height="44" style="display:block;margin:0 auto 14px;border:0;" />
              <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:700;letter-spacing:2px;text-transform:uppercase;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">${APP_NAME}</h1>
              <p style="color:rgba(255,255,255,0.65);margin:6px 0 0;font-size:12px;letter-spacing:1px;text-transform:uppercase;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">Book Nature Activities</p>
            </td>
          </tr>

          <!-- Divider line -->
          <tr>
            <td style="background-color:#4a7c59;height:3px;font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:48px;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f7f4f1;border-top:1px solid #e0d8d0;padding:28px 48px;text-align:center;">
              <p style="color:#9e8e7e;font-size:12px;line-height:1.7;margin:0 0 8px;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
                You received this email because you have an account with<br/>
                <a href="${APP_URL}" style="color:#4a7c59;text-decoration:none;font-weight:600;">${APP_NAME}</a>
              </p>
              <p style="color:#b8a898;font-size:11px;margin:0;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
                &copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
        <!--[if mso]></td></tr></table><![endif]-->
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Renders a contact-info + social-links block for use inside the place-branded email template. Returns empty string when nothing to show. */
function placeContactBlock(place: PlaceBranding): string {
  const contactParts: string[] = [];
  if (place.phone) {
    contactParts.push(`<a href="tel:${place.phone}" style="color:#555048;text-decoration:none;font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:13px;">&#9990;&nbsp;${place.phone}</a>`);
  }
  if (place.website) {
    const display = place.website.replace(/^https?:\/\//, '').replace(/\/$/, '');
    contactParts.push(`<a href="${place.website}" target="_blank" style="color:#4a7c59;text-decoration:none;font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:13px;">&#127760;&nbsp;${display}</a>`);
  }

  const socials = [
    { url: place.facebookUrl, label: 'Facebook', color: '#1877F2' },
    { url: place.instagramUrl, label: 'Instagram', color: '#E4405F' },
    { url: place.twitterUrl, label: 'X / Twitter', color: '#000000' },
    { url: place.tiktokUrl, label: 'TikTok', color: '#EE1D52' },
    { url: place.youtubeUrl, label: 'YouTube', color: '#FF0000' },
    { url: place.linkedinUrl, label: 'LinkedIn', color: '#0A66C2' },
  ].filter((s): s is { url: string; label: string; color: string } => !!s.url);

  if (contactParts.length === 0 && socials.length === 0) return '';

  const contactHtml = contactParts.length > 0
    ? `<p style="margin:0 0 ${socials.length > 0 ? '14px' : '0'};line-height:2;">${contactParts.join('&nbsp;&nbsp;&bull;&nbsp;&nbsp;')}</p>`
    : '';

  const socialHtml = socials.length > 0
    ? `<p style="margin:0 0 8px;font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;color:#9e8e7e;text-transform:uppercase;letter-spacing:1px;">Follow us</p>
       <p style="margin:0;">${socials.map(s => `<a href="${s.url}" target="_blank" style="display:inline-block;margin:3px 4px;padding:5px 13px;border-radius:14px;background:${s.color};color:#ffffff;font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;font-weight:600;text-decoration:none;">${s.label}</a>`).join('')}</p>`
    : '';

  return `
          <!-- Place contact & social -->
          <tr>
            <td style="background-color:#f0ece7;border-top:1px solid #e0d8d0;padding:22px 48px;text-align:center;">
              ${contactHtml}${socialHtml}
            </td>
          </tr>`;
}

/**
 * Place-branded template for guest-facing emails (booking confirmations, reminders, etc.)
 * Shows the place logo + name in the header and only a small "Powered by ontooff" footer.
 * Falls back to baseTemplate when no place branding is provided.
 */
function placeTemplate(content: string, preheader = '', place?: PlaceBranding): string {
  if (!place) return baseTemplate(content, preheader);
  const accent = place.color ?? '#2d5a27';
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${place.name}</title>
</head>
<body style="margin:0;padding:0;background-color:#f2ede8;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>` : ''}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f2ede8;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <!--[if mso]><table role="presentation" width="600"><tr><td><![endif]-->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e0d8d0;">

          <!-- Place-branded header -->
          <tr>
            <td style="background-color:${accent};padding:32px 48px;text-align:center;">
              ${place.logoUrl
                ? `<img src="${place.logoUrl}" alt="${place.name}" width="64" height="64" style="display:block;margin:0 auto 14px;border-radius:8px;border:3px solid rgba(255,255,255,0.4);object-fit:cover;background:#fff;" />`
                : ''
              }
              <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:700;letter-spacing:0.5px;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">${place.name}</h1>
            </td>
          </tr>

          <!-- Divider line -->
          <tr>
            <td style="background-color:${accent};opacity:0.7;height:3px;font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:48px;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
              ${content}
            </td>
          </tr>
          ${placeContactBlock(place)}

          <!-- Footer: only "Powered by ontooff" -->
          <tr>
            <td style="background-color:#f7f4f1;border-top:1px solid #e0d8d0;padding:20px 48px;text-align:center;">
              <p style="color:#b8a898;font-size:11px;margin:0;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
                Powered by <a href="${APP_URL}" style="color:#4a7c59;text-decoration:none;font-weight:600;">${APP_NAME}</a>
              </p>
            </td>
          </tr>

        </table>
        <!--[if mso]></td></tr></table><![endif]-->
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Primary CTA button */
function btn(label: string, url: string, bg = '#2d5a27'): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:16px auto 0;">
    <tr>
      <td style="border-radius:6px;background:${bg};">
        <a href="${url}" target="_blank" style="display:inline-block;padding:14px 36px;font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:6px;letter-spacing:0.3px;">${label}</a>
      </td>
    </tr>
  </table>`;
}

/** Secondary (outlined) button */
function btnOutline(label: string, url: string, color = '#2d5a27'): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:12px auto 0;">
    <tr>
      <td style="border-radius:6px;border:2px solid ${color};">
        <a href="${url}" target="_blank" style="display:inline-block;padding:12px 34px;font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;font-weight:600;color:${color};text-decoration:none;border-radius:4px;letter-spacing:0.3px;">${label}</a>
      </td>
    </tr>
  </table>`;
}

/** Inline detail row for info boxes */
function detailRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:6px 0;font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;color:#6b6056;white-space:nowrap;vertical-align:top;padding-right:16px;"><strong>${label}</strong></td>
    <td style="padding:6px 0;font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;color:#3a3228;vertical-align:top;">${value}</td>
  </tr>`;
}

/** Info card wrapper */
function infoCard(rows: string, accent = '#2d5a27'): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e0d8d0;border-left:4px solid ${accent};border-radius:6px;margin:24px 0 0;">
    <tr>
      <td style="padding:20px 24px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          ${rows}
        </table>
      </td>
    </tr>
  </table>`;
}

/** Section heading (replaces emoji-heavy h3) */
function sectionHeading(text: string): string {
  return `<p style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;font-weight:700;color:#9e8e7e;text-transform:uppercase;letter-spacing:1.5px;margin:0 0 12px;">${text}</p>`;
}

// Keep legacy btnStyle for existing callers (will be phased out below)
function btnStyle(bg = '#2d5a27'): string {
  return `display:inline-block;padding:14px 32px;background:${bg};color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600;font-size:15px;`;
}

// ─────────────────────────────────────────
// EMAIL VERIFICATION
// ─────────────────────────────────────────

export async function sendVerificationEmail(email: string, token: string, name: string): Promise<void> {
  const url = `${APP_URL}/auth/verify-email?token=${token}`;
  const html = baseTemplate(`
    <h2 style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:24px;font-weight:700;color:#2d3a2e;margin:0 0 16px;">Verify your email address</h2>
    <p style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;color:#555048;line-height:1.7;margin:0 0 20px;">
      Hi <strong>${name}</strong>,
    </p>
    <p style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;color:#555048;line-height:1.7;margin:0 0 28px;">
      Thank you for creating an account with <strong>${APP_NAME}</strong>. To complete your registration
      and activate your account, please verify your email address by clicking the button below.
    </p>
    ${btn('Verify Email Address', url)}
    <p style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:13px;color:#9e8e7e;text-align:center;margin:28px 0 0;line-height:1.6;">
      This link expires in <strong>24 hours</strong>.<br/>
      If you did not create an account, no action is required &mdash; you can safely ignore this email.
    </p>
    <hr style="border:none;border-top:1px solid #e0d8d0;margin:32px 0 0;" />
    <p style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;color:#b8a898;margin:16px 0 0;">If the button doesn&rsquo;t work, copy and paste this URL into your browser:<br/><a href="${url}" style="color:#4a7c59;word-break:break-all;text-decoration:none;">${url}</a></p>
  `, `Verify your ${APP_NAME} account &mdash; please confirm your email address.`);
  await transporter.sendMail({ from: FROM, to: email, subject: `Please verify your email address – ${APP_NAME}`, html });
}

// ─────────────────────────────────────────
// WELCOME EMAIL
// ─────────────────────────────────────────

export async function sendWelcomeEmail(email: string, name: string): Promise<void> {
  const html = baseTemplate(`
    <h2 style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:24px;font-weight:700;color:#2d3a2e;margin:0 0 16px;">Welcome to ${APP_NAME}</h2>
    <p style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;color:#555048;line-height:1.7;margin:0 0 20px;">Hi <strong>${name}</strong>,</p>
    <p style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;color:#555048;line-height:1.7;margin:0 0 8px;">
      Your account is active and ready to use. You can now:
    </p>
    <ul style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;color:#555048;line-height:1.8;margin:0 0 28px;padding-left:20px;">
      <li>Browse outdoor activities and nature spots</li>
      <li>Choose your preferred location on an interactive map</li>
      <li>Complete a reservation in just a few steps</li>
    </ul>
    ${btn('Explore Activities', APP_URL)}
    <p style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:13px;color:#9e8e7e;text-align:center;margin:28px 0 0;">
      If you have any questions, simply reply to this email.
    </p>
  `, `Welcome! Your ${APP_NAME} account is ready.`);
  await transporter.sendMail({ from: FROM, to: email, subject: `Welcome to ${APP_NAME} – your account is ready`, html });
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
  /** Actual registration status — affects subject and heading copy */
  status?: string;
  /** Optional place branding for the email header */
  place?: PlaceBranding;
}

export async function sendRegistrationConfirmation(
  email: string,
  data: RegistrationEmailData
): Promise<void> {
  const editUrl = `${APP_URL}/registration/edit/${data.editToken}`;

  const breakdownRows = data.paymentBreakdown
    ? data.paymentBreakdown.map((item) => detailRow(item.label, `${data.currency} ${Number(item.totalPrice).toFixed(2)}`)).join('')
    : '';

  const paymentHtml = data.requiresPayment
    ? `<p style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;font-weight:700;color:#9e8e7e;text-transform:uppercase;letter-spacing:1.5px;margin:24px 0 12px;">Payment Summary</p>
    ${infoCard(
      breakdownRows +
      `<tr><td colspan="2" style="padding:6px 0;border-top:1px solid #e0d8d0;font-size:0;">&nbsp;</td></tr>` +
      detailRow('<strong>Total</strong>', `<strong>${data.currency} ${Number(data.totalAmount ?? 0).toFixed(2)}</strong>`) +
      (data.paymentMethod ? detailRow('Payment Method', data.paymentMethod) : '')
    )}`
    : `<p style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;color:#4a7c59;margin:24px 0 0;">This activity is free of charge.</p>`;

  const isConfirmed = data.status === 'CONFIRMED';
  const heading = isConfirmed ? 'Booking Confirmed' : 'Booking Received';
  const headingColor = isConfirmed ? '#2d5a27' : '#2d3a2e';
  const subjectLine = isConfirmed
    ? `Booking Confirmed – #${data.registrationNumber} ${data.activityName}`
    : `Booking Received – #${data.registrationNumber} ${data.activityName}`;
  const introCopy = isConfirmed
    ? `Hi <strong>${data.firstName}</strong>, your reservation has been confirmed. Please keep this email for your records.`
    : `Hi <strong>${data.firstName}</strong>, your reservation has been received and is <strong>pending confirmation</strong> from the organiser. You will receive another email once it has been reviewed.`;

  const html = placeTemplate(`
    <h2 style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:24px;font-weight:700;color:${headingColor};margin:0 0 6px;">${heading}</h2>
    <p style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:13px;font-weight:600;color:#9e8e7e;letter-spacing:0.5px;text-transform:uppercase;margin:0 0 28px;">Reservation #${data.registrationNumber}</p>

    <p style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;color:#555048;line-height:1.7;margin:0 0 24px;">${introCopy}</p>

    ${infoCard(
      detailRow('Activity', data.activityName) +
      detailRow('Location', `${data.locationName} &mdash; ${data.placeName}`) +
      detailRow('Dates', `${data.startDate} &ndash; ${data.endDate} (${data.numberOfDays} day${data.numberOfDays > 1 ? 's' : ''})`) +
      (data.spotNames.length ? detailRow('Spot(s)', data.spotNames.join(', ')) : '') +
      detailRow('Guests', data.guestSummary)
    )}

    ${paymentHtml}

    <p style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;color:#555048;line-height:1.7;margin:28px 0 0;">You can view or manage your reservation at any time using the secure link below.</p>
    ${btn('View My Reservation', editUrl, data.place?.color ?? '#2d5a27')}
    <hr style="border:none;border-top:1px solid #e0d8d0;margin:32px 0 0;" />
    <p style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;color:#b8a898;margin:16px 0 0;">
      If the button doesn&rsquo;t work, copy and paste this link into your browser:<br/>
      <a href="${editUrl}" style="color:#4a7c59;word-break:break-all;text-decoration:none;">${editUrl}</a>
    </p>
    <p style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;color:#c0b0a0;margin:8px 0 0;">
      This link is personal &mdash; please do not share it.
    </p>
  `, `Your ${data.activityName} reservation #${data.registrationNumber} is confirmed.`, data.place);

  await transporter.sendMail({
    from: buildFrom(data.place),
    to: email,
    subject: subjectLine,
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
  editToken: string,
  place?: PlaceBranding
): Promise<void> {
  const statusMessages: Record<string, { emoji: string; message: string; color: string }> = {
    CONFIRMED: { emoji: '✅', message: 'Your reservation has been confirmed!', color: '#2d5a27' },
    CANCELLED: { emoji: '❌', message: 'Your reservation has been cancelled.', color: '#c0392b' },
    COMPLETED: { emoji: '🎉', message: 'Your activity is complete. Hope you had a great time!', color: '#2d5a27' },
  };

  const info = statusMessages[status] ?? { emoji: 'ℹ️', message: `Your reservation status updated to: ${status}`, color: '#4a7c59' };
  const editUrl = `${APP_URL}/registration/edit/${editToken}`;

  const statusLabel: Record<string, string> = {
    CONFIRMED: 'Confirmed',
    CANCELLED: 'Cancelled',
    COMPLETED: 'Completed',
  };

  const html = placeTemplate(`
    <h2 style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:24px;font-weight:700;color:${info.color};margin:0 0 28px;">${info.message}</h2>
    <p style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;color:#555048;line-height:1.7;margin:0 0 24px;">Hi <strong>${firstName}</strong>,</p>
    ${infoCard(
      detailRow('Reservation', `#${registrationNumber}`) +
      detailRow('Status', `<strong style="color:${info.color};">${statusLabel[status] ?? status}</strong>`)
    , info.color)}
    <p style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;color:#555048;line-height:1.7;margin:28px 0 0;">You can view the full details of your reservation using the link below.</p>
    ${btn('View My Reservation', editUrl, place?.color ?? info.color)}
  `, `Reservation #${registrationNumber} status update from ${place?.name ?? APP_NAME}.`, place);

  await transporter.sendMail({
    from: buildFrom(place),
    to: email,
    subject: `Reservation #${registrationNumber} – Status Updated to ${statusLabel[status] ?? status}`,
    html,
  });
}

// ─────────────────────────────────────────
// PASSWORD RESET
// ─────────────────────────────────────────

export async function sendPasswordResetEmail(email: string, token: string, name = 'there'): Promise<void> {
  const url = `${APP_URL}/auth/reset-password?token=${token}`;
  const html = baseTemplate(`
    <h2 style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:24px;font-weight:700;color:#2d3a2e;margin:0 0 16px;">Password Reset Request</h2>
    <p style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;color:#555048;line-height:1.7;margin:0 0 20px;">Hi <strong>${name}</strong>,</p>
    <p style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;color:#555048;line-height:1.7;margin:0 0 28px;">
      We received a request to reset the password for the <strong>${APP_NAME}</strong> account associated with this email address.
      Click the button below to set a new password.
    </p>
    ${btn('Reset My Password', url)}
    <p style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:13px;color:#9e8e7e;text-align:center;margin:28px 0 0;line-height:1.6;">
      This link expires in <strong>1 hour</strong>.<br/>
      If you did not request a password reset, please ignore this email &mdash; your password will remain unchanged.
    </p>
    <hr style="border:none;border-top:1px solid #e0d8d0;margin:32px 0 0;" />
    <p style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;color:#b8a898;margin:16px 0 0;">If the button doesn&rsquo;t work, copy and paste this URL into your browser:<br/><a href="${url}" style="color:#4a7c59;word-break:break-all;text-decoration:none;">${url}</a></p>
  `, `Reset your ${APP_NAME} password – link valid for 1 hour.`);
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

  const html = baseTemplate(`
    <h2 style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:24px;font-weight:700;color:#2d3a2e;margin:0 0 6px;">New Booking Received</h2>
    <p style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:13px;font-weight:600;color:#9e8e7e;letter-spacing:0.5px;text-transform:uppercase;margin:0 0 28px;">Reservation #${data.registrationNumber} &mdash; ${data.placeName}</p>

    <p style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;color:#555048;line-height:1.7;margin:0 0 24px;">
      A new booking has been submitted and is <strong>pending your approval</strong>. Review the details below and confirm or manage it from your dashboard.
    </p>

    ${sectionHeading('Booking Details')}
    ${infoCard(
      detailRow('Activity', data.activityName) +
      detailRow('Location', data.locationName) +
      detailRow('Dates', `${data.startDate} &ndash; ${data.endDate} (${data.numberOfDays} day${data.numberOfDays > 1 ? 's' : ''})`) +
      (data.spotNames.length ? detailRow('Spot(s)', data.spotNames.join(', ')) : '') +
      detailRow('Guests', data.guestSummary) +
      (data.requiresPayment && data.totalAmount != null ? detailRow('Amount', `${data.currency} ${Number(data.totalAmount).toFixed(2)}`) : '')
    )}

    <p style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:13px;font-weight:700;color:#9e8e7e;text-transform:uppercase;letter-spacing:1.5px;margin:24px 0 12px;">Guest Information</p>
    ${infoCard(
      detailRow('Name', data.guestName) +
      detailRow('Email', `<a href="mailto:${data.guestEmail}" style="color:#4a7c59;text-decoration:none;">${data.guestEmail}</a>`) +
      (data.guestPhone ? detailRow('Phone', data.guestPhone) : '')
    , '#e67e22')}

    ${btn('Confirm Booking', approveUrl)}
    ${btnOutline('View in Dashboard', viewUrl)}

    <p style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;color:#b8a898;text-align:center;margin:24px 0 0;line-height:1.6;">
      Clicking &ldquo;Confirm Booking&rdquo; will immediately set the status to <strong>Confirmed</strong> and notify the guest.
    </p>
  `, `New booking #${data.registrationNumber} from ${data.guestName} – action required.`);

  await transporter.sendMail({
    from: FROM,
    to: ownerEmail,
    subject: `New Booking #${data.registrationNumber} – ${data.guestName} (${data.activityName})`,
    html,
  });
}

// ─────────────────────────────────────────
// ORGANIZATION REGISTRATION
// ─────────────────────────────────────────

export async function sendOrgRegistrationEmail(email: string, orgName: string): Promise<void> {
  const html = baseTemplate(`
    <h2 style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:24px;font-weight:700;color:#2d3a2e;margin:0 0 24px;">Application Received</h2>
    <p style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;color:#555048;line-height:1.7;margin:0 0 20px;">
      Thank you for submitting <strong>${orgName}</strong> for registration on <strong>${APP_NAME}</strong>.
    </p>
    <p style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;color:#555048;line-height:1.7;margin:0 0 20px;">
      Your application is currently <strong>under review</strong>. Our team will verify your information and
      you will receive a confirmation email once a decision has been made.
    </p>
    <p style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;color:#9e8e7e;line-height:1.7;margin:0;">
      This process typically takes 1&ndash;2 business days. If you have not heard back within that time,
      please contact us by replying to this email.
    </p>
  `, `Your ${APP_NAME} organization application for ${orgName} is under review.`);
  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: `Organization application received – ${APP_NAME}`,
    html,
  });
}

export async function sendOrgApprovalEmail(email: string, orgName: string): Promise<void> {
  const html = baseTemplate(`
    <h2 style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:24px;font-weight:700;color:#2d5a27;margin:0 0 24px;">Organization Approved</h2>
    <p style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;color:#555048;line-height:1.7;margin:0 0 20px;">
      Congratulations! <strong>${orgName}</strong> has been approved on <strong>${APP_NAME}</strong>.
    </p>
    <p style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;color:#555048;line-height:1.7;margin:0 0 28px;">
      You can now sign in and start managing your places and activities.
    </p>
    ${btn('Sign In to Your Dashboard', `${APP_URL}/auth/signin`)}
  `, `${orgName} has been approved on ${APP_NAME} – you can now sign in.`);
  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: `Your organization has been approved – ${APP_NAME}`,
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
    <h2 style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:24px;font-weight:700;color:#2d5a27;margin:0 0 24px;">Organization Approved</h2>
    <p style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;color:#555048;line-height:1.7;margin:0 0 20px;">Hi <strong>${ownerName}</strong>,</p>
    <p style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;color:#555048;line-height:1.7;margin:0 0 24px;">
      <strong>${orgName}</strong> has been approved on <strong>${APP_NAME}</strong>. An account has been created for you.
      Use the credentials below to sign in for the first time.
    </p>
    ${infoCard(
      detailRow('Email', email) +
      detailRow('Temporary Password', `<code style="background:#eef5ee;padding:2px 8px;border-radius:4px;font-size:14px;font-family:monospace;color:#2d5a27;">${temporaryPassword}</code>`)
    )}
    <p style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;color:#c0392b;line-height:1.7;margin:20px 0 28px;">
      <strong>Important:</strong> Please change your password immediately after your first sign-in.
    </p>
    ${btn('Sign In to Your Dashboard', `${APP_URL}/auth/signin`)}
    <p style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:13px;color:#9e8e7e;text-align:center;margin:20px 0 0;">
      From your dashboard you can manage places, activities, and bookings.
    </p>
  `, `Your ${APP_NAME} account is ready – sign in with the credentials provided.`);
  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: `Organization approved – sign-in credentials enclosed – ${APP_NAME}`,
    html,
  });
}

export async function sendAdminNewOrgNotification(adminEmail: string, org: {
  name: string;
  email: string;
  phone?: string | null;
  city?: string | null;
  country?: string | null;
  website?: string | null;
  description?: string | null;
}): Promise<void> {
  const reviewUrl = `${APP_URL}/admin/organizations`;
  const html = baseTemplate(`
    <h2 style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:24px;font-weight:700;color:#2d3a2e;margin:0 0 6px;">New Organization Application</h2>
    <p style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:13px;font-weight:600;color:#9e8e7e;letter-spacing:0.5px;text-transform:uppercase;margin:0 0 28px;">Pending Review</p>
    <p style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;color:#555048;line-height:1.7;margin:0 0 24px;">
      A new organization has submitted a registration request and is awaiting your review.
    </p>
    ${sectionHeading('Organization Details')}
    ${infoCard(
      detailRow('Name', org.name) +
      detailRow('Email', `<a href="mailto:${org.email}" style="color:#4a7c59;text-decoration:none;">${org.email}</a>`) +
      (org.phone ? detailRow('Phone', org.phone) : '') +
      ((org.city || org.country) ? detailRow('Location', [org.city, org.country].filter(Boolean).join(', ')) : '') +
      (org.website ? detailRow('Website', `<a href="${org.website}" style="color:#4a7c59;text-decoration:none;">${org.website}</a>`) : '') +
      (org.description ? detailRow('Description', org.description) : '')
    )}
    ${btn('Review in Admin Panel', reviewUrl)}
    <p style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;color:#b8a898;text-align:center;margin:20px 0 0;">
      Sign in to approve or reject this registration.
    </p>
  `, `New organization application from ${org.name} – review required.`);
  await transporter.sendMail({
    from: FROM,
    to: adminEmail,
    subject: `New Organization Application: ${org.name} – action required`,
    html,
  });
}

export async function sendOrgRejectionEmail(email: string, orgName: string, reason?: string): Promise<void> {
  const supportEmail = process.env.SUPPORT_EMAIL ?? process.env.SMTP_USER ?? '';
  const html = baseTemplate(`
    <h2 style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:24px;font-weight:700;color:#2d3a2e;margin:0 0 24px;">Organization Application Update</h2>
    <p style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;color:#555048;line-height:1.7;margin:0 0 20px;">
      Thank you for your interest in <strong>${APP_NAME}</strong>.
    </p>
    <p style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;color:#555048;line-height:1.7;margin:0 0 20px;">
      After reviewing your application, we are unable to approve <strong>${orgName}</strong> at this time.
    </p>
    ${reason ? infoCard(detailRow('Reason', reason), '#c0392b') : ''}
    <p style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;color:#555048;line-height:1.7;margin:24px 0 0;">
      If you believe this decision was made in error, or if you have additional information to provide,
      please contact us at <a href="mailto:${supportEmail}" style="color:#4a7c59;text-decoration:none;">${supportEmail}</a>
      and we will be happy to review your case.
    </p>
  `, `Update regarding your ${APP_NAME} organization application for ${orgName}.`);
  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: `Your organization application – ${APP_NAME}`,
    html,
  });
}

// ─────────────────────────────────────────
// RESERVATION REMINDER (sent before check-in)
// ─────────────────────────────────────────

export interface ReservationReminderData {
  registrationNumber: string;
  firstName: string;
  activityName: string;
  locationName: string;
  startDate: string;
  daysUntil: number;
  editToken: string;
  place?: PlaceBranding;
}

export async function sendReservationReminder(
  email: string,
  data: ReservationReminderData
): Promise<void> {
  const editUrl = `${APP_URL}/registration/edit/${data.editToken}`;
  const accent = data.place?.color ?? '#2d5a27';
  const daysText = data.daysUntil === 1 ? 'tomorrow' : `in ${data.daysUntil} days`;

  const html = placeTemplate(`
    <h2 style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:24px;font-weight:700;color:${accent};margin:0 0 6px;">Your activity is coming up!</h2>
    <p style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;color:#555048;line-height:1.7;margin:0 0 24px;">
      Hi <strong>${data.firstName}</strong>, just a friendly reminder that your reservation starts <strong>${daysText}</strong>.
    </p>
    ${infoCard(
      detailRow('Activity', data.activityName) +
      detailRow('Location', data.locationName) +
      detailRow('Starts', data.startDate) +
      detailRow('Reservation', `#${data.registrationNumber}`)
    , accent)}
    <p style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;color:#555048;line-height:1.7;margin:28px 0 0;">
      Need to make changes? You can update your reservation using the link below.
    </p>
    ${btn('View My Reservation', editUrl, accent)}
  `, `Reminder: your ${data.activityName} reservation starts ${daysText}.`, data.place);

  await transporter.sendMail({
    from: buildFrom(data.place),
    to: email,
    subject: `Reminder: ${data.activityName} starts ${daysText} — #${data.registrationNumber}`,
    html,
  });
}

// ─────────────────────────────────────────
// REVIEW REQUEST (sent after stay is completed)
// ─────────────────────────────────────────

export interface ReviewRequestData {
  firstName: string;
  activityName: string;
  placeSlug: string;
  editToken: string;
  place?: PlaceBranding;
}

export async function sendReviewRequest(
  email: string,
  data: ReviewRequestData
): Promise<void> {
  const reviewUrl = `${APP_URL}/places/${data.placeSlug}?editToken=${data.editToken}`;
  const accent = data.place?.color ?? '#2d5a27';

  const html = placeTemplate(`
    <h2 style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:24px;font-weight:700;color:${accent};margin:0 0 6px;">How was your experience?</h2>
    <p style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;color:#555048;line-height:1.7;margin:0 0 24px;">
      Hi <strong>${data.firstName}</strong>, we hope you enjoyed your <strong>${data.activityName}</strong>!
      Your feedback helps us improve and helps others discover great experiences.
    </p>
    <p style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;color:#555048;line-height:1.7;margin:0 0 28px;">
      It only takes a minute — we'd love to hear what you think.
    </p>
    ${btn('Leave a Review', reviewUrl, accent)}
    <p style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:13px;color:#9e8e7e;text-align:center;margin:20px 0 0;">
      If you did not recently complete an activity with us, you can safely ignore this email.
    </p>
  `, `Share your feedback on ${data.activityName} — leave a review!`, data.place);

  await transporter.sendMail({
    from: buildFrom(data.place),
    to: email,
    subject: `How was your ${data.activityName}? Leave us a review`,
    html,
  });
}

// ─────────────────────────────────────────
// COME BACK EMAIL (re-engagement)
// ─────────────────────────────────────────

export interface ComeBackEmailData {
  firstName: string;
  placeSlug: string;
  place?: PlaceBranding;
}

export async function sendComeBackEmail(
  email: string,
  data: ComeBackEmailData
): Promise<void> {
  const placeUrl = `${APP_URL}/places/${data.placeSlug}`;
  const accent = data.place?.color ?? '#2d5a27';
  const placeName = data.place?.name ?? APP_NAME;

  const html = placeTemplate(`
    <h2 style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:24px;font-weight:700;color:${accent};margin:0 0 6px;">We miss you, ${data.firstName}!</h2>
    <p style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;color:#555048;line-height:1.7;margin:0 0 24px;">
      It's been a while since your last visit. We have plenty of activities waiting for you at
      <strong>${placeName}</strong> — why not come back and explore?
    </p>
    <p style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;color:#555048;line-height:1.7;margin:0 0 28px;">
      Browse available spots and book your next adventure today.
    </p>
    ${btn('Explore Activities', placeUrl, accent)}
    <p style="font-family:'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;color:#b8a898;text-align:center;margin:24px 0 0;">
      You are receiving this email because you previously booked an activity with ${placeName}.
    </p>
  `, `Come back and book your next adventure at ${placeName}!`, data.place);

  await transporter.sendMail({
    from: buildFrom(data.place),
    to: email,
    subject: `We'd love to see you again at ${placeName}, ${data.firstName}`,
    html,
  });
}
