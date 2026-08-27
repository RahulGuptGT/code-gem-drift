import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/analytics-insights")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => (await import("@/lib/edge/analytics-insights.server")).handler(request),
      POST: async ({ request }) => (await import("@/lib/edge/analytics-insights.server")).handler(request),
      GET: async ({ request }) => (await import("@/lib/edge/analytics-insights.server")).handler(request),
    },
  },
});
