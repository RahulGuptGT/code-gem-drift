import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  loadWorkspaceThreads,
  saveWorkspaceThreads,
  type WorkspaceMode,
  type WorkspaceModel,
} from "@/lib/workspaceAiStorage";
import {
  newThread,
  deriveTitle,
  type Thread,
  type ChatMsg,
} from "@/lib/supportChatStorage";
import { toast } from "sonner";

const CHAT_URL = "/api/public/workspace-ai";

export type ApprovalRef = { tool: string; args: Record<string, unknown> };

export type PendingWrite = ApprovalRef & {
  key: string;
  action: string;
  destructive?: boolean;
  target: string;
  summary: string;
  values?: Record<string, unknown>;
  changes?: Record<string, { from?: unknown; to?: unknown }>;
  row?: Record<string, unknown>;
};

export function useWorkspaceAI() {
  const [threads, setThreads] = useState<Thread[]>(() => loadWorkspaceThreads());
  const [activeId, setActiveId] = useState<string | null>(() => loadWorkspaceThreads()[0]?.id ?? null);
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<WorkspaceMode>("auto");
  const [model, setModel] = useState<WorkspaceModel>("gemini-3.6-flash");
  const [lastTools, setLastTools] = useState<string[]>([]);
  const [pending, setPending] = useState<PendingWrite[] | null>(null);
  const pendingThreadRef = useRef<Thread | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const active = threads.find((t) => t.id === activeId) || null;

  useEffect(() => {
    saveWorkspaceThreads(threads);
  }, [threads]);

  const ensureThread = useCallback((): Thread => {
    if (active) return active;
    const t = newThread("hinglish");
    setThreads((prev) => [t, ...prev]);
    setActiveId(t.id);
    return t;
  }, [active]);

  const updateThread = useCallback((id: string, mut: (t: Thread) => Thread) => {
    setThreads((prev) => prev.map((t) => (t.id === id ? mut(t) : t)));
  }, []);

  const createNew = useCallback(() => {
    const t = newThread("hinglish");
    setThreads((prev) => [t, ...prev]);
    setActiveId(t.id);
  }, []);

  const deleteThread = useCallback(
    (id: string) => {
      setThreads((prev) => {
        const next = prev.filter((t) => t.id !== id);
        if (activeId === id) setActiveId(next[0]?.id ?? null);
        return next;
      });
    },
    [activeId]
  );

  const renameThread = useCallback(
    (id: string, title: string) => {
      updateThread(id, (t) => ({ ...t, title, updatedAt: Date.now() }));
    },
    [updateThread]
  );

  const stream = useCallback(
    async (thread: Thread, approvals?: ApprovalRef[]) => {
      const ctl = new AbortController();
      abortRef.current = ctl;

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Admin session nahi mila — dobara login karo.");

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        signal: ctl.signal,
        body: JSON.stringify({
          threadId: thread.id,
          mode,
          model,
          approvals: approvals ?? [],
          messages: thread.messages.map((m) => {
            if (m.role === "user" && m.attachment) {
              return {
                role: m.role,
                content: [
                  { type: "text", text: m.content || "" },
                  { type: "image_url", image_url: { url: m.attachment } },
                ],
              };
            }
            return { role: m.role, content: m.content };
          }),
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({} as any));
        throw new Error((err as any).error || `Request failed (${resp.status})`);
      }
      // Approval gate — server proposed changes but did NOT apply them yet.
      if ((resp.headers.get("content-type") || "").includes("application/json")) {
        const data = await resp.json();
        if (data?.type === "approval_required") {
          pendingThreadRef.current = thread;
          setPending(data.pending as PendingWrite[]);
          return;
        }
        throw new Error(data?.error || "Unexpected response");
      }
      if (!resp.body) throw new Error("No response body");

      const tools = (resp.headers.get("X-Tools-Used") || "").split(",").filter(Boolean);
      setLastTools(tools);
      const writes = Number(resp.headers.get("X-Writes-Applied") || "0");
      if (writes > 0) toast.success(`${writes} change${writes > 1 ? "s" : ""} apply ho gaya`);
      const sources = tools.length > 0 ? (["database"] as string[]) : (["ai"] as string[]);


      updateThread(thread.id, (t) => ({
        ...t,
        messages: [...t.messages, { role: "assistant", content: "", sources, createdAt: Date.now() }],
        updatedAt: Date.now(),
      }));

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let acc = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let i;
        while ((i = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, i);
          buf = buf.slice(i + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const c = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (c) {
              acc += c;
              updateThread(thread.id, (t) => {
                const msgs = [...t.messages];
                const last = msgs[msgs.length - 1];
                if (last?.role === "assistant") {
                  msgs[msgs.length - 1] = { ...last, content: acc, sources };
                }
                return { ...t, messages: msgs };
              });
            }
          } catch {
            buf = line + "\n" + buf;
            break;
          }
        }
      }
    },
    [mode, model, updateThread]
  );

  const send = useCallback(
    async (text: string, attachment?: string) => {
      if (!text.trim() && !attachment) return;
      const t = ensureThread();
      const userMsg: ChatMsg = {
        role: "user",
        content: text || "(image attached)",
        attachment,
        createdAt: Date.now(),
      };
      const updated: Thread = {
        ...t,
        messages: [...t.messages, userMsg],
        title: t.messages.length === 0 ? deriveTitle([userMsg]) : t.title,
        updatedAt: Date.now(),
      };
      setThreads((prev) => prev.map((x) => (x.id === t.id ? updated : x)));

      setIsLoading(true);
      try {
        await stream(updated);
      } catch (e: any) {
        if (e.name !== "AbortError") {
          console.error("workspace-ai error", e);
          toast.error(e?.message ?? "Kuch technical issue ho gaya");
          updateThread(t.id, (x) => ({
            ...x,
            messages: [
              ...x.messages,
              { role: "assistant", content: `⚠️ ${e?.message ?? "Kuch technical issue ho gaya. Dobara try karo."}`, createdAt: Date.now() },
            ],
          }));
        }
      } finally {
        setIsLoading(false);
        abortRef.current = null;
      }
    },
    [ensureThread, stream, updateThread]
  );

  const approvePending = useCallback(async () => {
    const items = pending;
    const thread = pendingThreadRef.current;
    if (!items || !thread) return;
    setPending(null);
    setIsLoading(true);
    try {
      await stream(thread, items.map((p) => ({ tool: p.tool, args: p.args })));
    } catch (e: any) {
      if (e.name !== "AbortError") toast.error(e?.message ?? "Change apply nahi ho paaya");
    } finally {
      setIsLoading(false);
      pendingThreadRef.current = null;
    }
  }, [pending, stream]);

  const rejectPending = useCallback(() => {
    const thread = pendingThreadRef.current;
    setPending(null);
    pendingThreadRef.current = null;
    if (thread) {
      updateThread(thread.id, (t) => ({
        ...t,
        messages: [
          ...t.messages,
          { role: "assistant", content: "Theek hai — koi change nahi kiya gaya. ❌", createdAt: Date.now() },
        ],
        updatedAt: Date.now(),
      }));
    }
    toast.message("Change cancel kar diya");
  }, [updateThread]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setIsLoading(false);
  }, []);

  const regenerate = useCallback(async () => {
    if (!active) return;
    const msgs = [...active.messages];
    while (msgs.length && msgs[msgs.length - 1].role === "assistant") msgs.pop();
    if (msgs.length === 0) return;
    const updated: Thread = { ...active, messages: msgs, updatedAt: Date.now() };
    setThreads((prev) => prev.map((x) => (x.id === active.id ? updated : x)));
    setIsLoading(true);
    try {
      await stream(updated);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [active, stream]);

  return {
    threads,
    active,
    activeId,
    setActiveId,
    createNew,
    deleteThread,
    renameThread,
    send,
    stop,
    regenerate,
    isLoading,
    mode,
    setMode,
    model,
    setModel,
    lastTools,
    pending,
    approvePending,
    rejectPending,
  };
}
