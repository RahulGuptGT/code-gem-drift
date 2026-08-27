import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getPageContext } from "@/data/websiteKnowledge";
import { getEnhancedPageContext } from "@/utils/pageContentExtractor";
import { detectPersona } from "@/lib/detectPersona";

import {
  loadThreads,
  saveThreads,
  newThread,
  deriveTitle,
  type Thread,
  type ChatMsg,
  type Persona,
} from "@/lib/supportChatStorage";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ramogu-chat`;

const READ_PAGE_KEYWORDS = [
  "page", "yahan", "is page", "isme", "dekho", "padho", "read",
  "samjhao", "explain", "kya hai", "what is", "batao", "content",
];

export function useSupportChat() {
  const [threads, setThreads] = useState<Thread[]>(() => loadThreads());
  const [activeId, setActiveId] = useState<string | null>(() => {
    const t = loadThreads();
    return t[0]?.id ?? null;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isReadingPage, setIsReadingPage] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const location = useLocation();

  const active = threads.find((t) => t.id === activeId) || null;
  const pageContext = getPageContext(location.pathname);

  // Persist on change
  useEffect(() => {
    saveThreads(threads);
  }, [threads]);

  const ensureThread = useCallback((): Thread => {
    if (active) return active;
    const t = newThread();
    setThreads((prev) => [t, ...prev]);
    setActiveId(t.id);
    return t;
  }, [active]);

  const updateThread = useCallback((id: string, mut: (t: Thread) => Thread) => {
    setThreads((prev) => prev.map((t) => (t.id === id ? mut(t) : t)));
  }, []);

  const createNew = useCallback(() => {
    const t = newThread(active?.persona ?? "hinglish");
    setThreads((prev) => [t, ...prev]);
    setActiveId(t.id);
  }, [active]);

  const deleteThread = useCallback((id: string) => {
    setThreads((prev) => {
      const next = prev.filter((t) => t.id !== id);
      if (activeId === id) setActiveId(next[0]?.id ?? null);
      return next;
    });
  }, [activeId]);

  const renameThread = useCallback((id: string, title: string) => {
    updateThread(id, (t) => ({ ...t, title, updatedAt: Date.now() }));
  }, [updateThread]);

  const setPersona = useCallback((p: Persona) => {
    const t = ensureThread();
    updateThread(t.id, (x) => ({ ...x, persona: p, personaLocked: true, updatedAt: Date.now() }));
  }, [ensureThread, updateThread]);


  const trackSession = useCallback(async () => {
    if (sessionId) return sessionId;
    const id = crypto.randomUUID();
    try {
      await supabase.from("chat_sessions").insert({
        session_id: id,
        page_url: location.pathname,
        user_agent: navigator.userAgent,
        opened_at: new Date().toISOString(),
      });
    } catch (e) {
      console.error(e);
    }
    setSessionId(id);
    return id;
  }, [sessionId, location.pathname]);

  const stream = useCallback(
    async (thread: Thread, readFullPage: boolean) => {
      const ctl = new AbortController();
      abortRef.current = ctl;

      const contextToSend = readFullPage
        ? (() => {
            try {
              const enhanced = getEnhancedPageContext();
              return {
                ...pageContext,
                pageContent: enhanced.content,
                headings: enhanced.metadata.headings,
                tables: enhanced.metadata.tables,
              };
            } catch {
              return pageContext;
            }
          })()
        : pageContext;

      const sid = await trackSession();

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        signal: ctl.signal,
        body: JSON.stringify({
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
          pageContext: contextToSend,
          readFullPage,
          sessionId: sid,
          persona: thread.persona,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || "Failed to get response");
      }
      if (!resp.body) throw new Error("No body");

      const sourcesHeader = resp.headers.get("X-Data-Sources") || "ai";
      const sources = sourcesHeader.split(",").filter(Boolean);

      // append empty assistant message
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
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const parsed = JSON.parse(json);
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
    [pageContext, trackSession, updateThread]
  );

  const send = useCallback(
    async (text: string, attachment?: string) => {
      if (!text.trim() && !attachment) return;
      const t = ensureThread();
      const userMsg: ChatMsg = {
        role: "user",
        content: text || "(sent an image)",
        attachment,
        createdAt: Date.now(),
      };

      // Auto-detect persona from this message unless the user has locked it manually.
      let nextPersona = t.persona;
      if (!t.personaLocked && text.trim()) {
        const detected = detectPersona(text);
        if (detected && detected !== t.persona) {
          nextPersona = detected;
        }
      }

      const updated: Thread = {
        ...t,
        persona: nextPersona,
        messages: [...t.messages, userMsg],
        title: t.messages.length === 0 ? deriveTitle([userMsg]) : t.title,
        updatedAt: Date.now(),
      };
      setThreads((prev) => prev.map((x) => (x.id === t.id ? updated : x)));


      const lower = text.toLowerCase();
      const readPage = READ_PAGE_KEYWORDS.some((k) => lower.includes(k));
      setIsLoading(true);
      if (readPage) setIsReadingPage(true);

      try {
        await stream(updated, readPage);
      } catch (e: any) {
        if (e.name !== "AbortError") {
          console.error("chat error", e);
          updateThread(t.id, (x) => ({
            ...x,
            messages: [
              ...x.messages,
              {
                role: "assistant",
                content: "Sorry, kuch technical issue ho gaya. Thodi der baad try karo. 🙏",
                createdAt: Date.now(),
              },
            ],
          }));
        }
      } finally {
        setIsLoading(false);
        setIsReadingPage(false);
        abortRef.current = null;
      }
    },
    [ensureThread, stream, updateThread]
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setIsLoading(false);
    setIsReadingPage(false);
  }, []);

  const regenerate = useCallback(async () => {
    if (!active) return;
    // drop last assistant message and re-stream
    const msgs = [...active.messages];
    while (msgs.length && msgs[msgs.length - 1].role === "assistant") msgs.pop();
    if (msgs.length === 0) return;
    const updated: Thread = { ...active, messages: msgs, updatedAt: Date.now() };
    setThreads((prev) => prev.map((x) => (x.id === active.id ? updated : x)));
    setIsLoading(true);
    try {
      await stream(updated, false);
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
    setPersona,
    send,
    stop,
    regenerate,
    isLoading,
    isReadingPage,
    sessionId,
    pageContext,
  };
}
