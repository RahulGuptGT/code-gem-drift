import { createFileRoute } from "@tanstack/react-router";
import Layout from "@/components/Layout";
import About from "@/components/pages/About";

const SITE_URL = "https://rahulgupta.online";
const OG_IMAGE = `${SITE_URL}/og-image.jpg`;

const aboutSchema = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  url: `${SITE_URL}/about`,
  name: "About Rahul Gupta",
  mainEntity: {
    "@type": "Person",
    name: "Rahul Gupta",
    url: SITE_URL,
    image: OG_IMAGE,
    jobTitle: "Student, Creator & Thinker",
    address: {
      "@type": "PostalAddress",
      addressRegion: "Bihar",
      addressCountry: "IN",
    },
  },
};

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Rahul Gupta — Story, Work & Journey" },
      { name: "description", content: "Rahul Gupta ke baare me: background, kaam, aur journey ki puri kahani." },
      { property: "og:title", content: "About Rahul Gupta — Story, Work & Journey" },
      { property: "og:description", content: "Rahul Gupta ke baare me: background, kaam, aur journey ki puri kahani." },
      { property: "og:type", content: "profile" },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/about` }],
    scripts: [{ type: "application/ld+json", children: JSON.stringify(aboutSchema) }],
  }),
  component: () => (
    <Layout>
      <About />
    </Layout>
  ),
});
