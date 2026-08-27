import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/workspace-ai-chat")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => (await import("@/lib/edge/workspace-ai-chat.server")).handler(request),
      POST: async ({ request }) => (await import("@/lib/edge/workspace-ai-chat.server")).handler(request),
      GET: async ({ request }) => (await import("@/lib/edge/workspace-ai-chat.server")).handler(request),
    },
  },
});
