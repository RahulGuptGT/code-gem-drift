import type { QueryClient } from '@tanstack/react-query';

/**
 * Maps an AI tool name to the react-query cache keys it invalidates.
 * Read-only tools return an empty list so nothing refetches needlessly.
 */
export function cacheKeysForTool(name: string | undefined | null): string[][] {
  if (!name) return [];
  const n = name.toLowerCase();

  // Read-only tools: list_/get_/search_/parse_ never mutate DB state.
  // A read prefix only counts when the name has no write verb in it
  // (e.g. `find_or_create_account` writes and must invalidate caches).
  const WRITE_VERB = /(create|insert|add|update|upsert|set|save|delete|remove|commit|import|sync|apply|move|assign|generate|write|link|unlink|archive|restore)/;
  if (/^(list|get|search|read|parse|preview|find|fetch|show|count)_/.test(n) && !WRITE_VERB.test(n)) return [];

  const keys: string[][] = [];
  if (/(distrokid|release|withdrawal|royalt|account|artist|earning|isrc|statement|album)/.test(n)) {
    keys.push(['dk']);
  }
  if (/guide/.test(n)) keys.push(['dk-guide']);
  if (/(ig_audio|instagram)/.test(n)) keys.push(['ig-audio-checks']);
  if (/(note|notepad|workspace_note)/.test(n)) keys.push(['workspace-notes'], ['note']);
  if (/todo/.test(n)) keys.push(['todos']);

  // Any write touching DK data should also refresh the activity log.
  if (keys.some((k) => k[0] === 'dk')) keys.push(['dk-activity']);

  return keys;
}

/** Invalidate caches affected by a completed AI tool call. */
export function syncCachesForTool(qc: QueryClient, name: string | undefined | null) {
  for (const queryKey of cacheKeysForTool(name)) {
    qc.invalidateQueries({ queryKey });
  }
}
