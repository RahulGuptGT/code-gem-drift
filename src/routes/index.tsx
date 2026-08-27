import { createFileRoute } from "@tanstack/react-router";
import Layout from "@/components/Layout";
import Home from "@/components/pages/Home";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Rahul Gupta — Personal Website, Portfolio & Blog" },
      { name: "description", content: "Rahul Gupta ki official website: portfolio, POV blog, referral links aur contact." },
      { property: "og:title", content: "Rahul Gupta — Personal Website, Portfolio & Blog" },
      { property: "og:description", content: "Rahul Gupta ki official website: portfolio, POV blog, referral links aur contact." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <Layout>
      <Home />
    </Layout>
  ),
});
