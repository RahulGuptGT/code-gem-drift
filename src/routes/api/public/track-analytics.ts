import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/track-analytics")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => (await import("@/lib/edge/track-analytics.server")).handler(request),
      POST: async ({ request }) => (await import("@/lib/edge/track-analytics.server")).handler(request),
      GET: async ({ request }) => (await import("@/lib/edge/track-analytics.server")).handler(request),
    },
  },
});
