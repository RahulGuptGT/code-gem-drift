// Safe-column allow-lists for DistroKid data that AI models are allowed to see,
// and per-table column allow-lists for AI-proposed writes.
//
// Card numbers, password hints and recovery emails must NEVER be sent to a model
// (they'd end up persisted in plaintext inside chat history rows).

/** Columns of distrokid_accounts that are safe to hand to an LLM. */
export const DK_ACCOUNT_SAFE_COLUMNS = [
  "id",
  "email",
  "title",
  "nickname",
  "status",
  "tab",
  "account_status",
  "account_status_date",
  "subscription_plan",
  "subscription_status",
  "subscription_date",
  "signup_date",
  "date_added",
  "lifetime_earning_usd",
  "amount",
  "card_brand",
  "card_ending",
  "card_expiry",
  "country",
  "currency",
  "two_factor_enabled",
  "phone",
  "tags",
  "notes",
  "remark",
  "created_at",
  "updated_at",
].join(", ");

/** Never expose or accept these from AI paths. */
export const DK_SENSITIVE_COLUMNS = new Set([
  "card_number",
  "card_cvv",
  "card_holder",
  "password",
  "password_hint",
  "recovery_email",
]);

/** Strips sensitive keys from any row/object before it reaches a model. */
export function scrubSensitive<T>(row: T): T {
  if (!row || typeof row !== "object") return row;
  if (Array.isArray(row)) return row.map(scrubSensitive) as unknown as T;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row as Record<string, unknown>)) {
    if (DK_SENSITIVE_COLUMNS.has(k)) continue;
    out[k] = v;
  }
  return out as T;
}

/** Deep-scrub: strips sensitive keys at any nesting depth (for logs/telemetry). */
export function scrubDeep<T>(value: T): T {
  if (Array.isArray(value)) return value.map(scrubDeep) as unknown as T;
  if (!value || typeof value !== "object") return value;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (DK_SENSITIVE_COLUMNS.has(k)) { out[k] = "[redacted]"; continue; }
    out[k] = scrubDeep(v);
  }
  return out as T;
}

/**
 * Structural guard for AI-proposed writes: throws if the payload carries any
 * sensitive column, regardless of which tool built it.
 */
export function assertNoSensitiveWrite(payload: unknown, where = "write"): void {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return;
  const bad = Object.keys(payload as Record<string, unknown>).filter((k) => DK_SENSITIVE_COLUMNS.has(k));
  if (bad.length > 0) {
    throw new Error(`Sensitive columns AI se ${where} nahi ho sakte: ${bad.join(", ")}`);
  }
}

/** Columns an approved AI action may write, per table. */
export const DK_WRITABLE_COLUMNS: Record<string, string[]> = {
  distrokid_accounts: [
    "id", "email", "title", "nickname", "status", "tab",
    "account_status", "account_status_date", "subscription_plan", "subscription_status",
    "subscription_date", "signup_date", "date_added", "time_added",
    "lifetime_earning_usd", "amount", "card_brand", "card_ending", "card_expiry",
    "country", "currency", "two_factor_enabled", "phone", "tags", "notes", "remark",
  ],
  distrokid_withdrawals: [
    "id", "account_id", "fm", "submitted_at", "amount_usd_submitted", "fee_usd",
    "withholding_usd", "amount_usd_received", "inr_amount", "conversion_rate",
    "status", "received_date", "notes",
  ],
  distrokid_releases: [
    "id", "account_id", "title", "artist_name", "artist_id", "type", "release_date",
    "submitted_at", "live_at", "album_uid", "isrc", "upc",
    "active_source", "passive_source", "notes", "cover_url", "status",
  ],
  distrokid_earnings: [
    "id", "account_id", "amount_usd", "period_month", "source", "notes",
  ],
};

/** Returns the payload with only allow-listed columns; throws on sensitive keys. */
export function filterWritablePayload(table: string, payload: Record<string, unknown>) {
  const allowed = DK_WRITABLE_COLUMNS[table];
  if (!allowed) throw new Error(`Table not allowed: ${table}`);
  const out: Record<string, unknown> = {};
  const rejected: string[] = [];
  for (const [k, v] of Object.entries(payload)) {
    if (DK_SENSITIVE_COLUMNS.has(k)) throw new Error(`Column not allowed (sensitive): ${k}`);
    if (!allowed.includes(k)) { rejected.push(k); continue; }
    out[k] = v;
  }
  return { payload: out, rejected };
}
