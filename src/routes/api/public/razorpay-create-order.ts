import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/razorpay-create-order")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => (await import("@/lib/edge/razorpay-create-order.server")).handler(request),
      POST: async ({ request }) => (await import("@/lib/edge/razorpay-create-order.server")).handler(request),
      GET: async ({ request }) => (await import("@/lib/edge/razorpay-create-order.server")).handler(request),
    },
  },
});
