import { Sparkles, User, MessageSquare, Link2, FileText } from "lucide-react";

const PROMPTS = [
  { icon: User, label: "About Rahul", text: "Rahul ke baare mein batao" },
  { icon: MessageSquare, label: "Latest POV", text: "Rahul ke latest POV/opinion kya hain?" },
  { icon: Link2, label: "Referral offers", text: "Kaun-kaun se referral offers available hain?" },
  { icon: FileText, label: "Explain this page", text: "Yeh page kya hai? Mujhe samjhao." },
  { icon: Sparkles, label: "Contact info", text: "Rahul se contact kaise karu?" },
];

export function SuggestedPrompts({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="space-y-3">
      <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium px-1">
        Try asking
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {PROMPTS.map((p) => (
          <button
            key={p.label}
            onClick={() => onPick(p.text)}
            className="group flex items-start gap-2.5 text-left rounded-xl border border-border/50 bg-card/40 backdrop-blur px-3 py-2.5 hover:border-primary/40 hover:bg-primary/5 transition-all min-h-[44px]"
          >
            <div className="mt-0.5 rounded-lg bg-primary/10 text-primary p-1.5 group-hover:bg-primary/20 transition-colors">
              <p.icon className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-foreground">{p.label}</div>
              <div className="text-[11px] text-muted-foreground line-clamp-1">{p.text}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
