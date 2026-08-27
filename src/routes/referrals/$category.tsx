import { createFileRoute } from "@tanstack/react-router";
import Layout from "@/components/Layout";
import ReferralLinks from "@/components/pages/ReferralLinks";

export const Route = createFileRoute("/referrals/$category")({
  head: () => ({
    meta: [
      { title: "Referral Links by Category — Rahul Gupta" },
      { name: "description", content: "Category-wise referral links aur sign-up bonus offers." },
      { property: "og:title", content: "Referral Links by Category — Rahul Gupta" },
      { property: "og:description", content: "Category-wise referral links aur sign-up bonus offers." },
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
