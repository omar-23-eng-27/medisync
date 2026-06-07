const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = 'MediSync <onboarding@resend.dev>';
const APP_URL = 'https://medhelpsync.netlify.app';

function btn(href, label) {
  return `<a href="${href}" style="display:inline-block;background:#5e0084;color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;">${label}</a>`;
}

function card(rows) {
  return `<div style="background:#fff;border:1px solid #DEDFF0;border-radius:12px;padding:16px;margin:20px 0;">
    ${rows.map(([k, v]) => `<p style="margin:${rows.indexOf([k,v])===0?'0':'8px 0 0'};color:#4e4351;font-size:14px;"><strong>${k}:</strong> ${v}</p>`).join('')}
  </div>`;
}

function wrap(body) {
  return `
    <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#fbf8ff;border-radius:16px;">
      <div style="background:linear-gradient(135deg,#5e0084,#8d2955);border-radius:12px;padding:24px;margin-bottom:24px;">
        <h1 style="color:#fff;margin:0;font-size:22px;">MediSync</h1>
        <p style="color:#fff;opacity:0.75;margin:4px 0 0;font-size:13px;">Caregiver Coordination Platform</p>
      </div>
      ${body}
      <p style="color:#4e4351;font-size:12px;margin-top:24px;">MediSync · Caregiver Coordination Platform</p>
    </div>`;
}

// ── Welcome email on registration ────────────────────────────────────────────
async function sendWelcome({ toEmail, toName }) {
  await resend.emails.send({
    from: FROM,
    to: toEmail,
    subject: `Welcome to MediSync, ${toName}!`,
    html: wrap(`
      <h2 style="color:#161a2e;font-size:20px;">Welcome aboard, ${toName}!</h2>
      <p style="color:#4e4351;font-size:15px;line-height:1.6;">
        Your MediSync account is ready. Browse open shifts, track your earnings, and earn rewards for every shift you complete.
      </p>
      <div style="background:#fff;border:1px solid #DEDFF0;border-radius:12px;padding:16px;margin:20px 0;">
        <p style="margin:0;color:#4e4351;font-size:14px;">🎁 <strong>500 bonus points</strong> added to your account as a welcome gift</p>
        <p style="margin:8px 0 0;color:#4e4351;font-size:14px;">💰 Earn <strong>100 points per hour</strong> worked</p>
        <p style="margin:8px 0 0;color:#4e4351;font-size:14px;">👥 Earn <strong>5,000 points</strong> for every successful referral</p>
      </div>
      ${btn(`${APP_URL}/dashboard.html`, 'Go to Dashboard')}
    `),
  });
}

// ── Claim approved ───────────────────────────────────────────────────────────
async function sendClaimApproved({ toEmail, toName, shiftTitle, startTime, facilityName }) {
  const date = new Date(startTime).toLocaleString([], { weekday:'long', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit' });
  await resend.emails.send({
    from: FROM,
    to: toEmail,
    subject: `You've been approved for "${shiftTitle}"`,
    html: wrap(`
      <h2 style="color:#161a2e;font-size:20px;">Hi ${toName}, you're confirmed!</h2>
      <p style="color:#4e4351;font-size:15px;line-height:1.6;">
        Your application for <strong>${shiftTitle}</strong> at <strong>${facilityName}</strong> has been <span style="color:#15803d;font-weight:700;">approved</span>.
      </p>
      <div style="background:#fff;border:1px solid #DEDFF0;border-radius:12px;padding:16px;margin:20px 0;">
        <p style="margin:0;color:#4e4351;font-size:14px;"><strong>Shift:</strong> ${shiftTitle}</p>
        <p style="margin:8px 0 0;color:#4e4351;font-size:14px;"><strong>When:</strong> ${date}</p>
        <p style="margin:8px 0 0;color:#4e4351;font-size:14px;"><strong>Facility:</strong> ${facilityName}</p>
      </div>
      ${btn(`${APP_URL}/dashboard.html`, 'View My Shifts')}
    `),
  });
}

// ── Claim rejected ───────────────────────────────────────────────────────────
async function sendClaimRejected({ toEmail, toName, shiftTitle, facilityName }) {
  await resend.emails.send({
    from: FROM,
    to: toEmail,
    subject: `Application update for "${shiftTitle}"`,
    html: wrap(`
      <h2 style="color:#161a2e;font-size:20px;">Hi ${toName}, an update on your application</h2>
      <p style="color:#4e4351;font-size:15px;line-height:1.6;">
        Unfortunately your application for <strong>${shiftTitle}</strong> at <strong>${facilityName}</strong> was not selected this time. Don't be discouraged — new shifts are posted daily.
      </p>
      ${btn(`${APP_URL}/shifts.html`, 'Browse Open Shifts')}
    `),
  });
}

// ── Shift cancelled ──────────────────────────────────────────────────────────
async function sendShiftCancelled({ toEmail, toName, shiftTitle, startTime, facilityName }) {
  const date = new Date(startTime).toLocaleString([], { weekday:'long', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit' });
  await resend.emails.send({
    from: FROM,
    to: toEmail,
    subject: `Shift Cancelled: "${shiftTitle}"`,
    html: wrap(`
      <h2 style="color:#161a2e;font-size:20px;">Hi ${toName}, a shift was cancelled</h2>
      <p style="color:#4e4351;font-size:15px;line-height:1.6;">
        Unfortunately <strong>${shiftTitle}</strong> at <strong>${facilityName}</strong> on <strong>${date}</strong> has been <span style="color:#b91c1c;font-weight:700;">cancelled</span> by the facility.
      </p>
      ${btn(`${APP_URL}/shifts.html`, 'Browse Other Shifts')}
    `),
  });
}

// ── Referral invite ──────────────────────────────────────────────────────────
async function sendReferralInvite({ toEmail, toName, fromName, referralCode }) {
  await resend.emails.send({
    from: FROM,
    to: toEmail,
    subject: `${fromName} invited you to join MediSync`,
    html: wrap(`
      <h2 style="color:#161a2e;font-size:20px;">You've been invited to MediSync!</h2>
      <p style="color:#4e4351;font-size:15px;line-height:1.6;">
        <strong>${fromName}</strong> thinks you'd be a great fit on MediSync — the platform where caregivers find shifts, earn rewards, and get paid faster.
      </p>
      <div style="background:#fff;border:1px solid #DEDFF0;border-radius:12px;padding:16px;margin:20px 0;">
        <p style="margin:0;color:#4e4351;font-size:14px;">Use referral code <strong style="color:#5e0084;font-size:16px;">${referralCode}</strong> when signing up</p>
        <p style="margin:8px 0 0;color:#4e4351;font-size:14px;">🎁 You'll both earn <strong>5,000 bonus points ($50)</strong> when you complete your first shift</p>
      </div>
      ${btn(`${APP_URL}/login.html`, 'Create Your Account')}
    `),
  });
}

// ── Profile updated ──────────────────────────────────────────────────────────
async function sendProfileUpdated({ toEmail, toName }) {
  await resend.emails.send({
    from: FROM,
    to: toEmail,
    subject: 'Your MediSync profile was updated',
    html: wrap(`
      <h2 style="color:#161a2e;font-size:20px;">Profile updated, ${toName}</h2>
      <p style="color:#4e4351;font-size:15px;line-height:1.6;">
        Your MediSync profile was successfully updated. If you did not make this change, please contact support immediately.
      </p>
      ${btn(`${APP_URL}/profile.html`, 'View My Profile')}
    `),
  });
}

// ── New message notification ─────────────────────────────────────────────────
async function sendNewMessage({ toEmail, toName, fromName, preview }) {
  await resend.emails.send({
    from: FROM,
    to: toEmail,
    subject: `New message from ${fromName}`,
    html: wrap(`
      <h2 style="color:#161a2e;font-size:20px;">New message, ${toName}</h2>
      <p style="color:#4e4351;font-size:15px;line-height:1.6;">
        <strong>${fromName}</strong> sent you a message on MediSync:
      </p>
      <div style="background:#fff;border-left:4px solid #5e0084;border-radius:0 12px 12px 0;padding:16px;margin:20px 0;">
        <p style="margin:0;color:#161a2e;font-size:14px;font-style:italic;">"${preview}"</p>
      </div>
      ${btn(`${APP_URL}/dashboard.html`, 'Reply on MediSync')}
    `),
  });
}

module.exports = {
  sendWelcome,
  sendClaimApproved,
  sendClaimRejected,
  sendShiftCancelled,
  sendReferralInvite,
  sendProfileUpdated,
  sendNewMessage,
};
