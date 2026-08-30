import { createFileRoute } from "@tanstack/react-router";
import Layout from "@/components/Layout";

const SITE_URL = "https://rahulgupta.online";
const OG_IMAGE = `${SITE_URL}/og-image.jpg`;
import RahulPOV from "@/components/pages/RahulPOV";

export const Route = createFileRoute("/pov/")({
  head: () => ({
    meta: [
      { title: "Rahul's POV — Thoughts, Notes & Opinions" },
      { name: "description", content: "Rahul Gupta ke short posts, opinions aur notes ek jagah." },
      { property: "og:title", content: "Rahul's POV — Thoughts, Notes & Opinions" },
      { property: "og:description", content: "Rahul Gupta ke short posts, opinions aur notes ek jagah." },
      { property: "og:type", content: "website" },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/pov` }],
  }),
  component: () => (
    <Layout>
      <RahulPOV />
    </Layout>
  ),
});
