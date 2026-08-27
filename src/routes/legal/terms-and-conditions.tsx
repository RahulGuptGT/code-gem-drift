import { createFileRoute } from "@tanstack/react-router";
import Layout from "@/components/Layout";
import TermsAndConditions from "@/components/pages/legal/TermsAndConditions";

export const Route = createFileRoute("/legal/terms-and-conditions")({
  head: () => ({
    meta: [
      { title: "Terms & Conditions — Rahul Gupta" },
      { name: "description", content: "Is website ko use karne ki shartein aur niyam." },
      { property: "og:title", content: "Terms & Conditions — Rahul Gupta" },
      { property: "og:description", content: "Is website ko use karne ki shartein aur niyam." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <Layout>
      <TermsAndConditions />
    </Layout>
  ),
});
