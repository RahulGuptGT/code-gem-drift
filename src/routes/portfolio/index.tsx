import { createFileRoute } from "@tanstack/react-router";
import Layout from "@/components/Layout";
import Portfolio from "@/components/pages/Portfolio";

export const Route = createFileRoute("/portfolio/")({
  head: () => ({
    meta: [
      { title: "Portfolio — Projects & Apps by Rahul Gupta" },
      { name: "description", content: "Rahul Gupta ke banaye apps, websites aur projects ka portfolio." },
      { property: "og:title", content: "Portfolio — Projects & Apps by Rahul Gupta" },
      { property: "og:description", content: "Rahul Gupta ke banaye apps, websites aur projects ka portfolio." },
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
