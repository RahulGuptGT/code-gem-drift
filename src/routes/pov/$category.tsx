import { createFileRoute } from "@tanstack/react-router";
import Layout from "@/components/Layout";
import RahulPOV from "@/components/pages/RahulPOV";
import { buildBreadcrumbSchema, OG_IMAGE, SITE_URL, titleCase } from "@/lib/seo";

export const Route = createFileRoute("/pov/$category")({
  head: ({ params }) => {
    const label = titleCase(params.category);
    const title = `${label} — Rahul's POV`;
    const description = `${label} par Rahul Gupta ke thoughts, notes aur opinions.`;
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
      links: [{ rel: "canonical", href: `${SITE_URL}/pov/${params.category}` }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(
            buildBreadcrumbSchema([
              { name: "Home", path: "/" },
              { name: "POV", path: "/pov" },
              { name: label, path: `/pov/${params.category}` },
            ]),
          ),
        },
      ],
    };
  },
  component: () => (
    <Layout>
      <RahulPOV />
    </Layout>
  ),
});
