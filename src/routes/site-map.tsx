import { createFileRoute } from "@tanstack/react-router";
import Layout from "@/components/Layout";
import AllLinks from "@/components/pages/AllLinks";

export const Route = createFileRoute("/site-map")({
  head: () => ({
    meta: [
      { title: "Site Map — All Pages & Links" },
      { name: "description", content: "Rahul Gupta ki website ke saare pages aur important links ek jagah." },
      { property: "og:title", content: "Site Map — All Pages & Links" },
      { property: "og:description", content: "Rahul Gupta ki website ke saare pages aur important links ek jagah." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <Layout>
      <AllLinks />
    </Layout>
  ),
});
