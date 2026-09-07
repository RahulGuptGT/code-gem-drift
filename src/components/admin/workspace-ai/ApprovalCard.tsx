import { AlertTriangle, Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PendingWrite } from "./useWorkspaceAI";

const ICON: Record<string, typeof Plus> = {
  create: Plus,
  update: Pencil,
  delete: Trash2,
};

function Value({ v }: { v: unknown }) {
  const s =
    v === null || v === undefined || v === ""
      ? "—"
      : typeof v === "string"
        ? v
        : JSON.stringify(v);
  return <span className="break-words">{s.length > 160 ? `${s.slice(0, 160)}…` : s}</span>;
}

export function ApprovalCard({
  items,
  onApprove,
  onReject,
  busy,
}: {
  items: PendingWrite[];
  onApprove: () => void;
  onReject: () => void;
  busy?: boolean;
}) {
  const destructive = items.some((i) => i.destructive);

  return (
    <div
      className={`rounded-xl border p-4 space-y-3 ${
        destructive ? "border-destructive/50 bg-destructive/5" : "border-primary/40 bg-primary/5"
      }`}
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className={`h-4 w-4 mt-0.5 shrink-0 ${destructive ? "text-destructive" : "text-primary"}`} />
        <div className="text-sm font-semibold">
          {destructive ? "Confirm karo — yeh permanent hai" : "Approval chahiye"}
          <p className="text-xs font-normal text-muted-foreground mt-0.5">
            Abhi tak kuch change nahi hua. Approve karoge tabhi apply hoga.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {items.map((item, idx) => {
          const Icon = ICON[item.action] ?? Pencil;
          return (
            <div key={item.key || idx} className="rounded-lg border border-border/60 bg-background/60 p-3 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Icon className={`h-3.5 w-3.5 ${item.destructive ? "text-destructive" : "text-primary"}`} />
                <span>{item.summary}</span>
              </div>

              {item.changes && (
                <ul className="text-xs space-y-1">
                  {Object.entries(item.changes).map(([k, c]) => (
                    <li key={k} className="grid grid-cols-[110px_1fr] gap-2">
                      <span className="text-muted-foreground truncate">{k}</span>
                      <span>
                        <span className="line-through text-muted-foreground"><Value v={c?.from} /></span>
                        {"  →  "}
                        <span className="font-medium"><Value v={c?.to} /></span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {item.values && !item.changes && (
                <ul className="text-xs space-y-1">
                  {Object.entries(item.values).map(([k, v]) => (
                    <li key={k} className="grid grid-cols-[110px_1fr] gap-2">
                      <span className="text-muted-foreground truncate">{k}</span>
                      <span className="font-medium"><Value v={v} /></span>
                    </li>
                  ))}
                </ul>
              )}

              {item.row && (
                <p className="text-xs text-destructive">
                  Yeh record hamesha ke liye chala jayega — wapas nahi aayega.
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex gap-2 pt-1">
        <Button
          size="sm"
          variant={destructive ? "destructive" : "default"}
          onClick={onApprove}
          disabled={busy}
          className="gap-1.5"
        >
          <Check className="h-3.5 w-3.5" />
          {destructive ? "Haan, delete karo" : "Approve & apply"}
        </Button>
        <Button size="sm" variant="outline" onClick={onReject} disabled={busy} className="gap-1.5">
          <X className="h-3.5 w-3.5" />
          Cancel
        </Button>
      </div>
    </div>
  );
}
