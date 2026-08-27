// Multi-provider LLM fallback chain.
//
// Har AI call pehle apne GEMINI_API_KEY par jaati hai, aur quota/429/5xx par
// automatically agle model / provider (Lovable Cloud AI Gateway) par shift ho
// jaati hai. Dono surfaces OpenAI-compatible hain, isliye request/response body
// same rehta hai — caller ko sirf ek Response milta hai (streaming ya JSON).

import { GEMINI_CHAT_URL, GEMINI_CHAT_MODEL, GEMINI_LITE_MODEL } from "./geminiClient";

const LOVABLE_CHAT_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

export interface ChainTarget {
  label: string;
  url: string;
  key: string;
  model: string;
}

/**
 * Ordered chain: apna Gemini key pehle, phir Lovable Cloud credits.
 * `tier: 'lite'` halke kaam (titles, formulas) ke liye sasta model pehle rakhta hai.
 */
export function buildChatChain(tier: "chat" | "lite" = "chat"): ChainTarget[] {
  const gemini = process.env["GEMINI_API_KEY"];
  const lovable = process.env["LOVABLE_API_KEY"];
  const targets: ChainTarget[] = [];

  if (gemini) {
    const models = tier === "lite"
      ? [GEMINI_LITE_MODEL, GEMINI_CHAT_MODEL]
      : [GEMINI_CHAT_MODEL, GEMINI_LITE_MODEL];
    for (const model of models) {
      targets.push({ label: `gemini:${model}`, url: GEMINI_CHAT_URL, key: gemini, model });
    }
  }

  if (lovable) {
    const models = tier === "lite"
      ? ["google/gemini-2.5-flash-lite", "google/gemini-3-flash", "google/gemini-2.5-flash"]
      : ["google/gemini-3-flash", "google/gemini-2.5-flash", "google/gemini-2.5-flash-lite"];
    for (const model of models) {
      targets.push({ label: `lovable:${model}`, url: LOVABLE_CHAT_URL, key: lovable, model });
    }
  }

  return targets;
}

export interface ChainResult {
  ok: boolean;
  response?: Response;
  label?: string;
  status?: number;
  error?: string;
  attempts: string[];
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Chain par chal kar pehla successful chat-completions response return karta hai.
 * `body` me `model` set karne ki zaroorat nahi — chain khud bharta hai.
 */
export async function chatWithFallback(
  body: Record<string, unknown>,
  opts: { tier?: "chat" | "lite"; timeoutMs?: number } = {},
): Promise<ChainResult> {
  const chain = buildChatChain(opts.tier ?? "chat");
  const attempts: string[] = [];

  if (chain.length === 0) {
    return { ok: false, status: 500, error: "No AI provider configured (GEMINI_API_KEY / LOVABLE_API_KEY missing)", attempts };
  }

  let lastStatus = 502;
  let lastError = "unknown";

  for (let i = 0; i < chain.length; i++) {
    const t = chain[i];
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), opts.timeoutMs ?? 90_000);
    try {
      const res = await fetch(t.url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${t.key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...body, model: t.model }),
        signal: ctl.signal,
      });
      clearTimeout(timer);

      if (res.ok) {
        console.log(`[modelChain] ok via ${t.label}${attempts.length ? ` (after ${attempts.join(", ")})` : ""}`);
        return { ok: true, response: res, label: t.label, attempts };
      }

      const text = await res.text().catch(() => "");
      lastStatus = res.status;
      lastError = text.slice(0, 400) || `HTTP ${res.status}`;
      attempts.push(`${t.label}→${res.status}`);
      console.warn(`[modelChain] ${t.label} failed ${res.status}: ${lastError}`);

      // 400 = request hi galat hai (model-specific nahi) → chain rok do.
      if (res.status === 400 && !/model/i.test(lastError)) break;

      // 401/403 same provider ke baaki models par bhi fail honge → provider skip.
      if (res.status === 401 || res.status === 403) {
        const provider = t.label.split(":")[0];
        while (i + 1 < chain.length && chain[i + 1].label.startsWith(provider + ":")) i++;
        continue;
      }

      if (res.status === 429 || res.status >= 500) await sleep(400);
    } catch (e) {
      clearTimeout(timer);
      lastStatus = 504;
      lastError = (e as Error)?.message || String(e);
      attempts.push(`${t.label}→err`);
      console.warn(`[modelChain] ${t.label} error: ${lastError}`);
    }
  }

  return { ok: false, status: lastStatus, error: lastError, attempts };
}

/** UI ke liye readable message. */
export function chainErrorMessage(r: ChainResult): string {
  if (r.status === 429) return "Sabhi AI models abhi rate-limited hain. 1-2 minute baad try karo.";
  if (r.status === 402) return "AI credits khatam ho gaye hain (Gemini quota + Lovable Cloud dono). Please top-up karke try karo.";
  return `AI service error (${r.status ?? "?"}). Tried: ${r.attempts.join(", ") || "none"}`;
}
