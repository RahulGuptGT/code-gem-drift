import { createFileRoute } from "@tanstack/react-router";
import Layout from "@/components/Layout";
import ResetPassword from "@/components/pages/ResetPassword";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Reset your password — Rahul Gupta" },
      { name: "description", content: "Set a new password for your account." },
      { property: "og:title", content: "Reset your password — Rahul Gupta" },
      { property: "og:description", content: "Set a new password for your account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <Layout>
      <ResetPassword />
    </Layout>
  ),
});
