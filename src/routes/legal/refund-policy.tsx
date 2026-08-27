import { createFileRoute } from "@tanstack/react-router";
import Layout from "@/components/Layout";
import RefundPolicy from "@/components/pages/legal/RefundPolicy";

export const Route = createFileRoute("/legal/refund-policy")({
  head: () => ({
    meta: [
      { title: "Refund Policy — Rahul Gupta" },
      { name: "description", content: "Payments aur contributions ke liye refund policy." },
      { property: "og:title", content: "Refund Policy — Rahul Gupta" },
      { property: "og:description", content: "Payments aur contributions ke liye refund policy." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <Layout>
      <RefundPolicy />
    </Layout>
  ),
});
