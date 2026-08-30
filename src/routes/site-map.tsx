import { createFileRoute } from "@tanstack/react-router";
import Layout from "@/components/Layout";

const SITE_URL = "https://rahulgupta.online";
const OG_IMAGE = `${SITE_URL}/og-image.jpg`;
import AllLinks from "@/components/pages/AllLinks";

export const Route = createFileRoute("/site-map")({
  head: () => ({
    meta: [
      { title: "Site Map — All Pages & Links" },
      { name: "description", content: "Rahul Gupta ki website ke saare pages aur important links ek jagah." },
      { property: "og:title", content: "Site Map — All Pages & Links" },
      { property: "og:description", content: "Rahul Gupta ki website ke saare pages aur important links ek jagah." },
      { property: "og:type", content: "website" },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/site-map` }],
  }),
  component: () => (
    <Layout>
      <AllLinks />
    </Layout>
  ),
});
