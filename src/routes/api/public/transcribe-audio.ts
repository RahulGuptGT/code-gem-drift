import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/transcribe-audio")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => (await import("@/lib/edge/transcribe-audio.server")).handler(request),
      POST: async ({ request }) => (await import("@/lib/edge/transcribe-audio.server")).handler(request),
      GET: async ({ request }) => (await import("@/lib/edge/transcribe-audio.server")).handler(request),
    },
  },
});
