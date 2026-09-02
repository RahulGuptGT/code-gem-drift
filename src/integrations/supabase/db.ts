import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from './client';

/**
 * Untyped view of the generated Supabase client.
 *
 * `types.ts` is generated from the Supabase API and must not be hand-edited,
 * so tables added outside that generation cycle (plans, memberships,
 * plan_payments, books, book_chapters, reading_progress) are reached through
 * this cast. RLS still applies exactly the same way.
 */
export const db = supabase as unknown as SupabaseClient<any, 'public', any>;

export type Tier = 'public' | 'starter' | 'signature' | 'sovereign';

export const TIER_RANK: Record<Tier, number> = {
  public: 0,
  starter: 1,
  signature: 2,
  sovereign: 3,
};

export const TIER_LABEL: Record<Tier, string> = {
  public: 'Everyone',
  starter: 'Starter',
  signature: 'Signature',
  sovereign: 'Sovereign',
};

export function tierRank(tier?: string | null): number {
  const key = (tier ?? 'public').toLowerCase() as Tier;
  return TIER_RANK[key] ?? 0;
}

export function canAccess(userTier: string | null | undefined, minTier: string | null | undefined): boolean {
  return tierRank(userTier) >= tierRank(minTier);
}
