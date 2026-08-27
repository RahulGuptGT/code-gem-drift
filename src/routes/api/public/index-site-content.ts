import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/index-site-content")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => (await import("@/lib/edge/index-site-content.server")).handler(request),
      POST: async ({ request }) => (await import("@/lib/edge/index-site-content.server")).handler(request),
      GET: async ({ request }) => (await import("@/lib/edge/index-site-content.server")).handler(request),
    },
  },
});
