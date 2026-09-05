/**
 * Shared membership activation used by the Instamojo webhook and by the
 * admin manual-activation rescue path. Runs with the service role only.
 */
export async function activateMembershipForPayment(
  supabaseAdmin: any,
  userId: string,
  planSlug: string,
  source: string,
) {
  const { data: plan } = await supabaseAdmin
    .from('plans')
    .select('slug, billing_period, duration_days')
    .eq('slug', planSlug)
    .maybeSingle();

  const durationDays: number | null =
    plan?.duration_days ?? (plan?.billing_period === 'monthly' ? 30 : null);

  const now = new Date();
  const expiresAt = durationDays
    ? new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000).toISOString()
    : null;

  // Any previous paid membership is superseded by this one.
  await supabaseAdmin
    .from('memberships')
    .update({ status: 'replaced' })
    .eq('user_id', userId)
    .eq('status', 'active');

  const { error } = await supabaseAdmin.from('memberships').insert({
    user_id: userId,
    plan_slug: planSlug,
    status: 'active',
    source,
    started_at: now.toISOString(),
    expires_at: expiresAt,
  });

  if (error) throw error;
  return { expiresAt };
}
