import { createFileRoute } from "@tanstack/react-router";
import Layout from "@/components/Layout";
import Portfolio from "@/components/pages/Portfolio";

export const Route = createFileRoute("/portfolio/$category")({
  head: () => ({
    meta: [
      { title: "Portfolio Category — Work by Rahul Gupta" },
      { name: "description", content: "Category ke hisaab se Rahul Gupta ke projects aur apps browse karein." },
      { property: "og:title", content: "Portfolio Category — Work by Rahul Gupta" },
      { property: "og:description", content: "Category ke hisaab se Rahul Gupta ke projects aur apps browse karein." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <Layout>
      <Portfolio />
    </Layout>
  ),
});
