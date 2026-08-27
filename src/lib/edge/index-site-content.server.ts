
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Define all public pages to index
const PUBLIC_PAGES = [
  { path: "/", title: "Home", description: "Welcome to Rahul Gupta's personal website" },
  { path: "/about", title: "About", description: "Learn about Rahul Gupta - IIT aspirant from Bihar" },
  { path: "/contact", title: "Contact", description: "Contact form to reach out to Rahul" },
  { path: "/portfolio", title: "Portfolio", description: "Showcase of websites and apps built by Rahul" },
  { path: "/class-12th", title: "Class 12th Preparation", description: "Study resources for Class 12th exams" },
  { path: "/class-10th-result", title: "Class 10th Result", description: "Bihar Board Class 10th results checker" },
  { path: "/track-study", title: "Track Study Progress", description: "Track Class 12th preparation progress" },
  { path: "/referrals", title: "Referral Links", description: "Partner referral links with special deals" },
  { path: "/youtube/subscription", title: "YouTube Premium Family", description: "YouTube Premium subscription tracker" },
  { path: "/site-map", title: "Site Map", description: "Complete sitemap with all website pages" },
  { path: "/notebook-lm", title: "NotebookLM", description: "AI study resources using NotebookLM" },
  { path: "/payment", title: "Payment", description: "Make payments via UPI" },
];

// Static content knowledge base for each page
const PAGE_CONTENT: Record<string, string> = {
  "/": `Rahul Gupta's Personal Website - rahulgupta.site. Welcome to the official website of Rahul Gupta from Bihar, India. Features: Portfolio, Class 12th Study Resources, Class 10th Results, YouTube Premium Subscription Management. Contact: rahul@rahulgupta.online, WhatsApp: +919153525343. Social: Instagram @rahulguptaig, YouTube, Facebook, Twitter/X`,
  "/about": `About Rahul Gupta. Location: Bihar, India. Background: IIT aspirant, passionate about Bihar's development. Skills: Web development, building useful tools and applications. Email: rahul@rahulgupta.online. WhatsApp: +919153525343. Dreams: Working for the development and progress of Bihar`,
  "/contact": `Contact Rahul Gupta. Email: rahul@rahulgupta.online. WhatsApp: +919153525343. Location: Bihar, India. Fill out the contact form to reach out with questions, feedback, or collaboration requests.`,
  "/portfolio": `Portfolio - Projects by Rahul Gupta. Showcase of websites, applications, and tools built by Rahul. Skills: React, TypeScript, Tailwind CSS, Supabase, Web Development. View live projects and their source code.`,
  "/class-12th": `Class 12th Preparation Resources. Study materials and resources for Class 12th Bihar Board exams. Subjects: Physics, Chemistry, Mathematics, Biology, Hindi, English. NotebookLM integration for AI-powered study assistance. Track your syllabus progress.`,
  "/class-10th-result": `Bihar Board Class 10th Result Checker. Check results by entering roll code.`,
  "/track-study": `Syllabus Progress Tracker. Track your Class 12th preparation progress. Subjects: Physics, Chemistry, Mathematics, Biology, Hindi, English.`,
  "/referrals": `Referral Links & Special Deals. Partner referral links for apps and services with exclusive offers.`,
  "/youtube/subscription": `YouTube Premium Family Subscription Management. Manage YouTube Premium family subscription members. Payment amount: Rs 49/month per member.`,
  "/site-map": `Site Map - Complete Sitemap. Complete list of all pages on rahulgupta.site.`,
  "/notebook-lm": `NotebookLM Study Resources. AI-powered study assistance using Google's NotebookLM.`,
  "/payment": `Payment Page. Make payments via UPI. Supported: Google Pay, PhonePe, Paytm, and other UPI apps.`,
};

async function verifyAdmin(req: Request): Promise<boolean> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return false;

  const supabase = createClient(
    process.env["SUPABASE_URL"]!,
    process.env["SUPABASE_ANON_KEY"]!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return false;

  const { data: roleData } = await supabase
    .from("user_roles").select("role")
    .eq("user_id", user.id).eq("role", "admin").single();

  return !!roleData;
}

export async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Auth check - admin only
  if (!(await verifyAdmin(req))) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = process.env["SUPABASE_URL"]!;
    const supabaseServiceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"]!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    await supabase
      .from("site_indexing_status")
      .update({ status: "indexing", updated_at: new Date().toISOString(), error_message: null })
      .eq("status", "idle")
      .or("status.eq.completed,status.eq.error");

    console.log("Starting site indexing...");
    let indexedCount = 0;

    for (const page of PUBLIC_PAGES) {
      try {
        const content = PAGE_CONTENT[page.path] || page.description;
        const words = content.toLowerCase().split(/\s+/);
        const keywords = [...new Set(words.filter(w => w.length > 3))].slice(0, 20);
        const headings = [page.title];

        const { error } = await supabase
          .from("site_indexed_content")
          .upsert({
            page_path: page.path,
            page_title: page.title,
            page_description: page.description,
            content: content.trim(),
            headings,
            keywords,
            last_indexed_at: new Date().toISOString(),
          }, { onConflict: "page_path" });

        if (error) {
          console.error(`Error indexing ${page.path}:`, error);
        } else {
          indexedCount++;
        }
      } catch (pageError) {
        console.error(`Error processing ${page.path}:`, pageError);
      }
    }

    await supabase
      .from("site_indexing_status")
      .update({
        status: "completed",
        last_indexed_at: new Date().toISOString(),
        total_pages_indexed: indexedCount,
        updated_at: new Date().toISOString(),
        error_message: null
      })
      .neq("id", "00000000-0000-0000-0000-000000000000");

    return new Response(
      JSON.stringify({ success: true, message: `Indexed ${indexedCount} pages` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Indexing error:", error);
    return new Response(
      JSON.stringify({ error: "Indexing failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}
