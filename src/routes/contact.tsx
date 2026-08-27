import { createFileRoute } from "@tanstack/react-router";
import Layout from "@/components/Layout";
import Contact from "@/components/pages/Contact";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Rahul Gupta — Get in Touch" },
      { name: "description", content: "Rahul Gupta se sawaal, collaboration ya project ke liye seedha sampark karein." },
      { property: "og:title", content: "Contact Rahul Gupta — Get in Touch" },
      { property: "og:description", content: "Rahul Gupta se sawaal, collaboration ya project ke liye seedha sampark karein." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <Layout>
      <Contact />
    </Layout>
  ),
});
