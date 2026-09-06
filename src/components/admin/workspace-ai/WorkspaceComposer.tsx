import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Paperclip, X, Sparkles, MessageSquareQuestion, PencilLine } from "lucide-react";
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
import { MODEL_OPTIONS, type WorkspaceMode, type WorkspaceModel } from "@/lib/workspaceAiStorage";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const MODE_META: Record<WorkspaceMode, { label: string; desc: string; icon: any }> = {
  auto: { label: "Default", desc: "AI khud decide karega — answer ya action plan", icon: Sparkles },
  ask: { label: "Ask", desc: "Sirf jawab dega, kuch change nahi", icon: MessageSquareQuestion },
  edit: { label: "Edit (Agent)", desc: "Badlav ka plan banayega (write tools Phase B mein)", icon: PencilLine },
};

interface Props {
  onSend: (text: string, attachment?: string) => void;
  disabled?: boolean;
  isStreaming?: boolean;
  onStop?: () => void;
  mode: WorkspaceMode;
  onModeChange: (m: WorkspaceMode) => void;
  model: WorkspaceModel;
  onModelChange: (m: WorkspaceModel) => void;
}

export function WorkspaceComposer({ onSend, disabled, isStreaming, onStop, mode, onModeChange, model, onModelChange }: Props) {
  const [text, setText] = useState("");
  const [attachment, setAttachment] = useState<string | undefined>();
  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const voice = useVoiceInput("hi-IN");

  useEffect(() => {
    if (voice.transcript) setText(voice.transcript);
  }, [voice.transcript]);

  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
  }, [text]);

  useEffect(() => {
    taRef.current?.focus();
  }, []);

  const submit = () => {
    const t = text.trim();
    if (!t && !attachment) return;
    onSend(t, attachment);
    setText("");
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

  const ModeIcon = MODE_META[mode].icon;

  return (
    <div className="p-3 border-t bg-background/80 backdrop-blur-xl shrink-0 space-y-2">
      {attachment && (
        <div className="relative inline-block">
          <img src={attachment} alt="attachment" className="h-16 w-16 object-cover rounded-lg border border-border" />
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
          onChange={(e) => setText(e.target.value.slice(0, 4000))}
          onKeyDown={onKey}
          placeholder={voice.listening ? "Listening…" : "Site ke baare mein pucho ya manage karne bolo…"}
          maxLength={4000}
          disabled={disabled}
          rows={1}
          className="resize-none border-0 bg-transparent min-h-[44px] max-h-[160px] px-3 py-2.5 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none"
        />

        <div className="flex items-center justify-between px-2 pb-2 gap-2 flex-wrap">
          <div className="flex items-center gap-1 flex-wrap">
            {/* Mode picker */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground gap-1">
                  <ModeIcon className="h-3.5 w-3.5" />
                  {MODE_META[mode].label} ▾
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                {(Object.keys(MODE_META) as WorkspaceMode[]).map((m) => {
                  const M = MODE_META[m];
                  const Icon = M.icon;
                  return (
                    <DropdownMenuItem key={m} onClick={() => onModeChange(m)} className="flex items-start gap-2 py-2">
                      <Icon className="h-4 w-4 mt-0.5 shrink-0" />
                      <div>
                        <div className="text-sm font-medium">{M.label}</div>
                        <div className="text-[11px] text-muted-foreground">{M.desc}</div>
                      </div>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Model picker */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground">
                  {MODEL_OPTIONS.find((o) => o.id === model)?.label ?? model} ▾
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {MODEL_OPTIONS.map((o) => (
                  <DropdownMenuItem key={o.id} onClick={() => onModelChange(o.id)}>
                    {o.label}
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
            state={isStreaming ? "sending" : "idle"}
            onStop={onStop}
            onClick={submit}
            disabled={(!text.trim() && !attachment) || disabled}
          />
        </div>
      </div>
    </div>
  );
}
