import { createFileRoute, notFound } from "@tanstack/react-router";
import UrlRedirect from "@/components/pages/UrlRedirect";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/$code")({
  loader: async ({ params }) => {
    const { data, error } = await supabase
      .from("short_urls")
      .select("short_code")
      .eq("short_code", params.code)
      .maybeSingle();

    // Unknown short codes are real 404s — respond with a 404 status so
    // search engines don't index invalid URLs as valid pages.
    if (error || !data) throw notFound();
    return { code: data.short_code };
  },
  head: () => ({
    meta: [
      { title: "Redirecting…" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: UrlRedirect,
});
