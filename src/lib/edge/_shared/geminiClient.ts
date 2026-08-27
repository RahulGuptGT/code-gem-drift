// Shared Google Gemini client config (OpenAI-compatible endpoint).
//
// All AI features in this app run on the project's own GEMINI_API_KEY instead of
// Lovable AI credits. Google exposes an OpenAI-compatible surface, so existing
// chat-completions / embeddings request bodies (messages, tools, tool_calls,
// streaming SSE, vision image_url parts) work unchanged.

export const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/openai";
export const GEMINI_CHAT_URL = `${GEMINI_BASE}/chat/completions`;
export const GEMINI_EMBED_URL = `${GEMINI_BASE}/embeddings`;

/** Everyday chat / agent / vision model. */
export const GEMINI_CHAT_MODEL = "gemini-3.6-flash";
/** Cheap + fast: titles, formulas, tiny classifications. */
export const GEMINI_LITE_MODEL = "gemini-3.5-flash-lite";
/** Slow but most accurate: screenshot extraction. */
export const GEMINI_PRO_MODEL = "gemini-3.1-pro-preview";
/** 1536-dim embeddings keep the existing pgvector(1536) columns valid. */
export const GEMINI_EMBED_MODEL = "gemini-embedding-001";
export const GEMINI_EMBED_DIMS = 1536;

/**
 * Normalizes any legacy/gateway-prefixed model id (e.g. "google/gemini-2.5-flash",
 * "openai/gpt-5.6-sol") to a real Gemini model id.
 */
export function mapGeminiModel(model?: string | null): string {
  const raw = String(model || "").trim();
  if (!raw) return GEMINI_CHAT_MODEL;
  const id = raw.includes("/") ? raw.split("/").pop()! : raw;
  if (!id.startsWith("gemini")) return GEMINI_CHAT_MODEL;
  if (/^gemini-2/.test(id)) return id.includes("pro") ? GEMINI_PRO_MODEL : id.includes("lite") ? GEMINI_LITE_MODEL : GEMINI_CHAT_MODEL;
  // Preview/next-gen ids that aren't publicly served fall back to the stable flash model.
  return id;
}

export function getGeminiKey(): string | undefined {
  return process.env["GEMINI_API_KEY"] || undefined;
}
