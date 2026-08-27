import { useEffect, useRef, useState } from "react";
import { useDraft } from "@/hooks/useDraft";
import { Send, Mic, MicOff, Paperclip, X, Square } from "lucide-react";
import { ChatSendButton } from "@/components/ui/ChatSendButton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useVoiceInput } from "@/lib/useVoiceInput";
import type { Persona } from "@/lib/supportChatStorage";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const PERSONA_LABEL: Record<Persona, string> = {
  hinglish: "Hinglish",
  english: "English",
  hindi: "हिन्दी",
  bhojpuri: "Bhojpuri",
};

const PERSONA_LANG: Record<Persona, string> = {
  hinglish: "hi-IN",
  english: "en-IN",
  hindi: "hi-IN",
  bhojpuri: "hi-IN",
};

interface Props {
  onSend: (text: string, attachment?: string) => void;
  disabled?: boolean;
  isStreaming?: boolean;
  onStop?: () => void;
  persona: Persona;
  onPersonaChange: (p: Persona) => void;
}

export function Composer({ onSend, disabled, isStreaming, onStop, persona, onPersonaChange }: Props) {
  const [text, setText, clearDraft] = useDraft("support-chat");
  const [attachment, setAttachment] = useState<string | undefined>();
  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const voice = useVoiceInput(PERSONA_LANG[persona]);

  useEffect(() => {
    if (voice.transcript) setText(voice.transcript);
  }, [voice.transcript]);

  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 140) + "px";
  }, [text]);

  const submit = () => {
    const t = text.trim();
    if (!t && !attachment) return;
    onSend(t, attachment);
    clearDraft();
    setAttachment(undefined);
    voice.reset();
    setTimeout(() => taRef.current?.focus(), 50);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast.error("Sirf images attach kar sakte ho");
      return;
    }
    if (f.size > 2 * 1024 * 1024) {
      toast.error("Image 2MB se chhoti honi chahiye");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setAttachment(reader.result as string);
    reader.readAsDataURL(f);
  };

  return (
    <div className="p-3 border-t bg-background/80 backdrop-blur-xl shrink-0 space-y-2">
      {attachment && (
        <div className="relative inline-block">
          <img
            src={attachment}
            alt="attachment"
            className="h-16 w-16 object-cover rounded-lg border border-border"
          />
          <button
            onClick={() => setAttachment(undefined)}
            className="absolute -top-1.5 -right-1.5 bg-foreground text-background rounded-full h-5 w-5 inline-flex items-center justify-center shadow"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      <div className="relative rounded-2xl border border-border/60 bg-card/40 backdrop-blur focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/15 transition">
        <Textarea
          ref={taRef}
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, 2000))}
          onKeyDown={onKey}
          placeholder={voice.listening ? "Listening…" : "Type your message..."}
          maxLength={2000}
          disabled={disabled}
          rows={1}
          className="resize-none border-0 bg-transparent min-h-[44px] max-h-[140px] px-3 py-2.5 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none"
        />

        <div className="flex items-center justify-between px-2 pb-2 gap-2">
          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground">
                  {PERSONA_LABEL[persona]} ▾
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-36">
                {(Object.keys(PERSONA_LABEL) as Persona[]).map((p) => (
                  <DropdownMenuItem key={p} onClick={() => onPersonaChange(p)}>
                    {PERSONA_LABEL[p]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
              title="Attach image"
            >
              <Paperclip className="h-4 w-4" />
            </button>

            {voice.supported && (
              <button
                type="button"
                onClick={() => (voice.listening ? voice.stop() : voice.start())}
                className={cn(
                  "h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-muted",
                  voice.listening ? "text-destructive animate-pulse" : "text-muted-foreground hover:text-foreground"
                )}
                title={voice.listening ? "Stop" : "Voice input"}
              >
                {voice.listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
            )}
          </div>

          <ChatSendButton
            state={isStreaming ? 'sending' : 'idle'}
            onStop={onStop}
            onClick={submit}
            disabled={(!text.trim() && !attachment) || disabled}
          />
        </div>
      </div>
    </div>
  );
}
