import { createFileRoute } from "@tanstack/react-router";
import Layout from "@/components/Layout";
import ReferralLinks from "@/components/pages/ReferralLinks";

export const Route = createFileRoute("/referrals/")({
  head: () => ({
    meta: [
      { title: "Referral Links & Offers — Rahul Gupta" },
      { name: "description", content: "Verified referral links aur offers jo Rahul Gupta khud use karte hain." },
      { property: "og:title", content: "Referral Links & Offers — Rahul Gupta" },
      { property: "og:description", content: "Verified referral links aur offers jo Rahul Gupta khud use karte hain." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <Layout>
      <ReferralLinks />
    </Layout>
  ),
});
