// Workspace AI — admin-only agent for managing the website via chat.
//
// Auth: caller must send a Supabase user access token in Authorization; the
// token's user must have the 'admin' role. Everything else is rejected 401/403.
//
// Phase A scope: READ tools over the whole site (posts, book, users, plans,
// payments, contacts, referrals, analytics, settings...). Edit/Agent mode is
// recognized in the system prompt but write tools land in Phase B.

import { GEMINI_CHAT_URL, GEMINI_CHAT_MODEL, mapGeminiModel } from "./_shared/geminiClient";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Mode = "auto" | "ask" | "edit";

const MODEL_OPTIONS = new Set([
  "gemini-3.6-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.1-pro-preview",
]);

function systemPrompt(mode: Mode): string {
  const base = `Tum "Workspace AI" ho — Rahul Gupta ki website ka admin-side AI agent. Admin (Rahul) tumse site ke baare mein kuch bhi pooch sakta hai aur manage kar sakta hai.

## STYLE
- Default Hinglish (Hindi + English mix); admin English ya Hindi mein likhe to wahi follow karo.
- Concise, structured answers: headings, bullets, tables for data. No essay-style walls.
- Data questions ke liye HAMESHA tools use karo — kabhi guess mat karo. Tool se jo aaya wahi sach hai.
- Agar tool data empty aaye to clearly bolo "koi data nahi mila".

## TOOLS (READ ACCESS)
Tumhare paas poore site ka read access hai: POV posts, book chapters, plans, memberships, payments, users, contact messages, referral links, short URLs, portfolio, apps, site settings, analytics, indexed content. Sawaal ke hisaab se sahi tool call karo. Zaroorat ho to multiple tools.

## PRIVACY
- Individual users ka personal data (email etc.) sirf tab do jab admin explicitly maange — admin hi hai, par fir bhi relevant columns hi do.
- Kabhi bhi API keys, secrets, service tokens reveal mat karo.`;

  if (mode === "ask") {
    return `${base}

## MODE: ASK
Sirf jawab do. Koi bhi change/badlav suggest karte waqt clearly bolo ki tumne kuch change NAHI kiya — sirf information di hai.`;
  }
  if (mode === "edit") {
    return `${base}

## MODE: EDIT (AGENT)
Admin chahta hai ki tum site mein badlav karo. Abhi tumhare paas sirf READ tools hain — write/update/delete tools agle phase mein grant honge. Isliye:
1. Jo change maanga gaya hai, pehle relevant data read karke samjho.
2. Phir clearly batao EXACTLY kya change karna chahiye (kis row mein, kaunsa field, kya value) — ek precise action plan do.
3. Bata do ki write access abhi enable nahi hai, aur admin chahe to admin panel mein manually ye change kar sakta hai, ya next phase ke baad tum khud kar doge.
Kabhi claim mat karo ki tumne kuch change kar diya jab tak write tool ne confirm na kiya.`;
  }
  return `${base}

## MODE: AUTO
Khud decide karo: sawaal hai to sirf jawab do; badlav ki request hai to data read karke precise action plan do aur bata do ki write tools abhi Phase B mein aayenge. Kabhi claim mat karo ki change ho gaya jab tak write tool confirm na kare.`;
}

// ---------- Read tools ----------

interface ToolDef {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  run: (args: any, db: any) => Promise<unknown>;
}

const ok = <T,>(data: T, error: any) => (error ? { error: error.message } : data);

const TOOLS: ToolDef[] = [
  {
    name: "site_overview",
    description: "Poori website ka quick summary — har table mein kitne records hain (posts, users, payments, messages, etc.)",
    parameters: { type: "object", properties: {} },
    run: async (_a, db) => {
      const tables = [
        "pov_posts", "book_chapters", "books", "plans", "memberships", "plan_payments",
        "profiles", "contact_submissions", "referral_links", "short_urls",
        "portfolio_items", "app_info", "site_settings", "donations", "youtube_subscriptions",
      ];
      const out: Record<string, number | string> = {};
      for (const t of tables) {
        const { count, error } = await db.from(t).select("*", { count: "exact", head: true });
        out[t] = error ? `error: ${error.message}` : (count ?? 0);
      }
      const { data: auth } = await db.auth.admin.listUsers({ perPage: 1000 });
      out["auth_users"] = auth?.users?.length ?? "n/a";
      return out;
    },
  },
  {
    name: "list_pov_posts",
    description: "POV posts ki list — title, category, min_tier, visibility, reactions. Full content ke liye get_pov_post use karo.",
    parameters: {
      type: "object",
      properties: {
        limit: { type: "number", description: "max rows (default 20)" },
        include_hidden: { type: "boolean", description: "true karne par hidden posts bhi" },
      },
    },
    run: async (a, db) => {
      let q = db.from("pov_posts")
        .select("id, title, category, post_type, language, min_tier, is_visible, is_featured, is_hot_take, agree_count, disagree_count, comment_count, excerpt, created_at, updated_at")
        .order("display_order", { ascending: true })
        .limit(Math.min(a.limit ?? 20, 100));
      if (!a.include_hidden) q = q.eq("is_visible", true);
      const { data, error } = await q;
      return ok(data, error);
    },
  },
  {
    name: "get_pov_post",
    description: "Ek POV post ka full content (title, content, tier, flags) id se.",
    parameters: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
    run: async (a, db) => {
      const { data, error } = await db.from("pov_posts").select("*").eq("id", a.id).maybeSingle();
      return ok(data ?? "not found", error);
    },
  },
  {
    name: "list_book_chapters",
    description: "Book aur uske chapters — title, chapter_number, min_tier, published status, reading minutes.",
    parameters: { type: "object", properties: {} },
    run: async (_a, db) => {
      const { data: books, error: e1 } = await db.from("books").select("*");
      if (e1) return { error: e1.message };
      const { data: chapters, error: e2 } = await db.from("book_chapters")
        .select("id, book_id, slug, title, excerpt, min_tier, chapter_number, reading_minutes, is_published, updated_at")
        .order("chapter_number", { ascending: true });
      return ok({ books, chapters }, e2);
    },
  },
  {
    name: "get_book_chapter",
    description: "Ek chapter ka full content id se.",
    parameters: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
    run: async (a, db) => {
      const { data, error } = await db.from("book_chapters").select("*").eq("id", a.id).maybeSingle();
      return ok(data ?? "not found", error);
    },
  },
  {
    name: "list_plans",
    description: "Subscription plans — slug, name, price, billing period, features, visibility.",
    parameters: { type: "object", properties: {} },
    run: async (_a, db) => {
      const { data, error } = await db.from("plans").select("*").order("display_order", { ascending: true });
      return ok(data, error);
    },
  },
  {
    name: "list_memberships",
    description: "User memberships — kaun sa plan, status, kab start/expire. Summary counts bhi.",
    parameters: {
      type: "object",
      properties: { limit: { type: "number" } },
    },
    run: async (a, db) => {
      const { data, error } = await db.from("memberships")
        .select("id, user_id, plan_slug, status, source, started_at, expires_at, created_at")
        .order("created_at", { ascending: false })
        .limit(Math.min(a.limit ?? 50, 200));
      if (error) return { error: error.message };
      const counts: Record<string, number> = {};
      for (const m of data ?? []) {
        const k = `${m.plan_slug}:${m.status}`;
        counts[k] = (counts[k] ?? 0) + 1;
      }
      return { counts, memberships: data };
    },
  },
  {
    name: "list_payments",
    description: "Plan payments — amount, plan, provider, status, buyer. Newest first.",
    parameters: { type: "object", properties: { limit: { type: "number" }, status: { type: "string" } } },
    run: async (a, db) => {
      let q = db.from("plan_payments")
        .select("id, user_id, plan_slug, amount, currency, provider, status, buyer_email, buyer_name, created_at")
        .order("created_at", { ascending: false })
        .limit(Math.min(a.limit ?? 25, 100));
      if (a.status) q = q.eq("status", a.status);
      const { data, error } = await q;
      return ok(data, error);
    },
  },
  {
    name: "list_users",
    description: "Registered users — id, email, display name, signup date, role. Membership ke liye list_memberships use karo.",
    parameters: { type: "object", properties: { limit: { type: "number" } } },
    run: async (a, db) => {
      const { data: auth, error } = await db.auth.admin.listUsers({ perPage: Math.min(a.limit ?? 50, 200) });
      if (error) return { error: error.message };
      const users = (auth?.users ?? []).map((u: any) => ({
        id: u.id, email: u.email, created_at: u.created_at, last_sign_in_at: u.last_sign_in_at,
      }));
      const ids = users.map((u: any) => u.id);
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        db.from("profiles").select("user_id, display_name").in("user_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]),
        db.from("user_roles").select("user_id, role").in("user_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]),
      ]);
      return users.map((u: any) => ({
        ...u,
        display_name: profiles?.find((p: any) => p.user_id === u.id)?.display_name ?? null,
        roles: roles?.filter((r: any) => r.user_id === u.id).map((r: any) => r.role) ?? [],
      }));
    },
  },
  {
    name: "list_contacts",
    description: "Contact form messages — name, email, message, status, date.",
    parameters: { type: "object", properties: { limit: { type: "number" }, status: { type: "string" } } },
    run: async (a, db) => {
      let q = db.from("contact_submissions").select("*").order("created_at", { ascending: false }).limit(Math.min(a.limit ?? 25, 100));
      if (a.status) q = q.eq("status", a.status);
      const { data, error } = await q;
      return ok(data, error);
    },
  },
  {
    name: "list_referral_links",
    description: "Referral links/offers — name, offer, category, link, visibility.",
    parameters: { type: "object", properties: {} },
    run: async (_a, db) => {
      const { data, error } = await db.from("referral_links").select("id, name, description, offer, category, referral_link, is_visible, display_order").order("display_order", { ascending: true });
      return ok(data, error);
    },
  },
  {
    name: "list_short_urls",
    description: "Short URLs — code, destination, click count.",
    parameters: { type: "object", properties: { limit: { type: "number" } } },
    run: async (a, db) => {
      const { data, error } = await db.from("short_urls").select("id, short_code, original_url, click_count, created_at").order("created_at", { ascending: false }).limit(Math.min(a.limit ?? 25, 100));
      return ok(data, error);
    },
  },
  {
    name: "list_portfolio_items",
    description: "Portfolio projects — title, category, tech stack, urls, visibility.",
    parameters: { type: "object", properties: {} },
    run: async (_a, db) => {
      const { data, error } = await db.from("portfolio_items").select("id, title, description, category, tech_stack, live_url, source_url, is_visible, is_featured, display_order").order("display_order", { ascending: true });
      return ok(data, error);
    },
  },
  {
    name: "list_apps",
    description: "Apps (My Apps section) — name, version, urls, visibility.",
    parameters: { type: "object", properties: {} },
    run: async (_a, db) => {
      const { data, error } = await db.from("app_info").select("id, app_name, app_description, version, download_url, play_store_url, is_visible");
      return ok(data, error);
    },
  },
  {
    name: "get_site_settings",
    description: "Site settings key-value pairs (category ke saath).",
    parameters: { type: "object", properties: { category: { type: "string" } } },
    run: async (a, db) => {
      let q = db.from("site_settings").select("key, value, category").order("category", { ascending: true });
      if (a.category) q = q.eq("category", a.category);
      const { data, error } = await q;
      return ok(data, error);
    },
  },
  {
    name: "analytics_summary",
    description: "Website traffic summary — last N days ke page views, sessions, visitors, top pages.",
    parameters: { type: "object", properties: { days: { type: "number", description: "default 7" } } },
    run: async (a, db) => {
      const days = Math.min(a.days ?? 7, 90);
      const since = new Date(Date.now() - days * 86400000).toISOString();
      const [{ count: pageViews }, { count: sessions }, { data: topPages }, { count: errors }] = await Promise.all([
        db.from("analytics_page_views").select("*", { count: "exact", head: true }).gte("created_at", since),
        db.from("analytics_sessions").select("*", { count: "exact", head: true }).gte("created_at", since),
        db.from("analytics_page_views").select("page_path").gte("created_at", since).limit(1000),
        db.from("analytics_errors").select("*", { count: "exact", head: true }).gte("created_at", since),
      ]);
      const pageCounts: Record<string, number> = {};
      for (const p of topPages ?? []) pageCounts[p.page_path] = (pageCounts[p.page_path] ?? 0) + 1;
      const top = Object.entries(pageCounts).sort((x, y) => y[1] - x[1]).slice(0, 10)
        .map(([path, views]) => ({ path, views }));
      return { days, page_views: pageViews, sessions, errors, top_pages: top };
    },
  },
  {
    name: "search_site_content",
    description: "Indexed site content mein search — pages, titles, descriptions (public chatbot ka index).",
    parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
    run: async (a, db) => {
      const q = String(a.query ?? "").slice(0, 100);
      const { data, error } = await db.from("site_indexed_content")
        .select("page_path, page_title, page_description, last_indexed_at")
        .or(`page_title.ilike.%${q}%,page_description.ilike.%${q}%,content.ilike.%${q}%`)
        .limit(15);
      return ok(data, error);
    },
  },
];

const TOOL_SCHEMAS = TOOLS.map((t) => ({
  type: "function",
  function: { name: t.name, description: t.description, parameters: t.parameters },
}));

// ---------- LLM call (same Gemini chain the site uses) ----------

async function callModel(body: Record<string, unknown>, stream: boolean): Promise<Response> {
  const geminiKey = process.env["GEMINI_API_KEY"];
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const attempts: Array<{ url: string; key: string; model: string }> = [];

  const chosen = mapGeminiModel(body.model as string);
  if (geminiKey) attempts.push({ url: GEMINI_CHAT_URL, key: geminiKey, model: chosen });
  if (geminiKey && chosen !== GEMINI_CHAT_MODEL) attempts.push({ url: GEMINI_CHAT_URL, key: geminiKey, model: GEMINI_CHAT_MODEL });
  if (lovableKey) attempts.push({ url: "https://ai.gateway.lovable.dev/v1/chat/completions", key: lovableKey, model: "google/gemini-3.7-flash" });

  let lastErr = "no provider configured";
  for (const t of attempts) {
    try {
      const resp = await fetch(t.url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t.key}` },
        body: JSON.stringify({ ...body, model: t.model, stream }),
      });
      if (resp.ok) return resp;
      const status = resp.status;
      const txt = await resp.text().catch(() => "");
      lastErr = `${t.model}: HTTP ${status} ${txt.slice(0, 200)}`;
      if (![402, 403, 429].includes(status) && status < 500) break; // terminal
    } catch (e: any) {
      lastErr = e?.message ?? "network error";
    }
  }
  throw new Error(`AI call failed — ${lastErr}`);
}

// ---------- Handler ----------

export async function handler(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (obj: unknown, status = 200) =>
    new Response(JSON.stringify(obj), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    // --- admin auth ---
    const token = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
    if (!token) return json({ error: "Unauthorized" }, 401);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);

    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", { _user_id: userData.user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "Admin access required" }, 403);

    const body = await request.json();
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const mode: Mode = ["auto", "ask", "edit"].includes(body.mode) ? body.mode : "auto";
    const model = MODEL_OPTIONS.has(body.model) ? body.model : GEMINI_CHAT_MODEL;
    const threadId = typeof body.threadId === "string" ? body.threadId.slice(0, 64) : null;
    const lastUserMsg = [...messages].reverse().find((m: any) => m.role === "user");
    const promptText = typeof lastUserMsg?.content === "string"
      ? lastUserMsg.content
      : Array.isArray(lastUserMsg?.content)
        ? lastUserMsg.content.filter((p: any) => p.type === "text").map((p: any) => p.text).join(" ")
        : "";

    const convo: any[] = [{ role: "system", content: systemPrompt(mode) }, ...messages.slice(-20)];
    const toolsUsed: string[] = [];

    // --- tool loop (non-streaming rounds) ---
    for (let round = 0; round < 5; round++) {
      const resp = await callModel({ model, messages: convo, tools: TOOL_SCHEMAS, tool_choice: "auto" }, false);
      const data: any = await resp.json();
      const msg = data.choices?.[0]?.message;
      if (!msg) break;

      const calls = msg.tool_calls ?? [];
      if (calls.length === 0) {
        // Model produced a final answer without tools — stream it as the reply.
        const content = msg.content ?? "";
        await logActivity(supabaseAdmin, { admin_user_id: userData.user.id, thread_id: threadId, mode, model, prompt: promptText.slice(0, 2000), tools_used: toolsUsed, result_summary: content.slice(0, 500) });
        return sseFromText(content);
      }

      convo.push(msg);
      for (const call of calls) {
        const tool = TOOLS.find((t) => t.name === call.function?.name);
        let result: unknown;
        if (!tool) {
          result = { error: "unknown tool" };
        } else {
          toolsUsed.push(tool.name);
          try {
            const args = call.function.arguments ? JSON.parse(call.function.arguments) : {};
            result = await tool.run(args, supabaseAdmin);
          } catch (e: any) {
            result = { error: e?.message ?? "tool failed" };
          }
        }
        convo.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(result)?.slice(0, 12000) ?? "null",
        });
      }
    }

    // --- final streaming answer ---
    const streamResp = await callModel({ model, messages: convo }, true);
    await logActivity(supabaseAdmin, { admin_user_id: userData.user.id, thread_id: threadId, mode, model, prompt: promptText.slice(0, 2000), tools_used: toolsUsed, result_summary: "(streamed)" });

    return new Response(streamResp.body, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "X-Tools-Used": toolsUsed.join(","),
      },
    });
  } catch (e: any) {
    console.error("workspace-ai error:", e);
    return json({ error: e?.message ?? "Internal error" }, 500);
  }
}

async function logActivity(db: any, row: Record<string, unknown>) {
  try {
    await db.from("ai_activity_log").insert(row);
  } catch (e) {
    console.error("activity log failed", e);
  }
}

/** Wrap a plain text answer as an OpenAI-compatible SSE stream. */
function sseFromText(text: string): Response {
  const chunk = (content: string, finish: string | null = null) =>
    `data: ${JSON.stringify({ choices: [{ delta: content ? { content } : {}, finish_reason: finish }] })}\n\n`;
  const body = chunk(text) + chunk("", "stop") + "data: [DONE]\n\n";
  return new Response(body, {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
  });
}
