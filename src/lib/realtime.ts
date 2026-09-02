/**
 * Supabase Realtime channel topics must be unique per subscription.
 * React can mount an effect twice (StrictMode / fast refresh), and reusing a
 * fixed topic makes the client add listeners to an already-subscribed channel,
 * which throws:
 *   "cannot add postgres_changes callbacks for realtime:<topic> after subscribe()"
 * Suffixing the topic keeps every mount on its own channel.
 */
export function uniqueChannel(base: string): string {
  const suffix =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return `${base}-${suffix}`;
}
