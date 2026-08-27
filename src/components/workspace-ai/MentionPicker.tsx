import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { StickyNote, ListChecks, User, Disc, Banknote } from 'lucide-react';
import type { ContextRef } from '@/hooks/useWorkspaceAI';
import { cn } from '@/lib/utils';

interface Props {
  query: string;
  onPick: (ref: ContextRef, insertLabel: string) => void;
  onClose: () => void;
}

interface Result { ref: ContextRef; label: string; sub?: string; }

const ICONS = {
  note: StickyNote,
  todo: ListChecks,
  dk_account: User,
  dk_release: Disc,
  dk_withdrawal: Banknote,
} as const;

export function MentionPicker({ query, onPick, onClose }: Props) {
  const [results, setResults] = useState<Result[]>([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      const q = query.trim();
      const [notes, todos, releases, accounts] = await Promise.all([
        supabase.from('workspace_notes').select('id, title').eq('is_trashed', false).ilike('title', `%${q}%`).limit(5),
        supabase.from('personal_todos').select('id, title').ilike('title', `%${q}%`).limit(5),
        supabase.from('distrokid_releases').select('id, title, artist_name').ilike('title', `%${q}%`).limit(5),
        supabase.from('distrokid_accounts').select('id, email, title').or(`email.ilike.%${q}%,title.ilike.%${q}%`).limit(5),
      ]);
      if (!alive) return;
      const rs: Result[] = [];
      for (const n of notes.data || []) rs.push({ ref: { type: 'note', id: (n as any).id, label: (n as any).title || 'Untitled' }, label: (n as any).title || 'Untitled', sub: 'Note' });
      for (const t of todos.data || []) rs.push({ ref: { type: 'todo', id: (t as any).id, label: (t as any).title }, label: (t as any).title, sub: 'Todo' });
      for (const r of releases.data || []) rs.push({ ref: { type: 'dk_release', id: (r as any).id, label: (r as any).title }, label: (r as any).title, sub: `Release · ${(r as any).artist_name || ''}` });
      for (const a of accounts.data || []) rs.push({ ref: { type: 'dk_account', id: (a as any).id, label: (a as any).email }, label: (a as any).title || (a as any).email, sub: (a as any).email });
      setResults(rs);
      setActive(0);
    })();
    return () => { alive = false; };
  }, [query]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, results.length - 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
      else if (e.key === 'Enter' || e.key === 'Tab') {
        const r = results[active];
        if (r) { e.preventDefault(); onPick(r.ref, r.label); }
      } else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [results, active, onPick, onClose]);

  if (!results.length) return (
    <div className="absolute bottom-full mb-2 left-0 z-50 w-[300px] rounded-lg border bg-popover shadow-lg p-3 text-xs text-muted-foreground">
      Type to search notes, todos, releases, accounts…
    </div>
  );

  return (
    <div className="absolute bottom-full mb-2 left-0 z-50 w-[320px] max-h-[280px] overflow-y-auto rounded-lg border bg-popover shadow-lg py-1">
      {results.map((r, i) => {
        const Icon = ICONS[r.ref.type];
        return (
          <button
            key={`${r.ref.type}:${r.ref.id}`}
            onMouseEnter={() => setActive(i)}
            onClick={() => onPick(r.ref, r.label)}
            className={cn('w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent',
              i === active && 'bg-accent')}
          >
            <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <div className="truncate">{r.label}</div>
              {r.sub && <div className="text-[10px] text-muted-foreground truncate">{r.sub}</div>}
            </div>
          </button>
        );
      })}
    </div>
  );
}
