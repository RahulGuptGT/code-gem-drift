import { createFileRoute } from "@tanstack/react-router";
import { AdminLogin } from "@/components/admin/AdminLogin";

export const Route = createFileRoute("/heena/")({
  head: () => ({
    meta: [
      { title: "Owner Login" },
      { name: "description", content: "Private owner login." },
      { property: "og:title", content: "Owner Login" },
      { property: "og:description", content: "Private owner login." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AdminLogin />
  ),
});
