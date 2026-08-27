import { useEffect, useState } from 'react';

import { PanelRight, Square, Maximize2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WorkspaceAIShell } from './WorkspaceAIShell';
import workspaceAiLogo from '@/assets/workspace-ai-logo.png';
import type { ContextRef } from '@/hooks/useWorkspaceAI';
import { safeStorage } from '@/lib/safeStorage';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initialContext?: ContextRef[];
}

type Mode = 'dock' | 'float';
const STORAGE_KEY = 'wsai:window-mode';

function readMode(): Mode {
  if (typeof window === 'undefined') return 'dock';
  const v = safeStorage.get(STORAGE_KEY);
  return v === 'float' || v === 'dock' ? v : 'dock';
}

export function WorkspaceAIWindow({ open, onOpenChange, initialContext }: Props) {
  const [mode, setModeState] = useState<Mode>('dock');
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);

  useEffect(() => {
    setModeState(readMode());
  }, []);

  const setMode = (m: Mode) => {
    setModeState(m);
    try {
      safeStorage.set(STORAGE_KEY, m);
    } catch {}
  };

  // Full screen opens the SAME thread in a NEW browser tab.
  const goFullPage = (tid?: string | null) => {
    const target = tid ?? activeThreadId;
    const url = target ? `/personal/ai/${target}` : '/personal/ai';
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (!open) return null;


  const containerCls = cn(
    'wsai-theme fixed z-40 flex flex-col bg-background border shadow-2xl overflow-hidden',
    mode === 'dock' &&
      'right-0 top-0 h-screen w-full sm:w-[420px] md:w-[480px] lg:w-[560px] border-l',
    mode === 'float' &&
      'bottom-20 right-4 sm:right-5 w-[92vw] sm:w-[420px] h-[70vh] max-h-[640px] rounded-2xl',
  );

  return (
    <div
      className={containerCls}
      role="dialog"
      aria-label="Workspace AI"
    >
      <div className="flex items-center justify-between gap-2 px-3 h-11 border-b bg-muted/30 shrink-0">
        <div className="flex items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          <img src={workspaceAiLogo} alt="" width={20} height={20} className="h-5 w-5" />
          Workspace AI
        </div>
        <div className="flex items-center gap-0.5">
          <ModeBtn active={mode === 'dock'} label="Dock right" onClick={() => setMode('dock')}>
            <PanelRight className="h-4 w-4" />
          </ModeBtn>
          <ModeBtn active={mode === 'float'} label="Floating" onClick={() => setMode('float')}>
            <Square className="h-4 w-4" />
          </ModeBtn>
          <ModeBtn active={false} label="Open full screen in new tab" onClick={() => goFullPage()}>
            <Maximize2 className="h-4 w-4" />
          </ModeBtn>
          <div className="w-px h-5 bg-border mx-1" />
          <button
            type="button"
            aria-label="Close"
            onClick={() => onOpenChange(false)}
            className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-accent text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-0 flex flex-col">
        <WorkspaceAIShell
          embedded
          initialContext={initialContext}
          onRequestClose={() => onOpenChange(false)}
          onOpenFullPage={goFullPage}
          onActiveThreadChange={setActiveThreadId}
        />
      </div>
    </div>
  );
}

function ModeBtn({
  active,
  label,
  onClick,
  children,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'h-8 w-8 inline-flex items-center justify-center rounded-md transition-colors',
        active
          ? 'bg-accent text-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-foreground',
      )}
    >
      {children}
    </button>
  );
}
