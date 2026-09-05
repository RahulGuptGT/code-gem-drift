import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

/**
 * Instamojo checkout for membership plans.
 *
 * The client never decides the amount or the plan price — the server reads it
 * from the `plans` table, creates a pending `plan_payments` row, and only the
 * signed webhook (see /api/public/payments/instamojo) can activate membership.
 */

function instamojoBase() {
  return (process.env['INSTAMOJO_MODE'] ?? 'live').toLowerCase() === 'test'
    ? 'https://test.instamojo.com/api/1.1'
    : 'https://www.instamojo.com/api/1.1';
}

export const createPlanCheckout = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { planSlug: string; origin: string }) => {
    const slug = String(data?.planSlug ?? '').trim().toLowerCase();
    if (!/^[a-z0-9-]{2,40}$/.test(slug)) throw new Error('Invalid plan');
    const origin = String(data?.origin ?? '').trim();
    if (!/^https?:\/\/[^\s]{3,200}$/.test(origin)) throw new Error('Invalid origin');
    return { planSlug: slug, origin };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context as any;

    const apiKey = process.env['INSTAMOJO_API_KEY'];
    const authToken = process.env['INSTAMOJO_AUTH_TOKEN'];
    if (!apiKey || !authToken) {
      return { ok: false as const, error: 'Payments abhi configure nahi hue hain.' };
    }

    const { data: plan, error: planErr } = await supabase
      .from('plans')
      .select('slug, name, price_inr, billing_period, duration_days, is_visible')
      .eq('slug', data.planSlug)
      .maybeSingle();

    if (planErr || !plan || !plan.is_visible) {
      return { ok: false as const, error: 'Ye plan available nahi hai.' };
    }
    const amount = Number(plan.price_inr);
    if (!(amount > 0)) {
      return { ok: false as const, error: 'Ye plan free hai, payment ki zarurat nahi.' };
    }

    const email = (claims?.email as string | undefined) ?? undefined;

    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('user_id', userId)
      .maybeSingle();

    const { data: payment, error: payErr } = await supabase
      .from('plan_payments')
      .insert({
        user_id: userId,
        plan_slug: plan.slug,
        amount,
        currency: 'INR',
        provider: 'instamojo',
        status: 'created',
        buyer_email: email ?? null,
        buyer_name: profile?.display_name ?? null,
      })
      .select('id')
      .single();

    if (payErr || !payment) {
      return { ok: false as const, error: 'Payment record nahi ban paaya.' };
    }

    const body = new URLSearchParams({
      purpose: `${plan.name} membership`.slice(0, 30),
      amount: amount.toFixed(2),
      buyer_name: (profile?.display_name ?? 'Member').slice(0, 100),
      redirect_url: `${data.origin}/account?payment=${payment.id}`,
      webhook: `${data.origin}/api/public/payments/instamojo`,
      allow_repeated_payments: 'false',
      send_email: 'false',
      send_sms: 'false',
    });
    if (email) body.set('email', email);

    let res: Response;
    try {
      res = await fetch(`${instamojoBase()}/payment-requests/`, {
        method: 'POST',
        headers: {
          'X-Api-Key': apiKey,
          'X-Auth-Token': authToken,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body,
      });
    } catch (err) {
      console.error('instamojo request failed', err);
      await supabase
        .from('plan_payments')
        .update({ status: 'failed' })
        .eq('id', payment.id);
      return { ok: false as const, error: 'Payment gateway se connect nahi ho paaya.' };
    }

    const json: any = await res.json().catch(() => ({}));
    const request = json?.payment_request;
    if (!res.ok || !json?.success || !request?.longurl) {
      console.error('instamojo error', res.status, JSON.stringify(json));
      await supabase
        .from('plan_payments')
        .update({ status: 'failed', raw_payload: json ?? null })
        .eq('id', payment.id);
      return { ok: false as const, error: 'Payment link nahi ban paaya. Thodi der baad try karein.' };
    }

    await supabase
      .from('plan_payments')
      .update({ provider_request_id: request.id, status: 'pending' })
      .eq('id', payment.id);

    return { ok: true as const, url: request.longurl as string, paymentId: payment.id as string };
  });

export const getMyPayments = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as any;
    const { data } = await supabase
      .from('plan_payments')
      .select('id, plan_slug, amount, currency, status, provider_payment_id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    return (data ?? []) as Array<{
      id: string;
      plan_slug: string;
      amount: number;
      currency: string;
      status: string;
      provider_payment_id: string | null;
      created_at: string;
    }>;
  });

export const listAllPayments = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as any;
    const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: userId, _role: 'admin' });
    if (!isAdmin) throw new Error('Forbidden');

    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data } = await supabaseAdmin
      .from('plan_payments')
      .select('id, user_id, plan_slug, amount, currency, status, provider, provider_payment_id, buyer_email, buyer_name, created_at')
      .order('created_at', { ascending: false })
      .limit(200);
    return (data ?? []) as any[];
  });

/** Manual rescue when a webhook never arrived: admin marks a payment paid and grants the plan. */
export const adminActivatePayment = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { paymentId: string }) => {
    const id = String(data?.paymentId ?? '');
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error('Invalid payment id');
    return { paymentId: id };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    const { data: isAdmin } = await supabase.rpc('has_role', { _user_id: userId, _role: 'admin' });
    if (!isAdmin) throw new Error('Forbidden');

    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { activateMembershipForPayment } = await import('@/lib/memberships.server');
    const { data: payment } = await supabaseAdmin
      .from('plan_payments')
      .select('id, user_id, plan_slug, status')
      .eq('id', data.paymentId)
      .maybeSingle();

    if (!payment) return { ok: false as const, error: 'Payment nahi mila' };
    if (payment.status === 'success') return { ok: true as const, alreadyDone: true };

    await supabaseAdmin
      .from('plan_payments')
      .update({ status: 'success' })
      .eq('id', payment.id);

    await activateMembershipForPayment(supabaseAdmin, payment.user_id, payment.plan_slug, 'manual');
    return { ok: true as const };
  });
