import { createFileRoute } from "@tanstack/react-router";
import Layout from "@/components/Layout";
import FundRahul from "@/components/pages/FundRahul";

export const Route = createFileRoute("/fund-rahul")({
  head: () => ({
    meta: [
      { title: "Fund Rahul — Support the Work" },
      { name: "description", content: "Rahul Gupta ke kaam ko support karein aur contribution bhejein." },
      { property: "og:title", content: "Fund Rahul — Support the Work" },
      { property: "og:description", content: "Rahul Gupta ke kaam ko support karein aur contribution bhejein." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <Layout>
      <FundRahul />
    </Layout>
  ),
});
