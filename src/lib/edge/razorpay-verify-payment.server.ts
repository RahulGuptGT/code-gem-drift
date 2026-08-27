import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { createHmac } from "node:crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const Body = z.object({
  razorpay_order_id: z.string(),
  razorpay_payment_id: z.string(),
  razorpay_signature: z.string(),
  donation_id: z.string().uuid(),
});

export async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten() }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, donation_id } = parsed.data;

    const keySecret = process.env["RAZORPAY_KEY_SECRET"]!;
    const expected = createHmac("sha256", keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    const supabase = createClient(
      process.env["SUPABASE_URL"]!,
      process.env["SUPABASE_SERVICE_ROLE_KEY"]!
    );

    // Cross-check that the donation actually belongs to this order before any update.
    const { data: don, error: donErr } = await supabase
      .from("donations")
      .select("razorpay_order_id")
      .eq("id", donation_id)
      .single();

    if (donErr || !don || don.razorpay_order_id !== razorpay_order_id) {
      return new Response(JSON.stringify({ ok: false, error: "Donation/order mismatch" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (expected !== razorpay_signature) {
      await supabase
        .from("donations")
        .update({ status: "failed", error_reason: "signature_mismatch" })
        .eq("id", donation_id)
        .eq("razorpay_order_id", razorpay_order_id);
      return new Response(JSON.stringify({ ok: false, error: "Invalid signature" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase.from("donations").update({
      status: "success",
      razorpay_payment_id,
      razorpay_signature,
    }).eq("id", donation_id).eq("razorpay_order_id", razorpay_order_id);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("verify error", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}
