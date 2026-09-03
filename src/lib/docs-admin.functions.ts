import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface DocsSection {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  position: number | null;
}

export interface DocsPage {
  id: string;
  section_id: string | null;
  slug: string;
  title: string;
  description: string | null;
  content?: string | null;
  status: "draft" | "published";
  position: number | null;
  updated_at?: string | null;
}

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Forbidden");
}

async function docsFetch(path: string, init?: RequestInit) {
  const base = (process.env["DOCS_API_BASE_URL"] ?? "").replace(/\/+$/, "");
  const key = process.env["DOCS_ADMIN_API_KEY"];
  if (!base || !key) throw new Error("Docs API secrets configured nahi hain");

  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const text = await res.text();
  let body: any = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }
  if (!res.ok) {
    const msg = body?.error ?? body?.raw ?? `Docs API error ${res.status}`;
    throw new Error(`${res.status}: ${msg}`);
  }
  return body;
}

export const docsHealth = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as any);
    return docsFetch("/api/public/admin/docs/health");
  });

export const listDocsPages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as any);
    const body = await docsFetch("/api/public/admin/docs/pages");
    const pages: DocsPage[] = body?.pages ?? body?.data ?? (Array.isArray(body) ? body : []);
    const sections: DocsSection[] = body?.sections ?? [];
    return { pages, sections };
  });

export const getDocsPage = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input?.id) throw new Error("id required");
    return input;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const body = await docsFetch(`/api/public/admin/docs/pages/${encodeURIComponent(data.id)}`);
    return (body?.page ?? body) as DocsPage;
  });

export const saveDocsPage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: Partial<DocsPage>) => {
    if (!input?.slug || !input?.title) throw new Error("slug aur title zaroori hai");
    if ((input.content ?? "").length > 200_000) throw new Error("Content 200,000 characters se bada hai");
    return input;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    return docsFetch("/api/public/admin/docs/pages", {
      method: "POST",
      body: JSON.stringify(data),
    });
  });

export const deleteDocsPage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input?.id) throw new Error("id required");
    return input;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    return docsFetch(`/api/public/admin/docs/pages/${encodeURIComponent(data.id)}`, {
      method: "DELETE",
    });
  });

export const listDocsSections = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as any);
    const body = await docsFetch("/api/public/admin/docs/sections");
    return (body?.sections ?? (Array.isArray(body) ? body : [])) as DocsSection[];
  });

export const saveDocsSection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: Partial<DocsSection>) => {
    if (!input?.slug || !input?.title) throw new Error("slug aur title zaroori hai");
    return input;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    return docsFetch("/api/public/admin/docs/sections", {
      method: "POST",
      body: JSON.stringify(data),
    });
  });

export const deleteDocsSection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input?.id) throw new Error("id required");
    return input;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    return docsFetch(`/api/public/admin/docs/sections/${encodeURIComponent(data.id)}`, {
      method: "DELETE",
    });
  });

export const reindexDocs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as any);
    return docsFetch("/api/public/admin/docs/reindex", { method: "POST" });
  });
