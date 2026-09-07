// Workspace AI — admin-only agent for managing the website via chat.
//
// Auth: caller must send a Supabase user access token in Authorization; the
// token's user must have the 'admin' role. Everything else is rejected 401/403.
//
// Phase A: READ tools over the whole site.
// Phase B: WRITE tools (create/update/delete on whitelisted tables + membership
// grants). Write tools are only exposed in 'auto' and 'edit' modes — 'ask' mode
// is strictly read-only.

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

  const writeRules = `

## TOOLS (WRITE ACCESS) — Phase B
Tumhare paas ab write tools bhi hain:
- \`create_record\` — nayi row banane ke liye (table + values).
- \`update_record\` — existing row edit karne ke liye (table + id + sirf badalne wale fields).
- \`delete_record\` — row delete karne ke liye (table + id + confirm:true).
- \`grant_membership\` — kisi user ko plan dena/badalna (email ya user_id + plan_slug).
- \`set_site_setting\` — site setting key ka value set karna.

### WRITE RULES (STRICT)
1. Update/delete se PEHLE hamesha relevant read tool chalao taaki sahi row id mile. id guess mat karo.
2. \`update_record\` mein sirf wahi fields bhejo jo actually badalne hain — baaki chhod do.
3. DELETE destructive hai: pehle row read karke admin ko batao kya delete hoga aur explicit "haan delete karo" milne par hi \`confirm: true\` ke saath chalao. Agar admin ne clearly delete bola hai to seedha kar sakte ho, par response mein kya delete hua wo clearly likho.
4. Bulk destructive kaam (ek saath 5+ rows delete) mat karo — pehle confirm maango.
5. Har write ke baad short summary do: kya badla, kis row mein, purani vs nayi value.
6. Tool ne error diya to us error ko clearly batao — success ka jhooth kabhi mat bolo.
7. min_tier values sirf: public, starter, signature, sovereign.`;

  if (mode === "ask") {
    return `${base}

## MODE: ASK (READ-ONLY)
Sirf jawab do. Is mode mein write tools available hi nahi hain. Agar admin koi change maange to batao ki Ask mode read-only hai — Default ya Edit mode mein switch karke bolein.`;
  }
  if (mode === "edit") {
    return `${base}${writeRules}

## MODE: EDIT (AGENT)
Admin chahta hai ki tum site mein badlav karo. Read karo → change apply karo (write tools se) → summary do. Bina zaroori clarification ke ruk mat jao; agar request ambiguous hai tabhi sawaal poocho. Kabhi claim mat karo ki kuch change hua jab tak write tool ne success confirm na kiya ho.`;
  }
  return `${base}${writeRules}

## MODE: AUTO
Khud decide karo: sawaal hai to sirf jawab do; badlav ki request hai to write tools se change apply karo aur summary do. Destructive delete ke liye confirm rule follow karo. Kabhi claim mat karo ki change ho gaya jab tak write tool confirm na kare.`;
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

// ---------- Write tools (Phase B) ----------

/** Whitelisted writable tables and the columns the agent may set. */
const WRITABLE: Record<string, { columns: string[]; deletable?: boolean; label: string }> = {
  pov_posts: {
    label: "POV post",
    deletable: true,
    columns: ["title", "content", "excerpt", "post_type", "category", "language", "author_name", "min_tier", "is_visible", "is_featured", "is_hot_take", "display_order"],
  },
  books: {
    label: "Book",
    columns: ["slug", "title", "subtitle", "description", "cover_url", "author_name", "is_published"],
  },
  book_chapters: {
    label: "Book chapter",
    deletable: true,
    columns: ["book_id", "slug", "title", "excerpt", "content", "min_tier", "chapter_number", "reading_minutes", "is_published"],
  },
  plans: {
    label: "Plan",
    columns: ["slug", "name", "tagline", "description", "price_inr", "billing_period", "duration_days", "features", "is_visible", "is_highlighted", "display_order"],
  },
  referral_links: {
    label: "Referral link",
    deletable: true,
    columns: ["name", "description", "offer", "category", "logo", "referral_link", "bg_color", "text_color", "is_visible", "display_order"],
  },
  short_urls: {
    label: "Short URL",
    deletable: true,
    columns: ["short_code", "original_url"],
  },
  portfolio_items: {
    label: "Portfolio item",
    deletable: true,
    columns: ["title", "description", "long_description", "image_url", "live_url", "source_url", "tech_stack", "category", "platform", "status", "is_visible", "is_featured", "display_order"],
  },
  app_info: {
    label: "App",
    deletable: true,
    columns: ["app_name", "app_description", "package_name", "version", "download_url", "play_store_url", "app_icon_url", "screenshots", "features", "is_visible"],
  },
  contact_submissions: {
    label: "Contact message",
    deletable: true,
    columns: ["status"],
  },
  site_settings: {
    label: "Site setting",
    columns: ["key", "value", "category"],
  },
};

const TIERS = new Set(["public", "starter", "signature", "sovereign"]);

function sanitize(table: string, values: Record<string, unknown>) {
  const cfg = WRITABLE[table];
  if (!cfg) throw new Error(`Table '${table}' write ke liye allowed nahi hai. Allowed: ${Object.keys(WRITABLE).join(", ")}`);
  const clean: Record<string, unknown> = {};
  const rejected: string[] = [];
  for (const [k, v] of Object.entries(values ?? {})) {
    if (cfg.columns.includes(k)) clean[k] = v;
    else rejected.push(k);
  }
  if (typeof clean["min_tier"] === "string" && !TIERS.has(clean["min_tier"] as string)) {
    throw new Error(`min_tier '${clean["min_tier"]}' invalid — public | starter | signature | sovereign`);
  }
  if (Object.keys(clean).length === 0) throw new Error(`Koi valid column nahi mila. '${table}' ke allowed columns: ${cfg.columns.join(", ")}`);
  return { clean, rejected, cfg };
}

const WRITE_TOOLS: ToolDef[] = [
  {
    name: "create_record",
    description: "Nayi row banao ek allowed table mein (pov_posts, books, book_chapters, plans, referral_links, short_urls, portfolio_items, app_info, site_settings).",
    parameters: {
      type: "object",
      properties: {
        table: { type: "string", description: "table name" },
        values: { type: "object", description: "column -> value map" },
      },
      required: ["table", "values"],
    },
    run: async (a, db) => {
      const { clean, rejected, cfg } = sanitize(a.table, a.values);
      const { data, error } = await db.from(a.table).insert(clean).select().maybeSingle();
      if (error) return { error: error.message };
      return { created: true, label: cfg.label, id: data?.id, row: data, ignored_fields: rejected };
    },
  },
  {
    name: "update_record",
    description: "Existing row update karo. Sirf wahi fields bhejo jo badalne hain. id pehle read tool se nikalo.",
    parameters: {
      type: "object",
      properties: {
        table: { type: "string" },
        id: { type: "string", description: "row ka uuid" },
        values: { type: "object" },
      },
      required: ["table", "id", "values"],
    },
    run: async (a, db) => {
      const { clean, rejected, cfg } = sanitize(a.table, a.values);
      const { data: before } = await db.from(a.table).select("*").eq("id", a.id).maybeSingle();
      if (!before) return { error: `${cfg.label} id '${a.id}' nahi mila` };
      const { data, error } = await db.from(a.table).update(clean).eq("id", a.id).select().maybeSingle();
      if (error) return { error: error.message };
      const changed: Record<string, unknown> = {};
      for (const k of Object.keys(clean)) changed[k] = { from: (before as any)[k], to: (data as any)?.[k] };
      return { updated: true, label: cfg.label, id: a.id, changed, ignored_fields: rejected };
    },
  },
  {
    name: "delete_record",
    description: "Row delete karo. DESTRUCTIVE — confirm:true zaroori hai aur pehle row read karke admin ko batana chahiye.",
    parameters: {
      type: "object",
      properties: {
        table: { type: "string" },
        id: { type: "string" },
        confirm: { type: "boolean", description: "true hona chahiye warna delete nahi hoga" },
      },
      required: ["table", "id", "confirm"],
    },
    run: async (a, db) => {
      const cfg = WRITABLE[a.table];
      if (!cfg) return { error: `Table '${a.table}' allowed nahi hai` };
      if (!cfg.deletable) return { error: `${cfg.label} delete karna allowed nahi hai — sirf update ho sakta hai` };
      if (a.confirm !== true) return { error: "confirm:true nahi mila — delete skip kiya. Admin se confirmation lo." };
      const { data: before } = await db.from(a.table).select("*").eq("id", a.id).maybeSingle();
      if (!before) return { error: `${cfg.label} id '${a.id}' nahi mila` };
      const { error } = await db.from(a.table).delete().eq("id", a.id);
      if (error) return { error: error.message };
      return { deleted: true, label: cfg.label, id: a.id, deleted_row: before };
    },
  },
  {
    name: "set_site_setting",
    description: "Site setting key ka value set karo (naya ho to bana dega).",
    parameters: {
      type: "object",
      properties: {
        key: { type: "string" },
        value: { type: "string" },
        category: { type: "string", description: "e.g. contact, social, general" },
      },
      required: ["key", "value"],
    },
    run: async (a, db) => {
      const { data: existing } = await db.from("site_settings").select("*").eq("key", a.key).maybeSingle();
      if (existing) {
        const { error } = await db.from("site_settings").update({ value: String(a.value) }).eq("key", a.key);
        if (error) return { error: error.message };
        return { updated: true, key: a.key, from: existing.value, to: String(a.value) };
      }
      const { error } = await db.from("site_settings").insert({ key: a.key, value: String(a.value), category: a.category ?? "general" });
      if (error) return { error: error.message };
      return { created: true, key: a.key, value: String(a.value) };
    },
  },
  {
    name: "grant_membership",
    description: "Kisi user ko plan dena / badalna. Email ya user_id do aur plan_slug (starter, signature, sovereign).",
    parameters: {
      type: "object",
      properties: {
        email: { type: "string" },
        user_id: { type: "string" },
        plan_slug: { type: "string" },
        days: { type: "number", description: "kitne din valid; na do to plan ka default duration ya lifetime" },
      },
      required: ["plan_slug"],
    },
    run: async (a, db) => {
      let userId: string | null = a.user_id ?? null;
      if (!userId && a.email) {
        const { data: list } = await db.auth.admin.listUsers({ perPage: 1000 });
        const found = (list?.users ?? []).find((u: any) => (u.email ?? "").toLowerCase() === String(a.email).toLowerCase());
        if (!found) return { error: `User '${a.email}' nahi mila` };
        userId = found.id;
      }
      if (!userId) return { error: "email ya user_id chahiye" };

      const { data: plan } = await db.from("plans").select("slug, name, duration_days").eq("slug", a.plan_slug).maybeSingle();
      if (!plan) return { error: `Plan '${a.plan_slug}' nahi mila` };

      const days = a.days ?? plan.duration_days ?? null;
      const expires = days ? new Date(Date.now() + Number(days) * 86400000).toISOString() : null;

      const { data: existing } = await db.from("memberships").select("id, plan_slug, status, expires_at").eq("user_id", userId).maybeSingle();
      if (existing) {
        const { error } = await db.from("memberships")
          .update({ plan_slug: plan.slug, status: "active", source: "admin_ai", started_at: new Date().toISOString(), expires_at: expires })
          .eq("id", existing.id);
        if (error) return { error: error.message };
        return { updated: true, user_id: userId, from: existing.plan_slug, to: plan.slug, expires_at: expires };
      }
      const { error } = await db.from("memberships")
        .insert({ user_id: userId, plan_slug: plan.slug, status: "active", source: "admin_ai", expires_at: expires });
      if (error) return { error: error.message };
      return { created: true, user_id: userId, plan: plan.slug, expires_at: expires };
    },
  },
];

const ALL_TOOLS = [...TOOLS, ...WRITE_TOOLS];

const toSchemas = (tools: ToolDef[]) =>
  tools.map((t) => ({
    type: "function",
    function: { name: t.name, description: t.description, parameters: t.parameters },
  }));

const READ_SCHEMAS = toSchemas(TOOLS);
const ALL_SCHEMAS = toSchemas(ALL_TOOLS);


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
    const writeLog: unknown[] = [];

    // Write tools are only exposed outside read-only 'ask' mode.
    const allowWrite = mode !== "ask";
    const availableTools = allowWrite ? ALL_TOOLS : TOOLS;
    const schemas = allowWrite ? ALL_SCHEMAS : READ_SCHEMAS;

    // --- tool loop (non-streaming rounds) ---
    for (let round = 0; round < 8; round++) {
      const resp = await callModel({ model, messages: convo, tools: schemas, tool_choice: "auto" }, false);
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
        const tool = availableTools.find((t) => t.name === call.function?.name);
        let result: unknown;
        if (!tool) {
          result = WRITE_TOOLS.some((t) => t.name === call.function?.name)
            ? { error: "Ask mode read-only hai — write tools available nahi. Default ya Edit mode use karein." }
            : { error: "unknown tool" };
        } else {
          toolsUsed.push(tool.name);
          try {
            const args = call.function.arguments ? JSON.parse(call.function.arguments) : {};
            result = await tool.run(args, supabaseAdmin);
            if (WRITE_TOOLS.some((t) => t.name === tool.name)) {
              writeLog.push({ tool: tool.name, args, result });
            }
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
