import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/ramogu-chat")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => (await import("@/lib/edge/ramogu-chat.server")).handler(request),
      POST: async ({ request }) => (await import("@/lib/edge/ramogu-chat.server")).handler(request),
      GET: async () =>
        new Response(JSON.stringify({ error: "Method not allowed" }), {
          status: 405,
          headers: { "content-type": "application/json", allow: "POST, OPTIONS" },
        }),
    },
  },
});
