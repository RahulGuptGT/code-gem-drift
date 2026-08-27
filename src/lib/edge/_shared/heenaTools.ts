// Shared tool/action schemas for Heena agent.
// All operations are PROPOSALS — they never mutate DB.
// Execution is gated by /heena-execute after user approval.

export type ProposedAction = {
  action_type: "insert" | "update" | "delete";
  table_name:
    | "distrokid_accounts"
    | "distrokid_withdrawals"
    | "distrokid_releases"
    | "distrokid_earnings";
  payload: Record<string, unknown>;
  match?: Record<string, unknown>; // for update/delete
  summary: string;
};

export const ALLOWED_TABLES = [
  "distrokid_accounts",
  "distrokid_withdrawals",
  "distrokid_releases",
  "distrokid_earnings",
] as const;

// Auto-calc helpers for withdrawals: S = R + F + W (default fee 5.65)
export function autoCalcWithdrawal(input: {
  amount_usd_submitted?: number;
  amount_usd_received?: number;
  fee_usd?: number;
  withholding_usd?: number;
}) {
  const out = { ...input };
  if (out.fee_usd === undefined || out.fee_usd === null) out.fee_usd = 5.65;
  const { amount_usd_submitted: S, amount_usd_received: R, fee_usd: F, withholding_usd: W } = out;
  const has = (v: unknown) => v !== undefined && v !== null && !Number.isNaN(Number(v));
  const known = [has(S), has(R), has(F), has(W)].filter(Boolean).length;
  if (known < 3) return out;
  if (!has(S)) out.amount_usd_submitted = +(Number(R) + Number(F) + Number(W)).toFixed(2);
  else if (!has(R)) out.amount_usd_received = +(Number(S) - Number(F) - Number(W)).toFixed(2);
  else if (!has(W)) out.withholding_usd = +(Number(S) - Number(F) - Number(R)).toFixed(2);
  else if (!has(F)) out.fee_usd = +(Number(S) - Number(R) - Number(W)).toFixed(2);
  // Derived values must never go negative (DB CHECK constraints reject them anyway).
  for (const k of ["amount_usd_submitted", "amount_usd_received", "fee_usd", "withholding_usd"] as const) {
    const v = out[k];
    if (v !== undefined && v !== null && Number(v) < 0) out[k] = 0;
  }
  return out;
}
