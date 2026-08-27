// IG takedown alert emails (Resend via Lovable connector gateway).
const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
const APP_BASE = "https://rahulgupta.site";

const PRIMARY_TO = "Alert-Dk@rahulgupta.site";
const FALLBACK_TO = "byahutrahulgupta1200@gmail.com";
const FROM = "DistroKid Studio <alerts@rahulgupta.site>";

export type IgAlertKind = "down" | "recovered";

export type IgAlertInput = {
  kind: IgAlertKind;
  releaseId: string;
  accountId: string | null;
  releaseTitle: string | null;
  artistName: string | null;
  albumUid: string | null;
  upc: string | null;
  trackId?: string | null;
  trackTitle?: string | null;
  igAudioUrl: string | null;
  lastLiveAt?: string | null;
  httpStatus?: number | null;
};

function ist(iso?: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }) + " IST";
  } catch {
    return iso;
  }
}

function esc(s: string | null | undefined): string {
  return String(s ?? "—").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c] as string));
}

function releaseUrl(i: IgAlertInput): string {
  return i.accountId
    ? `${APP_BASE}/personal/distrokid/accounts/${i.accountId}/releases/${i.releaseId}`
    : `${APP_BASE}/personal/distrokid/releases`;
}

function buildEmail(i: IgAlertInput): { subject: string; html: string } {
  const down = i.kind === "down";
  const who = `${i.releaseTitle || "Untitled release"}${i.artistName ? ` (${i.artistName})` : ""}`;
  const subject = down
    ? `⚠️ IG Audio DOWN — ${who}`
    : `✅ IG Audio back LIVE — ${who}`;

  const rows: Array<[string, string]> = [
    ["Release", esc(i.releaseTitle)],
    ["Artist", esc(i.artistName)],
    ["Track", esc(i.trackTitle)],
    ["Album UID", esc(i.albumUid)],
    ["UPC", esc(i.upc)],
    ["Instagram audio", i.igAudioUrl ? `<a href="${esc(i.igAudioUrl)}" style="color:#2563eb">${esc(i.igAudioUrl)}</a>` : "—"],
    ["Last seen live", ist(i.lastLiveAt)],
    ["Detected at", ist(new Date().toISOString())],
    ["HTTP status", esc(i.httpStatus == null ? null : String(i.httpStatus))],
  ];

  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#f6f7f9;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111827">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden">
    <div style="padding:18px 22px;background:${down ? "#7f1d1d" : "#065f46"};color:#ffffff">
      <div style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;opacity:.8">DistroKid Studio</div>
      <div style="font-size:19px;font-weight:700;margin-top:4px">${down ? "Attention: Instagram audio takedown" : "Instagram audio recovered"}</div>
    </div>
    <div style="padding:20px 22px">
      <p style="margin:0 0 14px;font-size:14px;line-height:1.6">${
        down
          ? "Is release ka Instagram audio ab us URL par nahi mil raha — lagta hai takedown / delete ho gaya hai. Please check karo."
          : "Good news — is release ka Instagram audio dobara live mil raha hai."
      }</p>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        ${rows
          .map(
            ([k, v]) =>
              `<tr><td style="padding:7px 0;color:#6b7280;width:38%;vertical-align:top">${k}</td><td style="padding:7px 0;word-break:break-word">${v}</td></tr>`,
          )
          .join("")}
      </table>
      <div style="margin-top:20px">
        <a href="${releaseUrl(i)}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-size:14px;font-weight:600">Open release in DK Studio</a>
      </div>
      <p style="margin:18px 0 0;font-size:12px;color:#6b7280">${esc(releaseUrl(i))}</p>
    </div>
  </div>
</body></html>`;

  return { subject, html };
}

async function resendSend(to: string, subject: string, html: string) {
  const LOVABLE_API_KEY = process.env["LOVABLE_API_KEY"];
  const RESEND_API_KEY = process.env["RESEND_API_KEY"];
  if (!LOVABLE_API_KEY || !RESEND_API_KEY) throw new Error("Resend connector not configured");

  const res = await fetch(`${GATEWAY_URL}/emails`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": RESEND_API_KEY,
    },
    body: JSON.stringify({ from: FROM, to: [to], subject, html }),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`[${res.status}] ${body}`);
  let id: string | null = null;
  try {
    id = (JSON.parse(body) as { id?: string }).id ?? null;
  } catch { /* ignore */ }
  return id;
}

/**
 * Sends the alert to the primary inbox, falling back to Gmail on failure.
 * Always logs the outcome to distrokid_ig_alerts; never throws.
 */
export async function sendIgAlertEmail(
  admin: { from: (t: string) => any },
  input: IgAlertInput,
): Promise<{ ok: boolean; to: string; error?: string }> {
  const { subject, html } = buildEmail(input);
  const attempts = [PRIMARY_TO, FALLBACK_TO];
  let lastErr = "";

  for (const to of attempts) {
    try {
      const providerId = await resendSend(to, subject, html);
      await admin.from("distrokid_ig_alerts").insert({
        release_id: input.releaseId,
        track_id: input.trackId ?? null,
        kind: input.kind,
        to_email: to,
        status: "sent",
        provider_id: providerId,
        ig_audio_url: input.igAudioUrl,
      });
      return { ok: true, to };
    } catch (e) {
      lastErr = (e as Error).message;
      console.error(`ig alert email failed for ${to}: ${lastErr}`);
      await admin.from("distrokid_ig_alerts").insert({
        release_id: input.releaseId,
        track_id: input.trackId ?? null,
        kind: input.kind,
        to_email: to,
        status: "failed",
        ig_audio_url: input.igAudioUrl,
        error: lastErr.slice(0, 1000),
      });
    }
  }
  return { ok: false, to: FALLBACK_TO, error: lastErr };
}
