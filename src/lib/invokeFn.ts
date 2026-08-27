import { supabase } from '@/integrations/supabase/client';

/**
 * Drop-in replacement for `supabase.functions.invoke` that targets the
 * app's own TanStack server routes (`/api/public/<name>`).
 */
export function fnUrl(name: string): string {
  return `/api/public/${name}`;
}

export async function invokeFn<T = any>(
  name: string,
  options?: { body?: unknown; headers?: Record<string, string> },
): Promise<{ data: T | null; error: { message: string } | null }> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    const res = await fetch(fnUrl(name), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options?.headers ?? {}),
      },
      body: JSON.stringify(options?.body ?? {}),
    });
    const text = await res.text();
    let json: any = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = { raw: text };
    }
    if (!res.ok) {
      return { data: null, error: { message: json?.error || `Request failed (${res.status})` } };
    }
    return { data: json as T, error: null };
  } catch (e) {
    return { data: null, error: { message: (e as Error).message } };
  }
}
