import { createFileRoute } from "@tanstack/react-router";
import Layout from "@/components/Layout";
import RahulPOV from "@/components/pages/RahulPOV";

export const Route = createFileRoute("/pov/$category")({
  head: () => ({
    meta: [
      { title: "Rahul's POV by Category — Thoughts & Notes" },
      { name: "description", content: "Category ke hisaab se Rahul Gupta ke POV posts padhein." },
      { property: "og:title", content: "Rahul's POV by Category — Thoughts & Notes" },
      { property: "og:description", content: "Category ke hisaab se Rahul Gupta ke POV posts padhein." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <Layout>
      <RahulPOV />
    </Layout>
  ),
});
