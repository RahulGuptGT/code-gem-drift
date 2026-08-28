import { createFileRoute } from "@tanstack/react-router";

/**
 * Public file proxy: /api/public/file/<bucket>/<path>
 *
 * Storage buckets in this project are private (workspace policy blocks public
 * buckets), so publicly shareable assets are streamed through this endpoint.
 * Only the buckets in PUBLIC_BUCKETS are exposed.
 */
const PUBLIC_BUCKETS = new Set(["app-files", "portfolio-images"]);

export const Route = createFileRoute("/api/public/file/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const splat = (params as { _splat?: string })._splat ?? "";
        const slash = splat.indexOf("/");
        if (slash < 1) return new Response("Not found", { status: 404 });

        const bucket = splat.slice(0, slash);
        const objectPath = splat.slice(slash + 1);
        if (!PUBLIC_BUCKETS.has(bucket) || !objectPath || objectPath.includes("..")) {
          return new Response("Not found", { status: 404 });
        }

        const url = process.env["SUPABASE_URL"];
        const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
        if (!url || !key) return new Response("Storage not configured", { status: 500 });

        const upstream = await fetch(
          `${url.replace(/\/$/, "")}/storage/v1/object/${bucket}/${objectPath
            .split("/")
            .map(encodeURIComponent)
            .join("/")}`,
          { headers: { Authorization: `Bearer ${key}`, apikey: key } },
        );

        if (!upstream.ok || !upstream.body) {
          return new Response("Not found", { status: 404 });
        }

        return new Response(upstream.body, {
          status: 200,
          headers: {
            "Content-Type": upstream.headers.get("content-type") ?? "application/octet-stream",
            "Cache-Control": "public, max-age=3600",
            "Access-Control-Allow-Origin": "*",
          },
        });
      },
    },
  },
});
