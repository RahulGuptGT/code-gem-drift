import { useState } from "react";
import { Plus, Search, Trash2, MessageSquare, Pencil, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { Thread } from "@/lib/supportChatStorage";

interface Props {
  threads: Thread[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onClose?: () => void;
}

function groupByDate(threads: Thread[]) {
  const groups: Record<string, Thread[]> = { Today: [], Yesterday: [], Earlier: [] };
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yest = today - 86400000;
  for (const t of threads) {
    if (t.updatedAt >= today) groups.Today.push(t);
    else if (t.updatedAt >= yest) groups.Yesterday.push(t);
    else groups.Earlier.push(t);
  }
  return groups;
}

export function ThreadSidebar({ threads, activeId, onSelect, onNew, onDelete, onRename, onClose }: Props) {
  const [q, setQ] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const filtered = threads.filter((t) =>
    q ? t.title.toLowerCase().includes(q.toLowerCase()) : true
  );
  const sorted = [...filtered].sort((a, b) => b.updatedAt - a.updatedAt);
  const groups = groupByDate(sorted);

  const startEdit = (t: Thread) => {
    setEditingId(t.id);
    setEditTitle(t.title);
  };
  const commitEdit = () => {
    if (editingId && editTitle.trim()) onRename(editingId, editTitle.trim().slice(0, 60));
    setEditingId(null);
  };

  return (
    <div className="flex flex-col h-full bg-background/60 backdrop-blur-xl border-r border-border/60 w-56">
      <div className="p-3 space-y-2 border-b border-border/50">
        <div className="flex items-center gap-2">
          <Button onClick={onNew} size="sm" className="flex-1 h-9 gap-1.5 bg-gradient-to-br from-primary to-primary/80">
            <Plus className="h-3.5 w-3.5" />
            New chat
          </Button>
          {onClose && (
            <Button onClick={onClose} size="icon" variant="ghost" className="h-9 w-9 md:hidden">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search"
            className="h-8 pl-7 text-xs"
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-3">
          {threads.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-6 px-2">
              No chats yet. Start a new conversation!
            </p>
          )}
          {(Object.keys(groups) as Array<keyof typeof groups>).map((g) => {
            const items = groups[g];
            if (items.length === 0) return null;
            return (
              <div key={g} className="space-y-0.5">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-2 py-1">
                  {g}
                </div>
                {items.map((t) => (
                  <div
                    key={t.id}
                    className={cn(
                      "group flex items-center gap-1.5 rounded-lg px-2 py-1.5 cursor-pointer transition-colors",
                      activeId === t.id ? "bg-primary/15 text-foreground" : "hover:bg-muted/60 text-muted-foreground"
                    )}
                  >
                    <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                    {editingId === t.id ? (
                      <>
                        <input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitEdit();
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          autoFocus
                          className="flex-1 bg-transparent text-xs outline-none border-b border-border"
                        />
                        <button onClick={commitEdit} className="h-6 w-6 inline-flex items-center justify-center">
                          <Check className="h-3 w-3" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => onSelect(t.id)}
                          className="flex-1 text-left text-xs truncate min-w-0"
                          title={t.title}
                        >
                          {t.title}
                        </button>
                        <button
                          onClick={() => startEdit(t)}
                          className="h-6 w-6 inline-flex items-center justify-center opacity-0 group-hover:opacity-100 hover:text-foreground"
                          title="Rename"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => onDelete(t.id)}
                          className="h-6 w-6 inline-flex items-center justify-center opacity-0 group-hover:opacity-100 hover:text-destructive"
                          title="Delete"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
