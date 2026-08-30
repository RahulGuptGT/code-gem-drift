import { createFileRoute } from "@tanstack/react-router";
import Layout from "@/components/Layout";

const SITE_URL = "https://rahulgupta.online";
const OG_IMAGE = `${SITE_URL}/og-image.jpg`;
import FundRahul from "@/components/pages/FundRahul";

export const Route = createFileRoute("/fund-rahul")({
  head: () => ({
    meta: [
      { title: "Fund Rahul — Support the Work" },
      { name: "description", content: "Rahul Gupta ke kaam ko support karein aur contribution bhejein." },
      { property: "og:title", content: "Fund Rahul — Support the Work" },
      { property: "og:description", content: "Rahul Gupta ke kaam ko support karein aur contribution bhejein." },
      { property: "og:type", content: "website" },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/fund-rahul` }],
  }),
  component: () => (
    <Layout>
      <FundRahul />
    </Layout>
  ),
});
