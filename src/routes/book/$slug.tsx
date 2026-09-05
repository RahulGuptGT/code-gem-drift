import { createFileRoute } from "@tanstack/react-router";
import Layout from "@/components/Layout";
import BookChapter from "@/components/pages/BookChapter";

export const Route = createFileRoute("/book/$slug")({
  head: ({ params }) => {
    const readable = params.slug.replace(/-/g, " ");
    const title = `${readable.charAt(0).toUpperCase()}${readable.slice(1)} — The Book by Rahul Gupta`;
    const description = `Read "${readable}", a chapter from the long-form book by Rahul Gupta.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { property: "og:image", content: "https://rahulgupta.online/og-image.jpg" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:image", content: "https://rahulgupta.online/og-image.jpg" },
      ],
      links: [{ rel: "canonical", href: `https://rahulgupta.online/book/${params.slug}` }],
    };
  },
  component: () => (
    <Layout>
      <BookChapter />
    </Layout>
  ),
});
