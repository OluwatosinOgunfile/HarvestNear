import "server-only";

export async function sendPasswordResetCode(email: string, firstName: string, code: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.PASSWORD_RESET_FROM_EMAIL || "HarvestNearU <accounts@harvestnearu.com>";
  if (!apiKey) {
    if (process.env.NODE_ENV !== "production") console.info(`Password reset code for ${email}: ${code}`);
    return false;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "Your HarvestNearU password reset code",
      html: `<div style="font-family:Arial,sans-serif;color:#173322;max-width:520px;margin:auto"><h1 style="font-size:24px">Reset your password</h1><p>Hello ${escapeHtml(firstName)},</p><p>Enter this code in the HarvestNearU app:</p><p style="font-size:32px;font-weight:800;letter-spacing:8px;background:#f1f6ed;padding:18px;text-align:center;border-radius:10px">${code}</p><p>This code expires in 15 minutes. If you did not request it, you can ignore this email.</p></div>`,
    }),
  });
  if (!response.ok) throw new Error(`Email provider rejected password reset message (${response.status})`);
  return true;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character]!);
}
