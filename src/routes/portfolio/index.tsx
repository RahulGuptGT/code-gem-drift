import { createFileRoute } from "@tanstack/react-router";
import Layout from "@/components/Layout";

const SITE_URL = "https://rahulgupta.online";
const OG_IMAGE = `${SITE_URL}/og-image.jpg`;
import Portfolio from "@/components/pages/Portfolio";

export const Route = createFileRoute("/portfolio/")({
  head: () => ({
    meta: [
      { title: "Portfolio — Projects & Apps by Rahul Gupta" },
      { name: "description", content: "Rahul Gupta ke banaye apps, websites aur projects ka portfolio." },
      { property: "og:title", content: "Portfolio — Projects & Apps by Rahul Gupta" },
      { property: "og:description", content: "Rahul Gupta ke banaye apps, websites aur projects ka portfolio." },
      { property: "og:type", content: "website" },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/portfolio` }],
  }),
  component: () => (
    <Layout>
      <Portfolio />
    </Layout>
  ),
});
