import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/ramogu-chat")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => (await import("@/lib/edge/ramogu-chat.server")).handler(request),
      POST: async ({ request }) => (await import("@/lib/edge/ramogu-chat.server")).handler(request),
      GET: async ({ request }) => (await import("@/lib/edge/ramogu-chat.server")).handler(request),
    },
  },
});
