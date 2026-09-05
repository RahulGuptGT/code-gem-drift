import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/payments/instamojo")({
  server: {
    handlers: {
      POST: async ({ request }) =>
        (await import("@/lib/edge/instamojo-webhook.server")).handler(request),
      GET: async () =>
        new Response(JSON.stringify({ error: "Method not allowed" }), {
          status: 405,
          headers: { "content-type": "application/json", allow: "POST" },
        }),
    },
  },
});
