/**
 * localStorage / sessionStorage are unavailable (throwing) in private mode,
 * sandboxed iframes and some in-app browsers. Every read/write in the app must
 * go through this helper so a storage failure can never white-screen a page.
 */
type Kind = 'local' | 'session';

function store(kind: Kind): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    return kind === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

export const safeStorage = {
  get(key: string, kind: Kind = 'local'): string | null {
    try { return store(kind)?.getItem(key) ?? null; } catch { return null; }
  },
  set(key: string, value: string, kind: Kind = 'local'): void {
    try { store(kind)?.setItem(key, value); } catch { /* quota / disabled */ }
  },
  remove(key: string, kind: Kind = 'local'): void {
    try { store(kind)?.removeItem(key); } catch { /* ignore */ }
  },
  getJSON<T>(key: string, fallback: T, kind: Kind = 'local'): T {
    const raw = safeStorage.get(key, kind);
    if (!raw) return fallback;
    try { return JSON.parse(raw) as T; } catch { return fallback; }
  },
  setJSON(key: string, value: unknown, kind: Kind = 'local'): void {
    try { safeStorage.set(key, JSON.stringify(value), kind); } catch { /* ignore */ }
  },
};

export const safeSession = {
  get: (key: string) => safeStorage.get(key, 'session'),
  set: (key: string, v: string) => safeStorage.set(key, v, 'session'),
  remove: (key: string) => safeStorage.remove(key, 'session'),
};
