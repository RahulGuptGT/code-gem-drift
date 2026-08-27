import { createFileRoute } from "@tanstack/react-router";
import AdminDashboard from "@/components/pages/AdminDashboard";

export const Route = createFileRoute("/heena/admin/")({
  ssr: false,
  head: () => ({ meta: [{ title: "Admin" }, { name: "robots", content: "noindex" }] }),
  component: AdminDashboard,
});
