import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BodySchema = z.object({
  amount: z.number().min(10).max(1000000),
  name: z.string().trim().max(100).optional().nullable(),
  message: z.string().trim().max(500).optional().nullable(),
});

export async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten() }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { amount, name, message } = parsed.data;

    const keyId = process.env["RAZORPAY_KEY_ID"];
    const keySecret = process.env["RAZORPAY_KEY_SECRET"];
    if (!keyId || !keySecret) {
      return new Response(JSON.stringify({ error: "Razorpay not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      process.env["SUPABASE_URL"]!,
      process.env["SUPABASE_SERVICE_ROLE_KEY"]!
    );

    const { data: donation, error: insertErr } = await supabase
      .from("donations")
      .insert({
        amount,
        name: name?.trim() || null,
        message: message?.trim() || null,
        status: "created",
        currency: "INR",
      })
      .select("id")
      .single();
    if (insertErr) throw insertErr;

    const orderRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${btoa(`${keyId}:${keySecret}`)}`,
      },
      body: JSON.stringify({
        amount: Math.round(amount * 100),
        currency: "INR",
        receipt: donation.id,
        notes: { donation_id: donation.id, name: name || "", message: message || "" },
      }),
    });
    const orderData = await orderRes.json();
    if (!orderRes.ok) {
      await supabase.from("donations").update({ status: "failed", error_reason: JSON.stringify(orderData) }).eq("id", donation.id);
      return new Response(JSON.stringify({ error: orderData }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase.from("donations").update({ razorpay_order_id: orderData.id }).eq("id", donation.id);

    return new Response(JSON.stringify({
      order_id: orderData.id,
      key_id: keyId,
      donation_id: donation.id,
      amount: orderData.amount,
      currency: orderData.currency,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("create-order error", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}
