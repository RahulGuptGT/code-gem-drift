import { createFileRoute } from "@tanstack/react-router";
import Layout from "@/components/Layout";
import About from "@/components/pages/About";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Rahul Gupta — Story, Work & Journey" },
      { name: "description", content: "Rahul Gupta ke baare me: background, kaam, aur journey ki puri kahani." },
      { property: "og:title", content: "About Rahul Gupta — Story, Work & Journey" },
      { property: "og:description", content: "Rahul Gupta ke baare me: background, kaam, aur journey ki puri kahani." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <Layout>
      <About />
    </Layout>
  ),
});
