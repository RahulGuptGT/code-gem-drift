import { useEffect, useState } from 'react';
import { useLocation, matchPath } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { WorkspaceAICommandPalette } from './WorkspaceAICommandPalette';
import { WorkspaceAIWindow } from './WorkspaceAIWindow';
import type { ContextRef } from '@/hooks/useWorkspaceAI';
import { cn } from '@/lib/utils';

// Detect an entity from the current route and preseed AI context.
function detectContext(pathname: string): ContextRef[] {
  const noteMatch = matchPath('/personal/notepad/:id', pathname);
  if (noteMatch?.params?.id) return [{ type: 'note', id: noteMatch.params.id }];

  const todoMatch = matchPath('/personal/todo/:id', pathname);
  if (todoMatch?.params?.id) return [{ type: 'todo', id: todoMatch.params.id }];

  const relMatch = matchPath('/personal/distrokid/accounts/:aid/releases/:rid', pathname);
  if (relMatch?.params?.rid) {
    return [
      { type: 'dk_release', id: relMatch.params.rid! },
      { type: 'dk_account', id: relMatch.params.aid! },
    ];
  }

  const wdMatch = matchPath('/personal/distrokid/accounts/:aid/withdrawals/:wid', pathname);
  if (wdMatch?.params?.wid) {
    return [
      { type: 'dk_withdrawal', id: wdMatch.params.wid! },
      { type: 'dk_account', id: wdMatch.params.aid! },
    ];
  }

  const acctMatch = matchPath('/personal/distrokid/accounts/:aid/*', pathname);
  if (acctMatch?.params?.aid) return [{ type: 'dk_account', id: acctMatch.params.aid }];

  return [];
}

export function WorkspaceAIGlobalOverlay() {
  const loc = useLocation();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerCtx, setDrawerCtx] = useState<ContextRef[]>([]);

  const onPersonal = loc.pathname.startsWith('/personal');
  const onAiPage = loc.pathname.startsWith('/personal/ai');
  const onDistrokid = loc.pathname.startsWith('/personal/distrokid');

  // Cmd+K / Ctrl+K anywhere under /personal/* — but skip on DK Studio,
  // which has its own command palette bound to the same shortcut.
  useEffect(() => {
    if (onDistrokid) return;
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onDistrokid]);

  if (!onPersonal) return null;

  const openAi = () => {
    setDrawerCtx(detectContext(loc.pathname));
    setDrawerOpen(true);
  };

  return (
    <>
      <WorkspaceAICommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <WorkspaceAIWindow open={drawerOpen} onOpenChange={setDrawerOpen} initialContext={drawerCtx} />

      {!onAiPage && !drawerOpen && (
        <button
          onClick={openAi}
          aria-label="Open Workspace AI"
          className={cn(
            'fixed z-40 right-5 sm:bottom-6 sm:right-6',
            onDistrokid ? 'bottom-[76px] sm:bottom-6' : 'bottom-5',
            'h-14 w-14 min-h-[44px] min-w-[44px] rounded-full flex items-center justify-center',
            'wsai-theme wsai-accent-bg wsai-fab-shadow',
            'hover:scale-105 active:scale-95 transition-transform',
          )}
          title="Workspace AI · Cmd+K to search"
        >
          <Sparkles className="h-6 w-6" />
        </button>
      )}
    </>
  );
}
