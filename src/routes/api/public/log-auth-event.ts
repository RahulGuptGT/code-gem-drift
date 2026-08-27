import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/log-auth-event")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => (await import("@/lib/edge/log-auth-event.server")).handler(request),
      POST: async ({ request }) => (await import("@/lib/edge/log-auth-event.server")).handler(request),
      GET: async ({ request }) => (await import("@/lib/edge/log-auth-event.server")).handler(request),
    },
  },
});
