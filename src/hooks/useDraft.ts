import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Persistent text draft for chat composers.
 * - localStorage, per surface/thread key
 * - debounced writes (~400ms)
 * - expires after 7 days
 *
 * Usage:
 *   const [text, setText, clearDraft] = useDraft(`wsai:${threadId ?? 'new'}`);
 */

const PREFIX = 'draft:v1:';
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

type Envelope = { savedAt: number; text: string };

function read(key: string): string {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return '';
    const env = JSON.parse(raw) as Envelope;
    if (!env || typeof env.text !== 'string') return '';
    if (!env.savedAt || Date.now() - env.savedAt > TTL_MS) {
      localStorage.removeItem(PREFIX + key);
      return '';
    }
    return env.text;
  } catch {
    return '';
  }
}

function write(key: string, text: string) {
  try {
    if (!text) localStorage.removeItem(PREFIX + key);
    else localStorage.setItem(PREFIX + key, JSON.stringify({ savedAt: Date.now(), text } satisfies Envelope));
  } catch {
    /* storage full / disabled — draft is best-effort */
  }
}

export function useDraft(
  key: string,
  opts: { enabled?: boolean; debounceMs?: number } = {},
): [string, React.Dispatch<React.SetStateAction<string>>, () => void] {
  const { enabled = true, debounceMs = 400 } = opts;
  const [text, setText] = useState<string>(() => (enabled ? read(key) : ''));
  const keyRef = useRef(key);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Key change (thread switch): flush current text under the old key, load the new one.
  useEffect(() => {
    if (keyRef.current === key) return;
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    write(keyRef.current, text);
    keyRef.current = key;
    setText(enabled ? read(key) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);

  useEffect(() => {
    if (!enabled) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => write(keyRef.current, text), debounceMs);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [text, enabled, debounceMs]);

  // Flush immediately when the tab is hidden or closed.
  useEffect(() => {
    if (!enabled) return;
    const flush = () => write(keyRef.current, text);
    window.addEventListener('beforeunload', flush);
    document.addEventListener('visibilitychange', flush);
    return () => {
      window.removeEventListener('beforeunload', flush);
      document.removeEventListener('visibilitychange', flush);
    };
  }, [text, enabled]);

  const clearDraft = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    write(keyRef.current, '');
    setText('');
  }, []);

  return [text, setText, clearDraft];
}
