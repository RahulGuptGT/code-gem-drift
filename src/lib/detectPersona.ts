import type { Persona } from "./supportChatStorage";

// Bhojpuri-specific tokens (Roman + Devanagari). Kept tight to avoid false positives.
const BHOJPURI_TOKENS = [
  "बा", "बाड़", "बानी", "बाटे", "बाडू", "हईं", "हईऽ", "हो ना", "रउआ", "राउर", "तू", "तोहार",
  "हमनी", "रहल", "करत", "जात", "आवत", "देखीं", "सुनीं", "कइसन", "केकरा", "कहाँ बा",
  // Roman bhojpuri cues
  "ba ", " ba.", " ba?", "baa ", "rauaa", "raua", "tohar", "hamni", "kaisan", "kekra",
  "karat", "jaat", "aawat", "dekhin", "sunin", "ho na", "kaha ba",
];

const HINGLISH_TOKENS = [
  "hai", "hain", "kya", "kaise", "kaisa", "kaisi", "nahi", "nahin", "haan", "kar", "karo", "karna",
  "kyun", "kyu", "mera", "tera", "tum", "tumhara", "tumhe", "mujhe", "mujhko", "humko", "humein",
  "abhi", "thoda", "bahut", "accha", "acha", "theek", "thik", "matlab", "bhai", "yaar", "bhi",
  "kuch", "kuchh", "wala", "wali", "wale", "hoga", "hogi", "raha", "rahi", "rahe", "gaya", "gayi",
  "chahiye", "chahta", "chahti", "sakta", "sakti", "sakte", "lekin", "magar", "kyunki", "kyonki",
  "phir", "fir", "agar", "to", "se", "mein", "main", "ko", "ka", "ki", "ke", "par",
];

function hasDevanagari(s: string): boolean {
  return /[\u0900-\u097F]/.test(s);
}

function isMostlyAscii(s: string): boolean {
  const letters = s.replace(/[^A-Za-z\u0900-\u097F]/g, "");
  if (!letters.length) return true;
  const ascii = letters.replace(/[^A-Za-z]/g, "").length;
  return ascii / letters.length > 0.9;
}

function countTokens(text: string, tokens: string[]): number {
  const lower = " " + text.toLowerCase() + " ";
  let n = 0;
  for (const t of tokens) {
    const needle = t.toLowerCase();
    // word-ish boundary for short ascii tokens
    if (/^[a-z ]+$/.test(needle) && needle.trim().length <= 4) {
      const re = new RegExp(`(^|[^a-z])${needle.trim()}([^a-z]|$)`, "g");
      const m = lower.match(re);
      if (m) n += m.length;
    } else if (lower.includes(needle)) {
      n += 1;
    }
  }
  return n;
}

/**
 * Detect persona from a user message. Returns null when the signal is too weak
 * (e.g. one-word "ok", emoji-only) so the caller can keep the current persona.
 */
export function detectPersona(text: string): Persona | null {
  const raw = (text || "").trim();
  if (!raw) return null;

  // Strip URLs / code-ish noise that would skew the heuristic.
  const cleaned = raw
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/[0-9]+/g, " ");

  const wordCount = cleaned.split(/\s+/).filter(Boolean).length;
  if (wordCount < 2) return null;

  const devanagari = hasDevanagari(cleaned);
  const bhojCount = countTokens(cleaned, BHOJPURI_TOKENS);
  const hingCount = countTokens(cleaned, HINGLISH_TOKENS);

  // Devanagari script → Hindi or Bhojpuri
  if (devanagari) {
    if (bhojCount >= 1) return "bhojpuri";
    return "hindi";
  }

  // Roman script
  if (bhojCount >= 2 && bhojCount >= hingCount) return "bhojpuri";
  if (hingCount >= 1) return "hinglish";
  if (isMostlyAscii(cleaned) && wordCount >= 2) return "english";
  return null;
}
