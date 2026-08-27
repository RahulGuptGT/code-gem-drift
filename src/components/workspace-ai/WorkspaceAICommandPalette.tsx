import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandSeparator,
} from '@/components/ui/command';
import { supabase } from '@/integrations/supabase/client';
import { Sparkles, MessageSquare, StickyNote, ListChecks, Disc, User, Plus, Brain } from 'lucide-react';
import { safeSession } from '@/lib/safeStorage';

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

export function WorkspaceAICommandPalette({ open, onOpenChange }: Props) {
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [threads, setThreads] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [todos, setTodos] = useState<any[]>([]);
  const [releases, setReleases] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);

  useEffect(() => {
    if (!open) { setQ(''); return; }
    (async () => {
      const { data: t } = await supabase.from('workspace_ai_threads').select('id, title').eq('archived', false).order('last_message_at', { ascending: false }).limit(20);
      setThreads(t || []);
    })();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const term = q.trim();
    if (!term) { setNotes([]); setTodos([]); setReleases([]); setAccounts([]); return; }
    const h = setTimeout(async () => {
      const [n, td, r, a] = await Promise.all([
        supabase.from('workspace_notes').select('id, title').eq('is_trashed', false).ilike('title', `%${term}%`).limit(6),
        supabase.from('personal_todos').select('id, title').ilike('title', `%${term}%`).limit(6),
        supabase.from('distrokid_releases').select('id, title, account_id, artist_name').ilike('title', `%${term}%`).limit(6),
        supabase.from('distrokid_accounts').select('id, email, title').or(`email.ilike.%${term}%,title.ilike.%${term}%`).limit(6),
      ]);
      setNotes(n.data || []); setTodos(td.data || []); setReleases(r.data || []); setAccounts(a.data || []);
    }, 180);
    return () => clearTimeout(h);
  }, [q, open]);

  const go = (path: string) => { onOpenChange(false); nav(path); };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Ask AI or jump to anything…" value={q} onValueChange={setQ} />
      <CommandList>
        <CommandEmpty>Nothing found.</CommandEmpty>

        {q.trim() && (
          <>
            <CommandGroup heading="Ask AI">
              <CommandItem onSelect={() => { onOpenChange(false); safeSession.set('wsai:draft', q); nav('/personal/ai'); }}>
                <Sparkles className="mr-2 h-4 w-4 text-primary" /> Ask Workspace AI: "{q}"
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => go('/personal/ai')}><Plus className="mr-2 h-4 w-4" /> New chat</CommandItem>
          <CommandItem onSelect={() => { onOpenChange(false); window.dispatchEvent(new CustomEvent('wsai:open-memories')); nav('/personal/ai'); }}>
            <Brain className="mr-2 h-4 w-4" /> Manage AI memories
          </CommandItem>
        </CommandGroup>

        {threads.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Recent chats">
              {threads.slice(0, 8).map((t) => (
                <CommandItem key={t.id} value={`thread ${t.title}`} onSelect={() => go(`/personal/ai/${t.id}`)}>
                  <MessageSquare className="mr-2 h-4 w-4 opacity-60" /> {t.title}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {notes.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Notes">
              {notes.map((n) => (
                <CommandItem key={n.id} value={`note ${n.title}`} onSelect={() => go(`/personal/notepad/${n.id}`)}>
                  <StickyNote className="mr-2 h-4 w-4 opacity-60" /> {n.title || 'Untitled'}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {todos.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="To-dos">
              {todos.map((t) => (
                <CommandItem key={t.id} value={`todo ${t.title}`} onSelect={() => go(`/personal/todo/${t.id}`)}>
                  <ListChecks className="mr-2 h-4 w-4 opacity-60" /> {t.title}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {releases.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="DistroKid releases">
              {releases.map((r) => (
                <CommandItem key={r.id} value={`release ${r.title}`} onSelect={() => go(`/personal/distrokid/accounts/${r.account_id}/releases/${r.id}`)}>
                  <Disc className="mr-2 h-4 w-4 opacity-60" /> {r.title} <span className="ml-auto text-xs text-muted-foreground">{r.artist_name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {accounts.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="DistroKid accounts">
              {accounts.map((a) => (
                <CommandItem key={a.id} value={`account ${a.email}`} onSelect={() => go(`/personal/distrokid/accounts/${a.id}/overview`)}>
                  <User className="mr-2 h-4 w-4 opacity-60" /> {a.email}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
