import { createFileRoute } from "@tanstack/react-router";
import Layout from "@/components/Layout";
import RahulPOV from "@/components/pages/RahulPOV";

export const Route = createFileRoute("/pov/")({
  head: () => ({
    meta: [
      { title: "Rahul's POV — Thoughts, Notes & Opinions" },
      { name: "description", content: "Rahul Gupta ke short posts, opinions aur notes ek jagah." },
      { property: "og:title", content: "Rahul's POV — Thoughts, Notes & Opinions" },
      { property: "og:description", content: "Rahul Gupta ke short posts, opinions aur notes ek jagah." },
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
