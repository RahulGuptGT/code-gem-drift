import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus, Brain, Search, ChevronDown, ChevronRight, Pencil, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Mem {
  id: string;
  content: string;
  kind: string;
  agent: string;
  importance: number;
  updated_at: string;
  last_used_at: string | null;
  source: string | null;
}

const KIND_ORDER: { key: string; label: string; hint: string }[] = [
  { key: 'preference', label: 'Preferences', hint: 'How you like things done' },
  { key: 'fact', label: 'Facts', hint: 'Stable facts about you' },
  { key: 'style', label: 'Style', hint: 'Tone, language, formatting' },
  { key: 'goal', label: 'Goals', hint: 'Long-term goals & projects' },
  { key: 'context', label: 'Context', hint: 'Recurring context' },
];

const AGENT_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'notes', label: 'Notes' },
  { value: 'distrokid', label: 'DistroKid' },
  { value: 'merged', label: 'Merged' },
];

function fmtRel(iso: string | null): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function MemoriesPanel({ open, onOpenChange, refreshKey }: { open: boolean; onOpenChange: (v: boolean) => void; refreshKey?: number }) {
  const [mems, setMems] = useState<Mem[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newKind, setNewKind] = useState<string>('preference');
  const [newImportance, setNewImportance] = useState<number>(3);
  const [newAgent, setNewAgent] = useState<string>('all');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('kodu_memories')
      .select('id, content, kind, agent, importance, updated_at, last_used_at, source')
      .order('importance', { ascending: false })
      .order('updated_at', { ascending: false });
    if (error) toast.error(error.message);
    setMems((data as any) || []);
    setLoading(false);
  }, []);

  useEffect(() => { if (open) load(); }, [open, load, refreshKey]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return mems;
    return mems.filter((m) => m.content.toLowerCase().includes(q));
  }, [mems, query]);

  const grouped = useMemo(() => {
    const g: Record<string, Mem[]> = {};
    for (const m of filtered) {
      const k = KIND_ORDER.find((x) => x.key === m.kind) ? m.kind : 'context';
      (g[k] ||= []).push(m);
    }
    return g;
  }, [filtered]);

  const add = async () => {
    const content = newContent.trim();
    if (!content) return;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { toast.error('Sign in required'); return; }
    const { error } = await supabase.from('kodu_memories').insert({
      content: content.slice(0, 2000),
      kind: newKind,
      agent: newAgent,
      importance: newImportance,
      source: 'user',
      user_id: u.user.id,
    });
    if (error) { toast.error(error.message); return; }
    setNewContent('');
    toast.success('Memory saved');
    load();
  };

  const remove = async (id: string) => {
    await supabase.from('kodu_memories').delete().eq('id', id);
    setMems((m) => m.filter((x) => x.id !== id));
  };

  const startEdit = (m: Mem) => { setEditingId(m.id); setEditingText(m.content); };
  const saveEdit = async () => {
    if (!editingId) return;
    const text = editingText.trim();
    if (!text) return;
    await supabase.from('kodu_memories').update({ content: text.slice(0, 2000), updated_at: new Date().toISOString() }).eq('id', editingId);
    setEditingId(null); setEditingText('');
    load();
  };

  const clearAll = async () => {
    if (!confirm('Delete ALL memories permanently? AI will forget everything about you.')) return;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    await supabase.from('kodu_memories').delete().eq('user_id', u.user.id);
    load();
    toast.success('All memories cleared');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col p-0 gap-0">
        <SheetHeader className="p-4 border-b space-y-1">
          <SheetTitle className="flex items-center gap-2 text-left"><Brain className="h-4 w-4" /> Memory</SheetTitle>
          <p className="text-xs text-muted-foreground text-left">
            Workspace AI ChatGPT/Claude jaisi memory rakhta hai — chats se important facts, preferences aur goals yaad rakhta hai aur har naye chat me use karta hai.
          </p>
        </SheetHeader>

        {/* Add new */}
        <div className="p-3 border-b space-y-2 bg-muted/30">
          <Textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="e.g. I prefer Hinglish, short replies with bullet points"
            rows={2}
            className="resize-none text-sm"
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); add(); } }}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Select value={newKind} onValueChange={setNewKind}>
              <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {KIND_ORDER.map((k) => <SelectItem key={k.key} value={k.key} className="text-xs">{k.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={newAgent} onValueChange={setNewAgent}>
              <SelectTrigger className="h-8 w-[120px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {AGENT_OPTIONS.map((a) => <SelectItem key={a.value} value={a.value} className="text-xs">{a.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1 text-xs">
              <span className="text-muted-foreground">Importance</span>
              {[1,2,3,4,5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setNewImportance(n)}
                  className={cn('h-4 w-4 rounded-full border', n <= newImportance ? 'bg-primary border-primary' : 'bg-transparent')}
                  aria-label={`Importance ${n}`}
                />
              ))}
            </div>
            <Button size="sm" onClick={add} disabled={!newContent.trim()} className="ml-auto h-8">
              <Plus className="h-3.5 w-3.5 mr-1" /> Save
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="p-3 border-b flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search memories…" className="h-8 pl-8 text-xs" />
          </div>
          <span className="text-[11px] text-muted-foreground">{filtered.length}/{mems.length}</span>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading && <p className="text-center text-xs text-muted-foreground py-8">Loading…</p>}
          {!loading && mems.length === 0 && (
            <div className="text-center py-12 px-6">
              <Brain className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm font-medium">No memories yet</p>
              <p className="text-xs text-muted-foreground mt-1">Chat me kuch important batao ("remember that…"), ya upar se manually add karo.</p>
            </div>
          )}
          {!loading && mems.length > 0 && (
            <div className="p-2 space-y-3">
              {KIND_ORDER.map((k) => {
                const rows = grouped[k.key] || [];
                if (!rows.length) return null;
                const isCollapsed = collapsed[k.key];
                return (
                  <div key={k.key} className="rounded-lg border overflow-hidden">
                    <button
                      onClick={() => setCollapsed((c) => ({ ...c, [k.key]: !c[k.key] }))}
                      className="w-full flex items-center gap-2 px-3 py-2 bg-muted/50 hover:bg-muted text-left"
                    >
                      {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      <span className="text-xs font-semibold uppercase tracking-wider">{k.label}</span>
                      <span className="text-[10px] text-muted-foreground">{k.hint}</span>
                      <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-background border">{rows.length}</span>
                    </button>
                    {!isCollapsed && (
                      <div className="divide-y">
                        {rows.map((m) => (
                          <div key={m.id} className="group px-3 py-2 hover:bg-accent/50">
                            <div className="flex items-start gap-2">
                              <div className="flex flex-col items-center gap-0.5 pt-1 shrink-0" title={`Importance ${m.importance}/5`}>
                                {[1,2,3,4,5].map((n) => (
                                  <span key={n} className={cn('h-1 w-1 rounded-full', n <= m.importance ? 'bg-primary' : 'bg-muted')} />
                                ))}
                              </div>
                              <div className="flex-1 min-w-0">
                                {editingId === m.id ? (
                                  <div className="space-y-1.5">
                                    <Textarea value={editingText} onChange={(e) => setEditingText(e.target.value)} rows={2} className="text-sm resize-none" autoFocus />
                                    <div className="flex gap-1">
                                      <Button size="sm" className="h-7 text-xs" onClick={saveEdit}><Check className="h-3 w-3 mr-1" /> Save</Button>
                                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setEditingId(null); setEditingText(''); }}><X className="h-3 w-3" /></Button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <p className="text-sm leading-snug break-words">{m.content}</p>
                                    <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                                      {m.agent !== 'all' && <span className="uppercase">{m.agent}</span>}
                                      {m.source === 'assistant' && <span className="text-primary">auto-saved</span>}
                                      <span>updated {fmtRel(m.updated_at)}</span>
                                      {m.last_used_at && <span>· last used {fmtRel(m.last_used_at)}</span>}
                                    </div>
                                  </>
                                )}
                              </div>
                              {editingId !== m.id && (
                                <div className="flex items-center gap-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => startEdit(m)} className="h-11 w-11 md:h-9 md:w-9 flex items-center justify-center rounded-lg hover:bg-background" aria-label="Edit"><Pencil className="h-4 w-4" /></button>
                                  <button onClick={() => remove(m.id)} className="h-11 w-11 md:h-9 md:w-9 flex items-center justify-center rounded-lg hover:bg-background text-destructive" aria-label="Forget"><Trash2 className="h-4 w-4" /></button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {mems.length > 0 && (
          <div className="p-3 border-t flex items-center justify-between gap-2">
            <p className="text-[10px] text-muted-foreground">AI ye memories har naye chat me use karta hai.</p>
            <Button size="sm" variant="ghost" className="h-11 md:h-9 text-xs text-destructive hover:text-destructive" onClick={clearAll}>
              <Trash2 className="h-3 w-3 mr-1" /> Clear all
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
