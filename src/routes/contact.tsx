import { createFileRoute } from "@tanstack/react-router";
import Layout from "@/components/Layout";

const SITE_URL = "https://rahulgupta.online";
const OG_IMAGE = `${SITE_URL}/og-image.jpg`;
import Contact from "@/components/pages/Contact";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Rahul Gupta — Get in Touch" },
      { name: "description", content: "Rahul Gupta se sawaal, collaboration ya project ke liye seedha sampark karein." },
      { property: "og:title", content: "Contact Rahul Gupta — Get in Touch" },
      { property: "og:description", content: "Rahul Gupta se sawaal, collaboration ya project ke liye seedha sampark karein." },
      { property: "og:type", content: "website" },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/contact` }],
  }),
  component: () => (
    <Layout>
      <Contact />
    </Layout>
  ),
});
