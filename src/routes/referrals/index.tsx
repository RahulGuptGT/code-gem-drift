import { createFileRoute } from "@tanstack/react-router";
import Layout from "@/components/Layout";

const SITE_URL = "https://rahulgupta.online";
const OG_IMAGE = `${SITE_URL}/og-image.jpg`;
import ReferralLinks from "@/components/pages/ReferralLinks";

export const Route = createFileRoute("/referrals/")({
  head: () => ({
    meta: [
      { title: "Referral Links & Offers — Rahul Gupta" },
      { name: "description", content: "Verified referral links aur offers jo Rahul Gupta khud use karte hain." },
      { property: "og:title", content: "Referral Links & Offers — Rahul Gupta" },
      { property: "og:description", content: "Verified referral links aur offers jo Rahul Gupta khud use karte hain." },
      { property: "og:type", content: "website" },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/referrals` }],
  }),
  component: () => (
    <Layout>
      <ReferralLinks />
    </Layout>
  ),
});
