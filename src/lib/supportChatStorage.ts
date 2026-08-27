export type Persona = "hinglish" | "english" | "hindi" | "bhojpuri";

export interface ChatMsg {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
  attachment?: string; // data URL preview (not persisted long-term to keep storage small)
  createdAt?: number;
}

export interface Thread {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMsg[];
  persona: Persona;
  /** True once the user manually picks a persona — disables auto-detect for this thread. */
  personaLocked?: boolean;
}

const KEY = "ramogu.threads.v2";
const LEGACY_KEY = "ramogu_chat_history";

export function loadThreads(): Thread[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
    // migrate legacy single-thread history once
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const msgs = JSON.parse(legacy);
      if (Array.isArray(msgs) && msgs.length > 0) {
        const t: Thread = {
          id: crypto.randomUUID(),
          title: deriveTitle(msgs),
          createdAt: Date.now(),
          updatedAt: Date.now(),
          messages: msgs,
          persona: "hinglish",
        };
        localStorage.setItem(KEY, JSON.stringify([t]));
        return [t];
      }
    }
  } catch (e) {
    console.error("loadThreads error", e);
  }
  return [];
}

export function saveThreads(threads: Thread[]) {
  try {
    // strip attachments before persisting to keep size bounded
    const slim = threads.map((t) => ({
      ...t,
      messages: t.messages.map(({ attachment, ...m }) => m),
    }));
    localStorage.setItem(KEY, JSON.stringify(slim));
  } catch (e) {
    console.error("saveThreads error", e);
  }
}

export function deriveTitle(messages: ChatMsg[]): string {
  const firstUser = messages.find((m) => m.role === "user");
  if (!firstUser) return "New chat";
  return firstUser.content.replace(/\s+/g, " ").trim().slice(0, 40) || "New chat";
}

export function newThread(persona: Persona = "hinglish"): Thread {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    title: "New chat",
    createdAt: now,
    updatedAt: now,
    messages: [],
    persona,
  };
}
