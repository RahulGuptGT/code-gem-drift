import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

export type Tier = 'public' | 'starter' | 'signature' | 'sovereign';

const RANK: Record<Tier, number> = {
  public: 0,
  starter: 1,
  signature: 2,
  sovereign: 3,
};

export function rankOf(tier?: string | null): number {
  return RANK[(tier ?? 'public').toLowerCase() as Tier] ?? 0;
}

export function meetsTier(userTier: string | null | undefined, minTier: string | null | undefined) {
  return rankOf(userTier) >= rankOf(minTier);
}

/**
 * Server-side source of truth for the caller's tier. Reads the active,
 * non-expired membership through the database helper so an expired
 * Signature automatically falls back to Starter.
 */
export async function resolveTier(context: { supabase: any; userId: string }): Promise<Tier> {
  const { data, error } = await context.supabase.rpc('user_tier', { _user_id: context.userId });
  if (error) return 'starter';
  return ((data as string) ?? 'starter') as Tier;
}

export const getMyAccess = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const tier = await resolveTier(context as any);
    const { data: membership } = await (context as any).supabase
      .from('memberships')
      .select('plan_slug, status, started_at, expires_at')
      .eq('user_id', (context as any).userId)
      .eq('status', 'active')
      .maybeSingle();

    return {
      tier,
      rank: rankOf(tier),
      membership: membership ?? null,
    };
  });
