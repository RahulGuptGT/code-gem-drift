import { createFileRoute } from "@tanstack/react-router";
import Layout from "@/components/Layout";
import CancellationPolicy from "@/components/pages/legal/CancellationPolicy";

export const Route = createFileRoute("/legal/cancellation-policy")({
  head: () => ({
    meta: [
      { title: "Cancellation Policy — Rahul Gupta" },
      { name: "description", content: "Orders aur services cancel karne ki policy." },
      { property: "og:title", content: "Cancellation Policy — Rahul Gupta" },
      { property: "og:description", content: "Orders aur services cancel karne ki policy." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <Layout>
      <CancellationPolicy />
    </Layout>
  ),
});
