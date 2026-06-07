const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendClaimApproved({ toEmail, toName, shiftTitle, startTime, facilityName }) {
  const date = new Date(startTime).toLocaleString([], {
    weekday: 'long', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  await resend.emails.send({
    from: 'MediSync <onboarding@resend.dev>',
    to: toEmail,
    subject: `You've been approved for "${shiftTitle}"`,
    html: `
      <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#fbf8ff;border-radius:16px;">
        <div style="background:linear-gradient(135deg,#5e0084,#8d2955);border-radius:12px;padding:24px;margin-bottom:24px;">
          <h1 style="color:#fff;margin:0;font-size:22px;">MediSync</h1>
        </div>
        <h2 style="color:#161a2e;font-size:20px;">Hi ${toName}, you're confirmed!</h2>
        <p style="color:#4e4351;font-size:15px;line-height:1.6;">
          Your application for <strong>${shiftTitle}</strong> at <strong>${facilityName}</strong> has been <span style="color:#15803d;font-weight:700;">approved</span>.
        </p>
        <div style="background:#fff;border:1px solid #DEDFF0;border-radius:12px;padding:16px;margin:20px 0;">
          <p style="margin:0;color:#4e4351;font-size:14px;"><strong>Shift:</strong> ${shiftTitle}</p>
          <p style="margin:8px 0 0;color:#4e4351;font-size:14px;"><strong>When:</strong> ${date}</p>
          <p style="margin:8px 0 0;color:#4e4351;font-size:14px;"><strong>Facility:</strong> ${facilityName}</p>
        </div>
        <a href="https://medhelpsync.netlify.app/dashboard.html"
           style="display:inline-block;background:#5e0084;color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;">
          View My Shifts
        </a>
        <p style="color:#4e4351;font-size:12px;margin-top:24px;">MediSync · Caregiver Coordination Platform</p>
      </div>
    `,
  });
}

async function sendShiftCancelled({ toEmail, toName, shiftTitle, startTime, facilityName }) {
  const date = new Date(startTime).toLocaleString([], {
    weekday: 'long', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  await resend.emails.send({
    from: 'MediSync <onboarding@resend.dev>',
    to: toEmail,
    subject: `Shift Cancelled: "${shiftTitle}"`,
    html: `
      <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#fbf8ff;border-radius:16px;">
        <div style="background:linear-gradient(135deg,#5e0084,#8d2955);border-radius:12px;padding:24px;margin-bottom:24px;">
          <h1 style="color:#fff;margin:0;font-size:22px;">MediSync</h1>
        </div>
        <h2 style="color:#161a2e;font-size:20px;">Hi ${toName}, a shift was cancelled</h2>
        <p style="color:#4e4351;font-size:15px;line-height:1.6;">
          Unfortunately, <strong>${shiftTitle}</strong> at <strong>${facilityName}</strong> scheduled for <strong>${date}</strong> has been <span style="color:#b91c1c;font-weight:700;">cancelled</span> by the facility.
        </p>
        <div style="background:#fff;border:1px solid #DEDFF0;border-radius:12px;padding:16px;margin:20px 0;">
          <p style="margin:0;color:#4e4351;font-size:14px;"><strong>Shift:</strong> ${shiftTitle}</p>
          <p style="margin:8px 0 0;color:#4e4351;font-size:14px;"><strong>Was scheduled:</strong> ${date}</p>
          <p style="margin:8px 0 0;color:#4e4351;font-size:14px;"><strong>Facility:</strong> ${facilityName}</p>
        </div>
        <a href="https://medhelpsync.netlify.app/shifts.html"
           style="display:inline-block;background:#5e0084;color:#fff;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;">
          Browse Shifts
        </a>
        <p style="color:#4e4351;font-size:12px;margin-top:24px;">MediSync · Caregiver Coordination Platform</p>
      </div>
    `,
  });
}

module.exports = { sendClaimApproved, sendShiftCancelled };
