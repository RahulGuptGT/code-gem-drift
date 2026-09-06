import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Database } from "lucide-react";
import { ThreadSidebar } from "@/components/support-chat/ThreadSidebar";
import { MessageBubble } from "@/components/support-chat/MessageBubble";
import { WorkspaceComposer } from "./WorkspaceComposer";
import { useWorkspaceAI } from "./useWorkspaceAI";

const SUGGESTIONS = [
  "Site ka overview do — kitne posts, users, payments hain?",
  "Kaun se POV posts locked hain aur kis tier ke liye?",
  "Last 7 din ka traffic summary batao",
  "Pending contact messages dikhao",
  "Abhi tak kitne logo ne Signature plan liya?",
];

export function WorkspaceAI() {
  const chat = useWorkspaceAI();
  const endRef = useRef<HTMLDivElement>(null);
  const messages = chat.active?.messages ?? [];

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chat.isLoading]);

  const lastIsUser = messages[messages.length - 1]?.role === "user";

  return (
    <div className="flex h-[calc(100vh-140px)] min-h-[500px] rounded-xl border border-border/60 overflow-hidden bg-background/40">
      {/* Sidebar — desktop only */}
      <div className="hidden md:flex">
        <ThreadSidebar
          threads={chat.threads}
          activeId={chat.activeId}
          onSelect={chat.setActiveId}
          onNew={chat.createNew}
          onDelete={chat.deleteThread}
          onRename={chat.renameThread}
        />
      </div>

      {/* Chat panel */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border/50 flex items-center gap-3 shrink-0">
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/30">
            <Bot className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm">Workspace AI</div>
            <div className="text-[11px] text-muted-foreground">
              Site ka admin agent — poochho ya manage karne bolo
            </div>
          </div>
          {chat.lastTools.length > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-muted-foreground bg-muted/50 rounded-full px-2.5 py-1">
              <Database className="h-3 w-3" />
              {chat.lastTools.length} DB query{chat.lastTools.length > 1 ? "s" : ""}
            </div>
          )}
        </div>

        {/* Mobile thread switcher */}
        <div className="md:hidden px-3 py-2 border-b border-border/40 shrink-0">
          <select
            className="w-full h-9 rounded-md border border-border bg-background px-2 text-sm"
            value={chat.activeId ?? ""}
            onChange={(e) => {
              if (e.target.value === "__new__") chat.createNew();
              else chat.setActiveId(e.target.value);
            }}
          >
            {chat.threads.length === 0 && <option value="">No chats</option>}
            {chat.threads.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
            <option value="__new__">+ New chat</option>
          </select>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4 max-w-4xl mx-auto w-full">
            {messages.length === 0 ? (
              <div className="py-8 space-y-5">
                <div className="text-center space-y-2">
                  <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-xl shadow-primary/30">
                    <Bot className="h-7 w-7 text-primary-foreground" />
                  </div>
                  <h3 className="font-bold text-base">Workspace AI ready hai</h3>
                  <p className="text-xs text-muted-foreground max-w-[340px] mx-auto">
                    Poori site ka live data access hai — posts, users, plans, payments, analytics sab.
                    Poochho kuch bhi.
                  </p>
                </div>
                <div className="grid sm:grid-cols-2 gap-2 max-w-xl mx-auto">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => chat.send(s)}
                      className="text-left text-xs rounded-lg border border-border/60 bg-card/40 hover:bg-muted/60 px-3 py-2.5 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m, i) => (
                <MessageBubble
                  key={i}
                  message={m}
                  isLast={i === messages.length - 1}
                  onRegenerate={chat.regenerate}
                  sessionId={null}
                />
              ))
            )}

            {chat.isLoading && lastIsUser && (
              <div className="flex justify-start">
                <div className="bg-card/70 backdrop-blur border border-border/40 rounded-2xl rounded-bl-md px-3.5 py-2.5 flex items-center gap-2">
                  <Bot className="h-4 w-4 text-primary animate-pulse" />
                  <div className="flex gap-1">
                    <span className="typing-dot w-1.5 h-1.5 bg-primary rounded-full" />
                    <span className="typing-dot w-1.5 h-1.5 bg-primary rounded-full" />
                    <span className="typing-dot w-1.5 h-1.5 bg-primary rounded-full" />
                  </div>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>
        </ScrollArea>

        <WorkspaceComposer
          onSend={chat.send}
          disabled={chat.isLoading}
          isStreaming={chat.isLoading}
          onStop={chat.stop}
          mode={chat.mode}
          onModeChange={chat.setMode}
          model={chat.model}
          onModelChange={chat.setModel}
        />
      </div>
    </div>
  );
}
