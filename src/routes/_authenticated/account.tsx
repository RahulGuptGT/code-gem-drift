import { createFileRoute } from "@tanstack/react-router";
import Layout from "@/components/Layout";
import Account from "@/components/pages/Account";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({
    meta: [
      { title: "My account — Rahul Gupta" },
      { name: "description", content: "Manage your profile, plan and reading library." },
      { property: "og:title", content: "My account — Rahul Gupta" },
      { property: "og:description", content: "Manage your profile, plan and reading library." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <Layout>
      <Account />
    </Layout>
  ),
});
