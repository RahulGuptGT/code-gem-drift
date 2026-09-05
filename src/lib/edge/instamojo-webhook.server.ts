import { createHmac, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { activateMembershipForPayment } from "@/lib/memberships.server";

/**
 * Instamojo webhook. Instamojo signs the form body with the account salt:
 * HMAC-SHA1 over the values of every field except `mac`, joined by "|" in
 * key-sorted order. Nothing is trusted before that check passes.
 */
export async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const salt = process.env["INSTAMOJO_SALT"];
  if (!salt) {
    console.error("INSTAMOJO_SALT not configured; rejecting webhook");
    return new Response("Service unavailable", { status: 503 });
  }

  const raw = await req.text();
  const params = new URLSearchParams(raw);
  const received = params.get("mac") ?? "";

  const values: string[] = [];
  const keys: string[] = [];
  params.forEach((_value, key) => {
    if (key !== "mac" && !keys.includes(key)) keys.push(key);
  });
  keys.sort();
  keys.forEach((key) => values.push(params.get(key) ?? ""));

  const expected = createHmac("sha1", salt).update(values.join("|")).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(received.toLowerCase());
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    console.warn("instamojo webhook signature mismatch");
    return new Response("Invalid signature", { status: 401 });
  }

  try {
    const supabaseAdmin = createClient(
      process.env["SUPABASE_URL"]!,
      process.env["SUPABASE_SERVICE_ROLE_KEY"]!,
    );

    const requestId = params.get("payment_request_id");
    const paymentId = params.get("payment_id");
    const status = (params.get("status") ?? "").toLowerCase();
    if (!requestId) return new Response("ok", { status: 200 });

    const { data: payment } = await supabaseAdmin
      .from("plan_payments")
      .select("id, user_id, plan_slug, status")
      .eq("provider_request_id", requestId)
      .maybeSingle();

    if (!payment) {
      console.warn("instamojo webhook: unknown payment request", requestId);
      return new Response("ok", { status: 200 });
    }

    const payload: Record<string, string> = {};
    params.forEach((value, key) => {
      payload[key] = value;
    });

    const succeeded = status === "credit" || status === "completed" || status === "success";

    await supabaseAdmin
      .from("plan_payments")
      .update({
        status: succeeded ? "success" : "failed",
        provider_payment_id: paymentId,
        raw_payload: payload,
      })
      .eq("id", payment.id);

    // Idempotent: a repeated webhook for an already-activated payment is a no-op.
    if (succeeded && payment.status !== "success") {
      await activateMembershipForPayment(
        supabaseAdmin,
        payment.user_id,
        payment.plan_slug,
        "instamojo",
      );
    }

    return new Response("ok", { status: 200 });
  } catch (err) {
    console.error("instamojo webhook error", err);
    return new Response("error", { status: 500 });
  }
}
