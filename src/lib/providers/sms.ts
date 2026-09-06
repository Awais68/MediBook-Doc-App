/**
 * SMS transport. `console` prints to the server log so OTP login works in dev
 * with zero configuration; swap SMS_PROVIDER=twilio in production.
 */
type SmsPayload = { to: string; body: string };

async function consoleSms({ to, body }: SmsPayload) {
  console.log(`\n📱 [SMS → ${to}]\n${body}\n`);
  return { id: `console_${Date.now()}` };
}

async function twilioSms({ to, body }: SmsPayload) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!sid || !token || !from) throw new Error("Twilio env vars are missing");

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: to, From: from, Body: body }),
  });
  if (!res.ok) throw new Error(`Twilio error: ${res.status} ${await res.text()}`);
  return (await res.json()) as { sid: string };
}

export async function sendSms(payload: SmsPayload) {
  const provider = process.env.SMS_PROVIDER ?? "console";
  try {
    return provider === "twilio" ? await twilioSms(payload) : await consoleSms(payload);
  } catch (e) {
    // Never let a transport failure break the user's flow — log and move on.
    console.error("[sms] delivery failed", e);
    return null;
  }
}
