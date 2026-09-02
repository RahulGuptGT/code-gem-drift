import { createFileRoute } from "@tanstack/react-router";
import Layout from "@/components/Layout";
import Auth from "@/components/pages/Auth";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in or create an account — Rahul Gupta" },
      {
        name: "description",
        content:
          "Sign in to unlock member-only POV posts and book chapters, manage your plan and reading library.",
      },
      { property: "og:title", content: "Sign in or create an account — Rahul Gupta" },
      {
        property: "og:description",
        content: "Members-only writing, book chapters and your reading library in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <Layout>
      <Auth />
    </Layout>
  ),
});
