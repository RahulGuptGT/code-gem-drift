import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Session } from '@supabase/supabase-js';

const FN_URL = '/api/public/log-auth-event';
const COOLDOWN_MS = 60_000; // dedupe refresh-style events

let reauthInFlight = false;

async function forceReauth(reason: string) {
  if (reauthInFlight) return;
  reauthInFlight = true;

  // 1) Best-effort global sign-out so refresh tokens are revoked server-side.
  try {
    await supabase.auth.signOut({ scope: 'global' });
  } catch {
    // ignore — we'll still nuke local state below
  }

  // 2) Hard-clear any Supabase auth artifacts from browser storage so a stale
  //    session can't be rehydrated after the redirect.
  try {
    const wipe = (storage: Storage) => {
      const keys: string[] = [];
      for (let i = 0; i < storage.length; i++) {
        const k = storage.key(i);
        if (!k) continue;
        if (k.startsWith('sb-') || k.includes('supabase.auth')) keys.push(k);
      }
      keys.forEach((k) => storage.removeItem(k));
    };
    wipe(window.localStorage);
    wipe(window.sessionStorage);
    // Admin temp-login flags are tied to the session too.
    localStorage.removeItem('admin_temp_login');
    sessionStorage.removeItem('admin_temp_active');
  } catch {
    // ignore storage access errors (e.g. privacy mode)
  }

  try {
    toast.error('Session expired', {
      description: 'Please sign in again to continue.',
    });
  } catch {
    // ignore
  }

  // 3) Bounce to the owner login page; preserve where they were.
  const next = encodeURIComponent(window.location.pathname + window.location.search);
  window.location.replace(`/heena?next=${next}&reason=${reason}`);
}


/**
 * Subscribes to Supabase auth state and posts login/logout/refresh events to
 * the `log-auth-event` edge function which records IP + device server-side.
 *
 * If the function returns 401 (e.g. the access token is no longer valid),
 * we proactively sign the user out and bounce them to the login page.
 */
export function useAuthEventLogger() {
  const lastLoggedRef = useRef<Record<string, number>>({});

  useEffect(() => {
    const log = async (event_type: 'login' | 'logout' | 'refresh', session: Session | null) => {
      const key = `${event_type}:${session?.user?.id ?? 'anon'}`;
      const now = Date.now();
      if (now - (lastLoggedRef.current[key] ?? 0) < COOLDOWN_MS) return;
      lastLoggedRef.current[key] = now;
      try {
        const res = await fetch(FN_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
          },
          body: JSON.stringify({ event_type, user_agent: navigator.userAgent }),
          keepalive: true,
        });
        if (res.status === 401 && session?.access_token) {
          // Token is stale/invalid — force a clean re-login.
          await forceReauth('expired');
        }
      } catch {
        // best-effort, silent
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') log('login', session);
      else if (event === 'SIGNED_OUT') log('logout', session);
      else if (event === 'TOKEN_REFRESHED') log('refresh', session);
    });

    // Catch silent refresh failures: Supabase emits TOKEN_REFRESHED with a
    // null session when the refresh token itself is invalid.
    const { data: { subscription: sub2 } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED' && !session) {
        forceReauth('refresh_failed');
      }
    });

    return () => {
      subscription.unsubscribe();
      sub2.unsubscribe();
    };
  }, []);
}
