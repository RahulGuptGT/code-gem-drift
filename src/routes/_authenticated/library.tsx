import { createFileRoute } from "@tanstack/react-router";
import Layout from "@/components/Layout";
import Library from "@/components/pages/Library";

export const Route = createFileRoute("/_authenticated/library")({
  head: () => ({
    meta: [
      { title: "My library — Rahul Gupta" },
      { name: "description", content: "Your member reading library: books and long-form chapters." },
      { property: "og:title", content: "My library — Rahul Gupta" },
      { property: "og:description", content: "Your member reading library: books and long-form chapters." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <Layout>
      <Library />
    </Layout>
  ),
});
