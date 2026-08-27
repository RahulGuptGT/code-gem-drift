import { cn } from '@/lib/utils';

/** Small speech-bubble mark used as the default chat avatar in the sidebar list. */
export function ChatGlyph({ className, active }: { className?: string; active?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md',
        active ? 'wsai-accent-bg' : 'wsai-panel wsai-border border',
        className,
      )}
      aria-hidden
    >
      <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 4.5A1.5 1.5 0 0 1 4.5 3h7A1.5 1.5 0 0 1 13 4.5v5a1.5 1.5 0 0 1-1.5 1.5H7.2L4.5 13v-2H4.5A1.5 1.5 0 0 1 3 9.5v-5Z" />
      </svg>
    </span>
  );
}

/** Small folder mark used as the default project icon in the sidebar. */
export function ProjectGlyph({ className, active }: { className?: string; active?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md',
        active ? 'wsai-accent-bg' : 'wsai-panel wsai-border border',
        className,
      )}
      aria-hidden
    >
      <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2.5 5.5A1.5 1.5 0 0 1 4 4h2.2c.3 0 .58.13.78.35L8 5.5h4a1.5 1.5 0 0 1 1.5 1.5v4A1.5 1.5 0 0 1 12 12.5H4A1.5 1.5 0 0 1 2.5 11V5.5Z" />
      </svg>
    </span>
  );
}

/** Round AI identity mark used as the assistant avatar in the transcript. */
export function AIAvatarGlyph({ className, size = 32, live }: { className?: string; size?: number; live?: boolean }) {
  return (
    <span
      className={cn('relative inline-flex shrink-0 items-center justify-center rounded-full shadow-sm', className)}
      style={{
        width: size,
        height: size,
        background: 'radial-gradient(120% 120% at 30% 20%, hsl(var(--wsai-accent) / 0.95), hsl(var(--wsai-accent) / 0.55))',
        color: 'hsl(var(--wsai-accent-fg))',
      }}
      aria-label="Workspace AI"
    >
      <svg viewBox="0 0 24 24" width={size * 0.55} height={size * 0.55} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3.1" />
        <path d="M12 3.2v3.1M12 17.7v3.1M3.2 12h3.1M17.7 12h3.1" />
        <path d="M6.2 6.2l2.1 2.1M15.7 15.7l2.1 2.1M17.8 6.2l-2.1 2.1M8.3 15.7l-2.1 2.1" opacity="0.7" />
      </svg>
      {live && (
        <span
          className="absolute inset-0 rounded-full animate-ping"
          style={{ border: '1px solid hsl(var(--wsai-accent) / 0.6)' }}
          aria-hidden
        />
      )}
    </span>
  );
}
