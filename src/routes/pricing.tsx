import { createFileRoute } from "@tanstack/react-router";
import Layout from "@/components/Layout";
import Pricing from "@/components/pages/Pricing";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Membership plans — Rahul Gupta" },
      {
        name: "description",
        content:
          "Starter, Signature and Sovereign membership plans for member-only essays and book chapters by Rahul Gupta.",
      },
      { property: "og:title", content: "Membership plans — Rahul Gupta" },
      {
        property: "og:description",
        content: "Pick a plan to unlock member-only essays and long-form book chapters.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "https://rahulgupta.online/og-image.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://rahulgupta.online/og-image.jpg" },
    ],
    links: [{ rel: "canonical", href: "https://rahulgupta.online/pricing" }],
  }),
  component: () => (
    <Layout>
      <Pricing />
    </Layout>
  ),
});
