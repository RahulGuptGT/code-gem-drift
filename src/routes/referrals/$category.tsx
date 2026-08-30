import { createFileRoute } from "@tanstack/react-router";
import Layout from "@/components/Layout";
import ReferralLinks from "@/components/pages/ReferralLinks";
import { buildBreadcrumbSchema, OG_IMAGE, SITE_URL, titleCase } from "@/lib/seo";

export const Route = createFileRoute("/referrals/$category")({
  head: ({ params }) => {
    const label = titleCase(params.category);
    const title = `${label} Referral Links & Offers — Rahul Gupta`;
    const description = `${label} category ke verified referral links aur sign-up bonus offers.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:image", content: OG_IMAGE },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:image", content: OG_IMAGE },
      ],
      links: [
        { rel: "canonical", href: `${SITE_URL}/referrals/${params.category}` },
      ],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(
            buildBreadcrumbSchema([
              { name: "Home", path: "/" },
              { name: "Referrals", path: "/referrals" },
              { name: label, path: `/referrals/${params.category}` },
            ]),
          ),
        },
      ],
    };
  },
  component: () => (
    <Layout>
      <ReferralLinks />
    </Layout>
  ),
});
