import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/smart-index-site")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => (await import("@/lib/edge/smart-index-site.server")).handler(request),
      POST: async ({ request }) => (await import("@/lib/edge/smart-index-site.server")).handler(request),
      GET: async ({ request }) => (await import("@/lib/edge/smart-index-site.server")).handler(request),
    },
  },
});
