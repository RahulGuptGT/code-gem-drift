// Gemini image input helper.
//
// Google's OpenAI-compatible endpoint does NOT fetch remote image URLs — a
// request with `image_url: { url: "https://..." }` fails with
// `400 Request contains an invalid argument.` Images must be inlined as
// base64 data URLs (`data:<mime>;base64,...`).
//
// Every AI call in this app that sends an image must go through here.

/** Hard cap per image (bytes of raw file, before base64). */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const EXT_MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  heic: "image/heic",
  heif: "image/heif",
  bmp: "image/bmp",
};

function mimeFromUrl(url: string): string | null {
  const clean = url.split("?")[0].toLowerCase();
  const ext = clean.includes(".") ? clean.split(".").pop()! : "";
  return EXT_MIME[ext] || null;
}

/** Sniff the container from magic bytes — signed URLs often serve octet-stream. */
function mimeFromBytes(b: Uint8Array): string | null {
  if (b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length > 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "image/webp";
  if (b.length > 6 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return "image/gif";
  if (b.length > 12 && b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70) return "image/heic";
  return null;
}

function toBase64(bytes: Uint8Array): string {
  let bin = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}

export type InlineImageResult =
  | { ok: true; dataUrl: string; mime: string; bytes: number }
  | { ok: false; error: string };

/**
 * Fetch an image (signed storage URL or any public URL) and return it as a
 * base64 data URL that Gemini accepts. Never throws.
 */
export async function inlineImageAsDataUrl(url: string): Promise<InlineImageResult> {
  const raw = String(url || "").trim();
  if (!raw) return { ok: false, error: "empty image url" };
  // Already inlined by the caller — pass through.
  if (raw.startsWith("data:image/")) {
    return { ok: true, dataUrl: raw, mime: raw.slice(5, raw.indexOf(";")), bytes: raw.length };
  }
  try {
    const res = await fetch(raw);
    if (!res.ok) return { ok: false, error: `download failed (HTTP ${res.status})` };
    const buf = new Uint8Array(await res.arrayBuffer());
    if (buf.length === 0) return { ok: false, error: "image file is empty" };
    if (buf.length > MAX_IMAGE_BYTES) {
      return { ok: false, error: `image too large (${Math.round(buf.length / 1024 / 1024)} MB, max 5 MB)` };
    }
    const headerMime = (res.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    const mime = (headerMime.startsWith("image/") ? headerMime : null)
      ?? mimeFromBytes(buf)
      ?? mimeFromUrl(raw);
    if (!mime) return { ok: false, error: "unsupported or unreadable image format" };
    return { ok: true, dataUrl: `data:${mime};base64,${toBase64(buf)}`, mime, bytes: buf.length };
  } catch (e) {
    return { ok: false, error: `image read error: ${(e as Error).message}` };
  }
}

/** Batch helper: returns chat `image_url` parts plus per-image failures. */
export async function inlineImageParts(
  urls: string[],
): Promise<{ parts: any[]; failures: { url: string; error: string }[] }> {
  const parts: any[] = [];
  const failures: { url: string; error: string }[] = [];
  for (const u of urls) {
    const r = await inlineImageAsDataUrl(u);
    if (r.ok) parts.push({ type: "image_url", image_url: { url: r.dataUrl } });
    else failures.push({ url: u, error: r.error });
  }
  return { parts, failures };
}
