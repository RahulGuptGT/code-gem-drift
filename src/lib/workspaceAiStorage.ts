import type { Thread } from "@/lib/supportChatStorage";

export type WorkspaceMode = "auto" | "ask" | "edit";

export const MODEL_OPTIONS = [
  { id: "gemini-3.6-flash", label: "Gemini 3.6 Flash (default)" },
  { id: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash Lite (fast)" },
  { id: "gemini-3.1-pro-preview", label: "Gemini 3.1 Pro (accurate)" },
  { id: "qwen3.8-27b", label: "Qwen3.8 27B (Experiential — free)" },
  { id: "deepseek-v4-flash", label: "DeepSeek V4 Flash (Experiential — free)" },
  { id: "gpt-5.6-luna", label: "GPT-5.6 Luna (Experiential — free)" },
  { id: "gpt-6-astra", label: "GPT-6 Astra (Experiential — free)" },
] as const;

export type WorkspaceModel = (typeof MODEL_OPTIONS)[number]["id"];

const KEY = "workspace-ai.threads.v1";

export function loadWorkspaceThreads(): Thread[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error("loadWorkspaceThreads error", e);
  }
  return [];
}

export function saveWorkspaceThreads(threads: Thread[]) {
  try {
    const slim = threads.map((t) => ({
      ...t,
      messages: t.messages.map(({ attachment, ...m }) => m),
    }));
    localStorage.setItem(KEY, JSON.stringify(slim));
  } catch (e) {
    console.error("saveWorkspaceThreads error", e);
  }
}
