
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PAGES_TO_INDEX = [
  { path: "/", name: "Home", description: "Main homepage with introduction and highlights" },
  { path: "/about", name: "About", description: "Learn more about Rahul Gupta" },
  { path: "/contact", name: "Contact", description: "Get in touch - email, WhatsApp, social media" },
  { path: "/class-12th", name: "Class 12th Preparation", description: "Study materials and resources for Class 12th boards" },
  { path: "/class-12th/notebook-lm", name: "NotebookLM - AI Study", description: "AI-powered study materials with NotebookLM" },
  { path: "/track-study", name: "Track Study Progress", description: "Track syllabus completion progress for students" },
  { path: "/class-10th-result", name: "Class 10th Result", description: "Check Class 10th BSEB results" },
  { path: "/referrals", name: "Referral Links", description: "Exclusive offers and referral programs" },
  { path: "/portfolio", name: "Portfolio", description: "View projects, websites, and apps built by Rahul" },
  { path: "/youtube/subscription", name: "YouTube Premium Subscription", description: "Join YouTube Premium family plan" },
  { path: "/app", name: "Apps", description: "Explore mobile applications built by Rahul" },
  { path: "/payment", name: "Payment", description: "Make payments securely via UPI" },
  { path: "/site-map", name: "Site Map", description: "Complete site map with all pages" },
];

const BASE_URL = "https://rahulgupta.site";

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

async function scrapeWithFirecrawl(url: string, apiKey: string): Promise<any> {
  console.log(`Scraping: ${url}`);
  try {
    const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url, formats: ["markdown", "html"], onlyMainContent: true, waitFor: 2000 }),
    });

    if (!response.ok) {
      console.error(`Firecrawl error for ${url}:`, response.status);
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error(`Error scraping ${url}:`, error);
    return null;
  }
}

function extractKeywords(markdown: string, title: string): string[] {
  const keywords: Set<string> = new Set();
  title.toLowerCase().split(/\s+/).forEach(word => { if (word.length > 3) keywords.add(word); });
  const headingMatches = markdown.match(/^#+\s+(.+)$/gm);
  if (headingMatches) {
    headingMatches.forEach(heading => {
      heading.replace(/^#+\s+/, "").toLowerCase().split(/\s+/).forEach(word => {
        if (word.length > 3) keywords.add(word.replace(/[^\w]/g, ""));
      });
    });
  }
  const importantTerms = ["rahul", "gupta", "portfolio", "contact", "youtube", "class", "12th", "10th", "result", "preparation", "study", "physics", "chemistry", "mathematics", "biology", "hindi", "english", "notebooklm", "referral", "payment", "upi", "bihar", "bseb"];
  const lowerMarkdown = markdown.toLowerCase();
  importantTerms.forEach(term => { if (lowerMarkdown.includes(term)) keywords.add(term); });
  return Array.from(keywords).slice(0, 30);
}

function extractHeadings(markdown: string): string[] {
  const headings: string[] = [];
  const matches = markdown.match(/^#+\s+(.+)$/gm);
  if (matches) {
    matches.forEach(match => {
      const heading = match.replace(/^#+\s+/, "").trim();
      if (heading && heading.length < 200) headings.push(heading);
    });
  }
  return headings.slice(0, 20);
}

function cleanMarkdown(markdown: string): string {
  let cleaned = markdown.replace(/\n{3,}/g, "\n\n").replace(/\s+/g, " ").trim();
  if (cleaned.length > 20000) cleaned = cleaned.substring(0, 20000) + "...";
  return cleaned;
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

  const startTime = Date.now();
  console.log("Starting smart site indexing with Firecrawl...");

  try {
    const firecrawlKey = process.env["FIRECRAWL_API_KEY"];
    const supabaseUrl = process.env["SUPABASE_URL"]!;
    const supabaseServiceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"]!;

    if (!firecrawlKey) throw new Error("FIRECRAWL_API_KEY not configured");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    await supabase.from("site_indexing_status").upsert({
      id: "main", status: "indexing", error_message: null, updated_at: new Date().toISOString(),
    });

    const results: { path: string; success: boolean; title?: string }[] = [];
    let successCount = 0;

    for (const page of PAGES_TO_INDEX) {
      const fullUrl = `${BASE_URL}${page.path}`;
      try {
        const scrapeResult = await scrapeWithFirecrawl(fullUrl, firecrawlKey);
        if (scrapeResult?.success && scrapeResult.data?.markdown) {
          const { markdown, metadata } = scrapeResult.data;
          const cleanedContent = cleanMarkdown(markdown);
          const keywords = extractKeywords(markdown, page.name);
          const headings = extractHeadings(markdown);

          const { error: upsertError } = await supabase.from("site_indexed_content").upsert({
            page_path: page.path,
            page_title: metadata?.title || page.name,
            page_description: metadata?.description || page.description,
            content: cleanedContent, keywords, headings,
            last_indexed_at: new Date().toISOString(),
          }, { onConflict: "page_path" });

          if (upsertError) {
            results.push({ path: page.path, success: false });
          } else {
            successCount++;
            results.push({ path: page.path, success: true, title: metadata?.title || page.name });
          }
        } else {
          results.push({ path: page.path, success: false });
        }
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (pageError) {
        console.error(`Error processing ${page.path}:`, pageError);
        results.push({ path: page.path, success: false });
      }
    }

    const duration = Math.round((Date.now() - startTime) / 1000);
    await supabase.from("site_indexing_status").upsert({
      id: "main", status: "completed", total_pages_indexed: successCount,
      last_indexed_at: new Date().toISOString(), indexed_by: "smart-index-site",
      error_message: successCount === 0 ? "No pages were successfully indexed" : null,
      updated_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({ success: true, message: `Indexed ${successCount} of ${PAGES_TO_INDEX.length} pages`, duration: `${duration}s`, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Smart indexing error:", error);
    try {
      const supabase = createClient(process.env["SUPABASE_URL"]!, process.env["SUPABASE_SERVICE_ROLE_KEY"]!);
      await supabase.from("site_indexing_status").upsert({
        id: "main", status: "error", error_message: error instanceof Error ? error.message : "Unknown error",
        updated_at: new Date().toISOString(),
      });
    } catch {}
    return new Response(
      JSON.stringify({ success: false, error: "Indexing failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}
