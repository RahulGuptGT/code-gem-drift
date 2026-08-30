import { createFileRoute } from "@tanstack/react-router";
import Layout from "@/components/Layout";
import Home from "@/components/pages/Home";

const SITE_URL = "https://rahulgupta.online";
const OG_IMAGE = `${SITE_URL}/og-image.jpg`;

const personSchema = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Rahul Gupta",
  url: SITE_URL,
  image: OG_IMAGE,
  jobTitle: "Student, Creator & Thinker",
  description:
    "Rahul Gupta — student, creator and thinker from Bihar, India. Portfolio, POV blog, referral links and apps.",
  address: {
    "@type": "PostalAddress",
    addressRegion: "Bihar",
    addressCountry: "IN",
  },
  sameAs: [
    "https://www.instagram.com/rahulguptaig",
    "https://m.youtube.com/channel/UC68B_U0nsb3kRmBvmJpTKFA",
    "https://www.facebook.com/RahulGuptaig/",
    "https://x.com/Rahul4RiseBihar",
  ],
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Rahul Gupta",
  url: SITE_URL,
};

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Rahul Gupta — Personal Website, Portfolio & Blog" },
      { name: "description", content: "Rahul Gupta ki official website: portfolio, POV blog, referral links aur contact." },
      { property: "og:title", content: "Rahul Gupta — Personal Website, Portfolio & Blog" },
      { property: "og:description", content: "Rahul Gupta ki official website: portfolio, POV blog, referral links aur contact." },
      { property: "og:type", content: "website" },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/` }],
    scripts: [
      { type: "application/ld+json", children: JSON.stringify(personSchema) },
      { type: "application/ld+json", children: JSON.stringify(websiteSchema) },
    ],
  }),
  component: () => (
    <Layout>
      <Home />
    </Layout>
  ),
});
