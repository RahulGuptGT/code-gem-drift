import { createFileRoute } from "@tanstack/react-router";
import Layout from "@/components/Layout";
import PrivacyPolicy from "@/components/pages/legal/PrivacyPolicy";

export const Route = createFileRoute("/legal/privacy-policy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Rahul Gupta" },
      { name: "description", content: "Kaunsa data collect hota hai aur kaise use hota hai, ye jaanein." },
      { property: "og:title", content: "Privacy Policy — Rahul Gupta" },
      { property: "og:description", content: "Kaunsa data collect hota hai aur kaise use hota hai, ye jaanein." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <Layout>
      <PrivacyPolicy />
    </Layout>
  ),
});
