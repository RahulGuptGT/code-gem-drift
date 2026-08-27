import { useState } from "react";
import { Copy, RotateCcw, ThumbsUp, ThumbsDown, Check, Database, Globe, FileText, Eye, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ChatMsg } from "@/lib/supportChatStorage";
import { useOpenLightbox } from "@/components/ui/AttachmentLightbox";

type DataSource = "database" | "web" | "indexed" | "page" | "ai";

const SOURCE_CONFIG: Record<DataSource, { icon: React.ReactNode; label: string }> = {
  database: { icon: <Database className="h-3 w-3" />, label: "Live Data" },
  web: { icon: <Globe className="h-3 w-3" />, label: "Web" },
  indexed: { icon: <FileText className="h-3 w-3" />, label: "Site" },
  page: { icon: <Eye className="h-3 w-3" />, label: "Page" },
  ai: { icon: <Sparkles className="h-3 w-3" />, label: "AI" },
};

interface Props {
  message: ChatMsg;
  isLast: boolean;
  onRegenerate?: () => void;
  sessionId?: string | null;
}

export function MessageBubble({ message, isLast, onRegenerate, sessionId }: Props) {
  const openLightbox = useOpenLightbox();
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);
  const isUser = message.role === "user";

  const copy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const sendFeedback = async (rating: "up" | "down") => {
    setFeedback(rating);
    try {
      await supabase.from("chat_feedback").insert({
        rating: rating === "up" ? 1 : -1,
        feedback_text: message.content.slice(0, 500),
      });
      toast.success(rating === "up" ? "Thanks for the feedback!" : "Thanks, will improve!");
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className={cn("group flex flex-col gap-1", isUser ? "items-end" : "items-start")}>
      {message.attachment && (
        <button
          type="button"
          onClick={() => openLightbox([{ url: message.attachment as string, name: 'attachment', kind: 'image' }])}
          className="block mb-1"
        >
          <img
            src={message.attachment}
            alt="attachment"
            className="max-w-[220px] max-h-[180px] rounded-lg border border-border/50 hover:opacity-90 transition-opacity"
          />
        </button>
      )}
      <div
        className={cn(
          "max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm",
          isUser
            ? "bg-gradient-to-br from-primary to-primary/85 text-primary-foreground rounded-br-md"
            : "bg-card/70 backdrop-blur border border-border/40 text-foreground rounded-bl-md"
        )}
      >
        {isUser ? (
          <span className="whitespace-pre-wrap break-words">{message.content}</span>
        ) : (
          <div className="prose prose-sm max-w-none dark:prose-invert
            prose-headings:mt-3 prose-headings:mb-2 prose-headings:font-semibold
            prose-h1:text-base prose-h2:text-base prose-h3:text-sm
            prose-p:my-1.5 prose-p:leading-relaxed
            prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5
            prose-strong:text-foreground
            prose-a:text-primary prose-a:underline
            prose-code:bg-background/60 prose-code:px-1 prose-code:rounded prose-code:text-xs
            prose-table:my-2 prose-table:text-xs prose-table:block prose-table:overflow-x-auto
            prose-th:border prose-th:px-2 prose-th:py-1 prose-th:bg-background/50
            prose-td:border prose-td:px-2 prose-td:py-1
            prose-hr:my-3">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content || "…"}</ReactMarkdown>
          </div>
        )}
      </div>

      {!isUser && message.sources && message.sources.length > 0 && (
        <div className="flex flex-wrap gap-1 px-1">
          {message.sources.map((s) => {
            const cfg = SOURCE_CONFIG[s as DataSource];
            if (!cfg) return null;
            return (
              <span
                key={s}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] bg-muted/60 text-muted-foreground border border-border/40"
              >
                {cfg.icon}
                {cfg.label}
              </span>
            );
          })}
        </div>
      )}

      <div
        className={cn(
          "flex items-center gap-0.5 px-1 opacity-0 group-hover:opacity-100 transition-opacity",
          isUser ? "justify-end" : "justify-start"
        )}
      >
        <button
          onClick={copy}
          className="h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
          title="Copy"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
        {!isUser && isLast && onRegenerate && (
          <button
            onClick={onRegenerate}
            className="h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
            title="Regenerate"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        )}
        {!isUser && (
          <>
            <button
              onClick={() => sendFeedback("up")}
              className={cn(
                "h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-muted",
                feedback === "up" ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
              title="Helpful"
            >
              <ThumbsUp className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => sendFeedback("down")}
              className={cn(
                "h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-muted",
                feedback === "down" ? "text-destructive" : "text-muted-foreground hover:text-foreground"
              )}
              title="Not helpful"
            >
              <ThumbsDown className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
