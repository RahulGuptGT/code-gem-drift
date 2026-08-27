import { createFileRoute } from "@tanstack/react-router";
import Layout from "@/components/Layout";
import Disclaimer from "@/components/pages/legal/Disclaimer";

export const Route = createFileRoute("/legal/disclaimer")({
  head: () => ({
    meta: [
      { title: "Disclaimer — Rahul Gupta" },
      { name: "description", content: "Website content aur referral links se judi zaroori disclaimer." },
      { property: "og:title", content: "Disclaimer — Rahul Gupta" },
      { property: "og:description", content: "Website content aur referral links se judi zaroori disclaimer." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <Layout>
      <Disclaimer />
    </Layout>
  ),
});
