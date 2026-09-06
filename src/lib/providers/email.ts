type EmailPayload = { to: string; subject: string; html: string; text?: string };

async function consoleEmail({ to, subject, text, html }: EmailPayload) {
  console.log(`\n✉️  [EMAIL → ${to}] ${subject}\n${text ?? html.replace(/<[^>]+>/g, " ")}\n`);
  return { id: `console_${Date.now()}` };
}

async function resendEmail({ to, subject, html, text }: EmailPayload) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is missing");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? "MediBook <no-reply@medibook.pk>",
      to,
      subject,
      html,
      text,
    }),
  });
  if (!res.ok) throw new Error(`Resend error: ${res.status} ${await res.text()}`);
  return (await res.json()) as { id: string };
}

export async function sendEmail(payload: EmailPayload) {
  const provider = process.env.EMAIL_PROVIDER ?? "console";
  try {
    return provider === "resend" ? await resendEmail(payload) : await consoleEmail(payload);
  } catch (e) {
    console.error("[email] delivery failed", e);
    return null;
  }
}

export function emailLayout(title: string, bodyHtml: string, cta?: { label: string; url: string }) {
  return `<!doctype html><html><body style="margin:0;background:#f6f7f9;font-family:system-ui,-apple-system,Segoe UI,sans-serif">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:14px;padding:32px;border:1px solid #e6e8eb">
    <div style="font-weight:700;font-size:18px;color:#0f766e;margin-bottom:20px">MediBook</div>
    <h1 style="font-size:20px;margin:0 0 12px;color:#101828">${title}</h1>
    <div style="font-size:14px;line-height:1.7;color:#475467">${bodyHtml}</div>
    ${
      cta
        ? `<a href="${cta.url}" style="display:inline-block;margin-top:22px;background:#0f766e;color:#fff;padding:11px 20px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">${cta.label}</a>`
        : ""
    }
    <p style="margin-top:28px;font-size:12px;color:#98a2b3">You're receiving this because you have a MediBook account.</p>
  </div></body></html>`;
}
