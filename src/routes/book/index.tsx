import { createFileRoute } from "@tanstack/react-router";
import Layout from "@/components/Layout";
import BookLanding from "@/components/pages/BookLanding";

export const Route = createFileRoute("/book/")({
  head: () => ({
    meta: [
      { title: "The Book — long-form writing by Rahul Gupta" },
      {
        name: "description",
        content:
          "A book written chapter by chapter on the web: long-form essays on society, philosophy and self. Free opening chapters, members unlock the rest.",
      },
      { property: "og:title", content: "The Book — long-form writing by Rahul Gupta" },
      {
        property: "og:description",
        content: "Read the book chapter by chapter. Free opening chapters, members unlock the rest.",
      },
      { property: "og:type", content: "book" },
      { property: "og:image", content: "https://rahulgupta.online/og-image.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://rahulgupta.online/og-image.jpg" },
    ],
    links: [{ rel: "canonical", href: "https://rahulgupta.online/book" }],
  }),
  component: () => (
    <Layout>
      <BookLanding />
    </Layout>
  ),
});
