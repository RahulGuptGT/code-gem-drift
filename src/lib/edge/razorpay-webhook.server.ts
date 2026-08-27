import { createClient } from "@supabase/supabase-js";
import { createHmac } from "node:crypto";

export async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const raw = await req.text();
  const signature = req.headers.get("x-razorpay-signature") || "";
  const webhookSecret = process.env["RAZORPAY_WEBHOOK_SECRET"];

  if (!webhookSecret) {
    console.error("RAZORPAY_WEBHOOK_SECRET not configured; rejecting webhook");
    return new Response("Service unavailable", { status: 503 });
  }

  const expected = createHmac("sha256", webhookSecret).update(raw).digest("hex");
  if (expected !== signature) {
    console.warn("Webhook signature mismatch");
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    const event = JSON.parse(raw);
    const supabase = createClient(
      process.env["SUPABASE_URL"]!,
      process.env["SUPABASE_SERVICE_ROLE_KEY"]!
    );

    const payment = event?.payload?.payment?.entity;
    if (!payment) return new Response("ok", { status: 200 });

    const orderId = payment.order_id;
    const status = event.event === "payment.captured" ? "success"
      : event.event === "payment.failed" ? "failed" : null;

    if (status && orderId) {
      await supabase.from("donations").update({
        status,
        razorpay_payment_id: payment.id,
        error_reason: status === "failed" ? (payment.error_description || null) : null,
      }).eq("razorpay_order_id", orderId);
    }

    return new Response("ok", { status: 200 });
  } catch (err) {
    console.error("webhook error", err);
    return new Response("error", { status: 500 });
  }
}
