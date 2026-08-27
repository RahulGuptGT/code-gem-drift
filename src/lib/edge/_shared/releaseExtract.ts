// Shared DistroKid screenshot → release extraction rules.
//
// Used by:
//  - supabase/functions/workspace-ai-chat  (tool: extract_release_from_screenshots)
//  - supabase/functions/extract-release-from-screenshots (UI import flow)
//
// Single source of truth for the vision prompt, platform id normalization and
// duration parsing so both paths behave identically.

import { GEMINI_CHAT_URL, GEMINI_PRO_MODEL, GEMINI_CHAT_MODEL } from "./geminiClient";
import { inlineImageParts } from "./imageInline";

const GATEWAY = GEMINI_CHAT_URL;

/** Heavy, slow-but-accurate vision model. Accuracy > latency here (by design). */
export const EXTRACT_MODEL = GEMINI_PRO_MODEL;

/** Used when the pro model is out of quota / unavailable. */
export const EXTRACT_FALLBACK_MODELS = [GEMINI_CHAT_MODEL];

/** Platform ids exactly as the release form stores them in distrokid_releases.platforms. */
export const PLATFORM_IDS = [
  "spotify", "apple", "youtube", "amazon", "jiosaavn", "deezer", "tidal", "tiktok", "instagram",
] as const;

export type PlatformId = typeof PLATFORM_IDS[number];

const PLATFORM_LABELS: Record<PlatformId, string> = {
  spotify: "Spotify",
  apple: "Apple Music",
  youtube: "YouTube Music",
  amazon: "Amazon Music",
  jiosaavn: "JioSaavn",
  deezer: "Deezer",
  tidal: "Tidal",
  tiktok: "TikTok",
  instagram: "Instagram / Facebook / Reels",
};

export function platformLabel(id: string): string {
  return (PLATFORM_LABELS as any)[id] || id;
}

/** Map anything a screenshot could show (icon caption, store name, label) → platform id. */
export function normalizePlatform(raw: unknown): PlatformId | null {
  const s = String(raw ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "");
  if (!s) return null;
  if (s.includes("spotify")) return "spotify";
  if (s.includes("applemusic") || s === "apple" || s.includes("itunes")) return "apple";
  if (s.includes("youtube") || s.includes("ytmusic")) return "youtube";
  if (s.includes("amazon")) return "amazon";
  if (s.includes("jiosaavn") || s.includes("saavn") || s.includes("jio")) return "jiosaavn";
  if (s.includes("deezer")) return "deezer";
  if (s.includes("tidal")) return "tidal";
  if (s.includes("tiktok") || s.includes("resso")) return "tiktok";
  if (s.includes("instagram") || s.includes("facebook") || s.includes("reels") || s.includes("meta")) return "instagram";
  return null;
}

export function normalizePlatforms(list: unknown): PlatformId[] {
  if (!Array.isArray(list)) return [];
  const out = new Set<PlatformId>();
  for (const item of list) {
    const id = normalizePlatform(item);
    if (id) out.add(id);
  }
  return Array.from(out);
}

/** "3:41" | "03:41" | "1:03:41" | 221 → 221 seconds. Returns null when unreadable. */
export function toSeconds(raw: unknown): number | null {
  if (raw == null) return null;
  if (typeof raw === "number" && Number.isFinite(raw)) return Math.max(0, Math.round(raw));
  const s = String(raw).trim();
  if (!s) return null;
  if (/^\d+$/.test(s)) return Math.max(0, parseInt(s, 10));
  const parts = s.split(":").map((p) => p.trim());
  if (parts.length < 2 || parts.some((p) => !/^\d+$/.test(p))) return null;
  const nums = parts.map((p) => parseInt(p, 10));
  return nums.length === 3
    ? nums[0] * 3600 + nums[1] * 60 + nums[2]
    : nums[0] * 60 + nums[1];
}

export function str(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

/** Accept YYYY-MM-DD or YYYY-MM-DDTHH:MM, normalize to YYYY-MM-DDTHH:MM. */
export function normalizeDateTime(v: string | null): string | null {
  if (!v) return null;
  const s = v.replace(" ", "T");
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return `${s}T00:00`;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s)) return s.slice(0, 16);
  return null;
}

export function normalizeDate(v: string | null): string | null {
  if (!v) return null;
  const m = String(v).match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

export const EXTRACT_SYSTEM_PROMPT = `You are a meticulous OCR + extraction engine for DistroKid release screenshots.
Accuracy matters far more than speed. Zoom in mentally on every small badge, pill and icon before answering.

STEP A — classify EVERY image as exactly one of:
1. "public"  — DistroKid share / release-landing page. Signs: dark hero with cover + title + artist on the LEFT; right side shows "Record Label:", "Upload date:", "DistroKid UPC:". Below there is a "Track list" card where each track row has an ISRC badge (small dark pill, e.g. QZK6L2499011). Below that, a row of DELIVERED STORE icons/names (Spotify, Apple Music, YouTube Music, Amazon, JioSaavn, Deezer, Tidal, TikTok, Instagram/Facebook…).
2. "vault"   — DistroKid Vault page. Signs: blue header with "VAULT" / "YOUR VAULT CONTAINS …", a key-value table with Filename, Title, Album title, Upload date (with time), Release date, Language, Genre, Sampling rate, Format, File size, Duration (mm:ss), Album UID, DK UPC, DK ISRC.
3. "other"   — anything else. Ignore for field extraction.

STEP B — extract, per strict source rules. Never cross these:

From "public" pages take ONLY:
  - title, artist_name, featured_artists (only if literally printed)
  - type (Single if 1 track row, Album if >1)
  - upc            (from "DistroKid UPC:")
  - tracks[].title (from the Track list rows, in the order shown)
  - tracks[].isrc  (from the ISRC badge on that same row — read every character carefully)
  - platforms[]    (ONLY from the delivered-stores row; IGNORE the artist header's social icons)
From "public" pages DO NOT take: label, upload/release date, cover url, genre, language, duration.

From "vault" pages take:
  - submitted_at = Vault "Upload date" as "YYYY-MM-DDTHH:MM" (include the printed time)
  - release_date = Vault "Release date" as "YYYY-MM-DD"
  - language, genre
  - album_uid    = Vault "Album UID" (distinct from UPC)
  - tracks[].title from Vault "Title"
  - tracks[].duration_seconds from Vault "Duration" (mm:ss) — DURATION MAY ONLY COME FROM A VAULT PAGE
  - also read Title / Album title / DK UPC / DK ISRC for verification only.

TRACKS ARE MANDATORY when any track row or Vault entry is visible. Return one entry per track, ordered as printed.
Merge public + vault info for the same track by matching title (case/space-insensitive) or ISRC. If a track has no Vault page, leave its duration_seconds null.

NEVER guess:
  - live_at: NEVER extract, NEVER infer, ALWAYS null. Ignore "delivered / processed and delivered" badges for this purpose.
  - Never infer genre, language, label, explicit or featured artists from context or artist name.
  - If a value is not literally printed, return null.
  - platforms MUST be lowercase ids from this exact list: ${PLATFORM_IDS.join(", ")} (Instagram/Facebook → instagram, YouTube Music → youtube, Apple Music → apple).

Cross-verification (only when BOTH page types present): title_match, upc_match, isrc_matches[] per track. Otherwise null.

Return STRICT JSON only (no markdown, no commentary):
{
  "pages_detected": ["public" | "vault" | "other", ...],
  "draft": {
    "title": string|null, "artist_name": string|null, "featured_artists": string|null,
    "type": "Single"|"Album"|null,
    "release_date": "YYYY-MM-DD"|null, "submitted_at": "YYYY-MM-DDTHH:MM"|null, "live_at": null,
    "upc": string|null, "album_uid": string|null, "label": string|null,
    "genre": string|null, "language": string|null,
    "tracks": [ { "title": string, "isrc": string|null, "duration_seconds": number|null, "duration_text": string|null } ],
    "platforms": string[]
  },
  "confidence": { "<field>": "high"|"medium"|"low" },
  "verification": { "title_match": boolean|null, "upc_match": boolean|null, "isrc_matches": (boolean|null)[] },
  "warnings": string[]
}
Max 25 tracks. Add a warning for every field you had to leave null that is normally printed on the detected page type, and for any value you read with low confidence.`;

export interface ExtractedTrack {
  title: string;
  isrc: string | null;
  duration_seconds: number | null;
}

export interface ExtractResult {
  pages_detected: string[];
  draft: {
    title: string | null;
    artist_name: string | null;
    featured_artists: string | null;
    type: "Single" | "Album" | null;
    release_date: string | null;
    submitted_at: string | null;
    live_at: null;
    upc: string | null;
    album_uid: string | null;
    label: string | null;
    genre: string | null;
    language: string | null;
    tracks: ExtractedTrack[];
    platforms: PlatformId[];
  };
  confidence: Record<string, string>;
  verification: { title_match: boolean | null; upc_match: boolean | null; isrc_matches: (boolean | null)[] };
  warnings: string[];
}

function boolOrNull(v: unknown): boolean | null {
  return typeof v === "boolean" ? v : null;
}

/**
 * Run the heavy vision extraction pass over 1..5 image URLs.
 * Throws on gateway failure with a `status` property attached when available.
 */
export async function extractReleaseFromImages(apiKey: string, imageUrls: string[]): Promise<ExtractResult> {
  const urls = imageUrls.filter((u) => typeof u === "string" && u.length > 0).slice(0, 8);
  if (urls.length === 0) {
    const err: any = new Error("No image URLs provided");
    err.status = 400;
    throw err;
  }

  // Gemini needs base64 data URLs — remote links fail with 400 INVALID_ARGUMENT.
  const { parts: imageParts, failures } = await inlineImageParts(urls);
  if (imageParts.length === 0) {
    const err: any = new Error(
      `Screenshot padha nahi ja saka: ${failures.map((f) => f.error).join("; ") || "unknown error"}`,
    );
    err.status = 400;
    throw err;
  }

  const content: any[] = [
    {
      type: "text",
      text: "Classify each screenshot (public/vault/other), then extract every field per the strict rules. Read all ISRC badges, the Vault duration and the delivered-stores icon row carefully. Return strict JSON only.",
    },
    ...imageParts,
  ];

  // Accuracy-first model, but fall back when its quota/availability fails.
  const models = [EXTRACT_MODEL, ...EXTRACT_FALLBACK_MODELS];
  let lastErr: any = null;

  for (const model of models) {
    const res = await fetch(GATEWAY, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: EXTRACT_SYSTEM_PROMPT },
          { role: "user", content },
        ],
        response_format: { type: "json_object" },
        temperature: 0.05,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      const err: any = new Error(
        res.status === 429 ? "Rate limit / quota — thodi der baad try karo." :
        res.status === 402 ? "AI credits exhausted." :
        `AI error: ${text.slice(0, 200)}`,
      );
      err.status = res.status;
      lastErr = err;
      // Retryable on another model: quota, availability, transient upstream.
      if (res.status === 429 || res.status === 404 || res.status >= 500) continue;
      throw err;
    }

    const json = await res.json();
    let parsed: any = {};
    try { parsed = JSON.parse(json?.choices?.[0]?.message?.content || "{}"); } catch { parsed = {}; }
    const out = sanitizeExtract(parsed);
    if (model !== EXTRACT_MODEL) out.warnings.push(`Fallback model used: ${model}`);
    if (failures.length) {
      for (const f of failures) out.warnings.push(`Ek image skip hui: ${f.error}`);
    }
    return out;
  }

  throw lastErr ?? new Error("Extraction failed");
}


/** Server-side normalization — never trust the model's shapes. */
export function sanitizeExtract(parsed: any): ExtractResult {
  const d = parsed?.draft || {};

  const rawTracks = Array.isArray(d.tracks) ? d.tracks.slice(0, 25) : [];
  const tracks: ExtractedTrack[] = rawTracks
    .map((t: any) => ({
      title: String(t?.title ?? "").trim(),
      isrc: str(t?.isrc),
      duration_seconds: toSeconds(t?.duration_seconds ?? t?.duration_text ?? t?.duration),
    }))
    .filter((t: ExtractedTrack) => t.title.length > 0 || t.isrc);

  const type = d.type === "Album" ? "Album"
    : d.type === "Single" ? "Single"
    : tracks.length > 1 ? "Album"
    : tracks.length === 1 ? "Single" : null;

  const pages = Array.isArray(parsed?.pages_detected)
    ? parsed.pages_detected.filter((p: any) => p === "public" || p === "vault" || p === "other")
    : [];

  return {
    pages_detected: pages,
    draft: {
      title: str(d.title),
      artist_name: str(d.artist_name),
      featured_artists: str(d.featured_artists),
      type,
      release_date: normalizeDate(str(d.release_date)),
      submitted_at: normalizeDateTime(str(d.submitted_at)),
      live_at: null, // hard rule: never extracted, never inferred
      upc: str(d.upc),
      album_uid: str(d.album_uid),
      label: str(d.label),
      genre: str(d.genre),
      language: str(d.language),
      tracks,
      platforms: normalizePlatforms(d.platforms),
    },
    confidence: parsed?.confidence && typeof parsed.confidence === "object" ? parsed.confidence : {},
    verification: {
      title_match: boolOrNull(parsed?.verification?.title_match),
      upc_match: boolOrNull(parsed?.verification?.upc_match),
      isrc_matches: Array.isArray(parsed?.verification?.isrc_matches)
        ? parsed.verification.isrc_matches.map(boolOrNull)
        : [],
    },
    warnings: Array.isArray(parsed?.warnings) ? parsed.warnings.slice(0, 12).map((w: any) => String(w)) : [],
  };
}
