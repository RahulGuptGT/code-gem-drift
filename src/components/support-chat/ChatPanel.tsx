import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Eye, Menu, MapPin, Sparkles } from "lucide-react";
import { MessageBubble } from "./MessageBubble";
import { Composer } from "./Composer";
import { SuggestedPrompts } from "./SuggestedPrompts";
import type { Thread, Persona } from "@/lib/supportChatStorage";

interface Props {
  thread: Thread | null;
  pageTitle: string;
  isLoading: boolean;
  isReadingPage: boolean;
  sessionId: string | null;
  onSend: (text: string, attachment?: string) => void;
  onStop: () => void;
  onRegenerate: () => void;
  onPersonaChange: (p: Persona) => void;
  onClose: () => void;
  onOpenSidebar: () => void;
}

export function ChatPanel({
  thread,
  pageTitle,
  isLoading,
  isReadingPage,
  sessionId,
  onSend,
  onStop,
  onRegenerate,
  onPersonaChange,
  onClose,
  onOpenSidebar,
}: Props) {
  const endRef = useRef<HTMLDivElement>(null);
  const messages = thread?.messages ?? [];
  const persona = thread?.persona ?? "hinglish";

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const lastIsUser = messages[messages.length - 1]?.role === "user";

  return (
    <div className="flex flex-col h-full flex-1 min-w-0 bg-gradient-to-b from-background via-background to-primary/5">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/50 backdrop-blur-xl bg-background/60 shrink-0 flex items-center gap-3">
        <Button
          onClick={onOpenSidebar}
          size="icon"
          variant="ghost"
          className="h-9 w-9 md:hidden"
          aria-label="Open chats"
        >
          <Menu className="h-4 w-4" />
        </Button>
        <div className="relative shrink-0">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary via-primary/80 to-accent flex items-center justify-center text-lg shadow-lg shadow-primary/30">
            🤖
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-background animate-pulse" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm flex items-center gap-1.5">
            Ramogu
            <Sparkles className="h-3 w-3 text-primary" />
          </div>
          <div className="text-[11px] text-muted-foreground flex items-center gap-1">
            <MapPin className="h-2.5 w-2.5" />
            <span className="truncate">{pageTitle}</span>
          </div>
        </div>
        <Button onClick={onClose} size="icon" variant="ghost" className="h-9 w-9 shrink-0" aria-label="Close">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="py-6 space-y-5">
              <div className="text-center space-y-2">
                <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-br from-primary via-primary/80 to-accent flex items-center justify-center text-3xl shadow-xl shadow-primary/30">
                  🤖
                </div>
                <h3 className="font-bold text-base">Hi! Main Ramogu hoon 👋</h3>
                <p className="text-xs text-muted-foreground max-w-[280px] mx-auto">
                  Rahul ki website ka AI assistant. Kuch bhi pucho — pages, POVs, referrals, ya is page ke baare mein.
                </p>
              </div>
              <SuggestedPrompts onPick={(t) => onSend(t)} />
            </div>
          ) : (
            messages.map((m, i) => (
              <MessageBubble
                key={i}
                message={m}
                isLast={i === messages.length - 1}
                onRegenerate={onRegenerate}
                sessionId={sessionId}
              />
            ))
          )}

          {isLoading && lastIsUser && (
            <div className="flex justify-start">
              <div className="bg-card/70 backdrop-blur border border-border/40 rounded-2xl rounded-bl-md px-3.5 py-2.5 flex items-center gap-2">
                {isReadingPage ? (
                  <>
                    <Eye className="h-4 w-4 text-primary animate-pulse" />
                    <span className="text-xs text-muted-foreground">Page padh raha hoon…</span>
                  </>
                ) : (
                  <>
                    <span className="text-base animate-pulse">🤖</span>
                    <div className="flex gap-1">
                      <span className="typing-dot w-1.5 h-1.5 bg-primary rounded-full" />
                      <span className="typing-dot w-1.5 h-1.5 bg-primary rounded-full" />
                      <span className="typing-dot w-1.5 h-1.5 bg-primary rounded-full" />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
      </ScrollArea>

      <Composer
        onSend={onSend}
        disabled={isLoading}
        isStreaming={isLoading}
        onStop={onStop}
        persona={persona}
        onPersonaChange={onPersonaChange}
      />

      <div className="px-4 py-1.5 border-t border-border/40 bg-background/60 backdrop-blur shrink-0">
        <p className="text-[10px] text-muted-foreground text-center">
          Powered by{" "}
          <a
            href="https://ramogu.rahulgupta.site"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline font-medium"
          >
            Ramogu AI
          </a>
        </p>
      </div>
    </div>
  );
}
