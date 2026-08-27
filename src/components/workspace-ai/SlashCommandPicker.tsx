import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';

export type SlashCommand = {
  id: string;
  label: string;
  hint: string;
  icon: React.ReactNode;
  /** 'action' runs immediately, 'prompt' fills the composer with a template. */
  kind: 'action' | 'prompt';
  run?: () => void;
  text?: string;
};

interface Props {
  query: string;
  commands: SlashCommand[];
  onPick: (cmd: SlashCommand) => void;
  onClose: () => void;
}

export function SlashCommandPicker({ query, commands, onPick, onClose }: Props) {
  const [active, setActive] = useState(0);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => c.id.includes(q) || c.label.toLowerCase().includes(q));
  }, [commands, query]);

  useEffect(() => { setActive(0); }, [query]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, results.length - 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
      else if (e.key === 'Enter' || e.key === 'Tab') {
        const c = results[active];
        if (c) { e.preventDefault(); onPick(c); }
      } else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [results, active, onPick, onClose]);

  if (!results.length) {
    return (
      <div className="absolute bottom-full mb-2 left-0 z-50 w-[320px] rounded-lg border bg-popover shadow-lg p-3 text-xs text-muted-foreground">
        Koi command match nahi. Esc dabaayein.
      </div>
    );
  }

  return (
    <div className="absolute bottom-full mb-2 left-0 z-50 w-[340px] max-h-[300px] overflow-y-auto rounded-lg border bg-popover shadow-lg py-1">
      <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Commands
      </div>
      {results.map((c, i) => (
        <button
          key={c.id}
          onMouseEnter={() => setActive(i)}
          onClick={() => onPick(c)}
          className={cn(
            'w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-accent',
            i === active && 'bg-accent',
          )}
        >
          <span className="shrink-0 text-muted-foreground">{c.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="truncate">
              <span className="font-mono text-[12px] text-muted-foreground">/{c.id}</span>{' '}
              <span>{c.label}</span>
            </div>
            <div className="text-[10px] text-muted-foreground truncate">{c.hint}</div>
          </div>
        </button>
      ))}
    </div>
  );
}
