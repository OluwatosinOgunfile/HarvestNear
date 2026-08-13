import "server-only";

type BrandedEmailInput = {
  eyebrow: string;
  title: string;
  firstName: string;
  intro: string;
  contentHtml?: string;
  action?: { label: string; href: string };
  footerNote: string;
};

const brand = {
  green: "#17633f",
  dark: "#10261a",
  gold: "#d7a51e",
  canvas: "#f4f7f1",
  muted: "#66756b",
  border: "#dbe4d9",
};

export async function sendPasswordResetCode(email: string, firstName: string, code: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.PASSWORD_RESET_FROM_EMAIL || "HarvestNearU <accounts@harvestnearu.com>";
  if (!apiKey) {
    if (process.env.NODE_ENV !== "production") console.info(`Password reset code for ${email}: ${code}`);
    return false;
  }

  const appUrl = getAppUrl();
  const html = brandedEmail({
    eyebrow: "ACCOUNT SECURITY",
    title: "Reset your password",
    firstName,
    intro: "Use the verification code below to continue resetting your HarvestNearU password.",
    contentHtml: `<div style="margin:28px 0;padding:22px 16px;border:1px solid ${brand.border};border-radius:12px;background:#f1f6ed;text-align:center"><div style="font-size:12px;font-weight:800;color:${brand.muted};text-transform:uppercase;letter-spacing:1.2px">Your reset code</div><div style="margin-top:8px;font-family:Manrope,Segoe UI,Arial,sans-serif;font-size:34px;line-height:1.2;font-weight:800;letter-spacing:7px;color:${brand.dark}">${escapeHtml(code)}</div><div style="margin-top:10px;font-size:13px;color:${brand.muted}">Expires in 15 minutes</div></div>`,
    action: { label: "Return to HarvestNearU", href: appUrl },
    footerNote: "If you did not request a password reset, you can safely ignore this email. Your password has not changed.",
  });

  await sendWithResend({
    apiKey,
    from,
    to: email,
    subject: "Your HarvestNearU password reset code",
    html,
    text: `Hello ${firstName},\n\nYour HarvestNearU password reset code is ${code}. It expires in 15 minutes.\n\nIf you did not request this, you can safely ignore this email.`,
    errorLabel: "password reset message",
  });
  return true;
}

export async function sendNotificationEmail(input: { email: string; firstName: string; title: string; message: string; actionUrl: string | null }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured");
  const from = process.env.NOTIFICATION_FROM_EMAIL || process.env.PASSWORD_RESET_FROM_EMAIL || "HarvestNearU <notifications@harvestnearu.com>";
  const href = notificationUrl(input.actionUrl);
  const isWelcome = input.title.toLowerCase().startsWith("welcome");
  const actionLabel = isWelcome ? "Set up your account" : "View this update";
  const footerNote = isWelcome
    ? "You are receiving this welcome email because a HarvestNearU account was created with this address."
    : "You are receiving this email because this activity affects your HarvestNearU account. You can manage notification email preferences from your profile.";

  await sendWithResend({
    apiKey,
    from,
    to: input.email,
    subject: input.title,
    html: brandedEmail({
      eyebrow: isWelcome ? "WELCOME TO HARVESTNEARU" : "ACCOUNT UPDATE",
      title: input.title,
      firstName: input.firstName,
      intro: input.message,
      action: { label: actionLabel, href },
      footerNote,
    }),
    text: `Hello ${input.firstName},\n\n${input.title}\n\n${input.message}\n\n${actionLabel}: ${href}\n\n${footerNote}`,
    errorLabel: "notification",
  });
}

function brandedEmail(input: BrandedEmailInput) {
  const appUrl = getAppUrl();
  const logoUrl = `${appUrl}/brand/harvestnearu-header-lockup.png`;
  const preheader = escapeHtml(`${input.title}: ${input.intro}`.slice(0, 140));
  const action = input.action
    ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:26px 0 4px"><tr><td bgcolor="${brand.green}" style="border-radius:9px"><a href="${escapeHtml(input.action.href)}" style="display:inline-block;padding:14px 22px;font-family:Manrope,Segoe UI,Arial,sans-serif;font-size:15px;font-weight:800;color:#ffffff;text-decoration:none">${escapeHtml(input.action.label)} &nbsp;&rarr;</a></td></tr></table>`
    : "";

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(input.title)}</title></head><body style="margin:0;padding:0;background:${brand.canvas};color:${brand.dark}"><div style="display:none;max-height:0;overflow:hidden;opacity:0">${preheader}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:${brand.canvas}"><tr><td align="center" style="padding:28px 12px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px"><tr><td style="padding:0 4px 18px"><a href="${appUrl}" style="text-decoration:none"><img src="${logoUrl}" width="210" alt="HarvestNearU" style="display:block;width:210px;max-width:70%;height:auto;border:0"></a></td></tr><tr><td style="height:5px;background:${brand.gold};border-radius:14px 14px 0 0"></td></tr><tr><td style="padding:36px 38px;background:#ffffff;border-right:1px solid ${brand.border};border-left:1px solid ${brand.border}"><div style="font-family:Manrope,Segoe UI,Arial,sans-serif;font-size:11px;line-height:1.4;font-weight:800;letter-spacing:1.4px;color:${brand.green}">${escapeHtml(input.eyebrow)}</div><h1 style="margin:10px 0 20px;font-family:Georgia,Times New Roman,serif;font-size:32px;line-height:1.2;font-weight:normal;color:${brand.dark}">${escapeHtml(input.title)}</h1><p style="margin:0 0 14px;font-family:Manrope,Segoe UI,Arial,sans-serif;font-size:16px;line-height:1.65;color:${brand.dark}">Hello ${escapeHtml(input.firstName || "there")},</p><p style="margin:0;font-family:Manrope,Segoe UI,Arial,sans-serif;font-size:16px;line-height:1.65;color:${brand.dark}">${formatText(input.intro)}</p>${input.contentHtml || ""}${action}</td></tr><tr><td style="padding:24px 38px;background:${brand.dark};border-radius:0 0 14px 14px"><p style="margin:0 0 9px;font-family:Manrope,Segoe UI,Arial,sans-serif;font-size:13px;line-height:1.6;color:#dce8df">Fresh local produce, found near you.</p><p style="margin:0;font-family:Manrope,Segoe UI,Arial,sans-serif;font-size:11px;line-height:1.6;color:#aebdb3">${escapeHtml(input.footerNote)}</p><p style="margin:13px 0 0;font-family:Manrope,Segoe UI,Arial,sans-serif;font-size:11px;color:#aebdb3"><a href="${appUrl}/help" style="color:#d9c05a;text-decoration:none">Help centre</a>&nbsp;&nbsp;&middot;&nbsp;&nbsp;<a href="${appUrl}/profile" style="color:#d9c05a;text-decoration:none">Email preferences</a>&nbsp;&nbsp;&middot;&nbsp;&nbsp;<a href="${appUrl}" style="color:#d9c05a;text-decoration:none">harvestnearu.com</a></p></td></tr></table></td></tr></table></body></html>`;
}

async function sendWithResend(input: { apiKey: string; from: string; to: string; subject: string; html: string; text: string; errorLabel: string }) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${input.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: input.from, to: [input.to], subject: input.subject, html: input.html, text: input.text }),
  });
  if (!response.ok) throw new Error(`Email provider rejected ${input.errorLabel} (${response.status})`);
}

function getAppUrl() {
  return (process.env.APP_URL || "https://www.harvestnearu.com").replace(/\/$/, "");
}

function notificationUrl(actionUrl: string | null) {
  const appUrl = getAppUrl();
  return actionUrl?.startsWith("/") ? `${appUrl}${actionUrl}` : appUrl;
}

function formatText(value: string) {
  return escapeHtml(value).replace(/\r?\n/g, "<br>");
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character]!);
}
