import { createFileRoute } from "@tanstack/react-router";
import Layout from "@/components/Layout";
import Portfolio from "@/components/pages/Portfolio";
import { buildBreadcrumbSchema, OG_IMAGE, SITE_URL, titleCase } from "@/lib/seo";

export const Route = createFileRoute("/portfolio/$category")({
  head: ({ params }) => {
    const label = titleCase(params.category);
    const title = `${label} — Portfolio by Rahul Gupta`;
    const description = `Rahul Gupta ke ${label.toLowerCase()} projects aur work browse karein.`;
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
        { rel: "canonical", href: `${SITE_URL}/portfolio/${params.category}` },
      ],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(
            buildBreadcrumbSchema([
              { name: "Home", path: "/" },
              { name: "Portfolio", path: "/portfolio" },
              { name: label, path: `/portfolio/${params.category}` },
            ]),
          ),
        },
      ],
    };
  },
  component: () => (
    <Layout>
      <Portfolio />
    </Layout>
  ),
});
