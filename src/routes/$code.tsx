import { createFileRoute } from "@tanstack/react-router";
import UrlRedirect from "@/components/pages/UrlRedirect";

export const Route = createFileRoute("/$code")({
  component: UrlRedirect,
});
