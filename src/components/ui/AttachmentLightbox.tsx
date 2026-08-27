import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2, Download, ExternalLink, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface LightboxItem {
  url: string;
  name?: string | null;
  kind?: string | null;
  mime?: string | null;
}

function isImage(a: LightboxItem) {
  if (a.kind === 'image') return true;
  if (a.mime?.startsWith('image/')) return true;
  return /\.(png|jpe?g|gif|webp|avif|bmp|svg)(\?|$)/i.test(a.url || '');
}
function isPdf(a: LightboxItem) {
  return a.mime === 'application/pdf' || a.kind === 'pdf' || /\.pdf(\?|$)/i.test(a.url || '');
}
function isAudio(a: LightboxItem) {
  return a.mime?.startsWith('audio/') || a.kind === 'audio' || /\.(mp3|wav|m4a|ogg|webm)(\?|$)/i.test(a.url || '');
}
function isVideo(a: LightboxItem) {
  return a.mime?.startsWith('video/') || a.kind === 'video' || /\.(mp4|mov|webm)(\?|$)/i.test(a.url || '');
}

interface Props {
  items: LightboxItem[];
  index: number;
  onIndexChange: (i: number) => void;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function AttachmentLightbox({ items, index, onIndexChange, open, onOpenChange }: Props) {
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const item = items[index];

  const reset = useCallback(() => { setScale(1); setPan({ x: 0, y: 0 }); }, []);

  useEffect(() => { reset(); }, [index, open, reset]);

  const go = useCallback((delta: number) => {
    if (items.length < 2) return;
    onIndexChange((index + delta + items.length) % items.length);
  }, [index, items.length, onIndexChange]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
      else if (e.key === '+' || e.key === '=') setScale((s) => Math.min(6, s * 1.25));
      else if (e.key === '-') setScale((s) => Math.max(0.25, s / 1.25));
      else if (e.key === '0') reset();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, go, reset]);

  if (!item) return null;

  const label = item.name || 'Attachment';
  const img = isImage(item);

  const onWheel = (e: React.WheelEvent) => {
    if (!img) return;
    e.preventDefault();
    setScale((s) => Math.min(6, Math.max(0.25, s * (e.deltaY > 0 ? 0.9 : 1.1))));
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!img || scale <= 1) return;
    drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    setPan({ x: d.px + (e.clientX - d.x), y: d.py + (e.clientY - d.y) });
  };
  const onPointerUp = () => { drag.current = null; };

  const download = async () => {
    try {
      const res = await fetch(item.url);
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = label;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    } catch {
      window.open(item.url, '_blank', 'noopener,noreferrer');
    }
  };

  const btn = 'h-11 w-11 sm:h-9 sm:w-9 inline-flex items-center justify-center rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors';

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[200] bg-black/85 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className="fixed inset-0 z-[201] flex flex-col outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogPrimitive.Title className="sr-only">{label}</DialogPrimitive.Title>

          {/* Toolbar */}
          <div className="flex items-center gap-1 px-2 sm:px-4 h-14 shrink-0 text-white">
            <p className="flex-1 min-w-0 truncate text-sm font-medium">{label}</p>
            {items.length > 1 && (
              <span className="text-xs text-white/60 tabular-nums px-2">{index + 1} / {items.length}</span>
            )}
            {img && (
              <>
                <button className={btn} onClick={() => setScale((s) => Math.max(0.25, s / 1.25))} title="Zoom out" aria-label="Zoom out"><ZoomOut className="h-4 w-4" /></button>
                <button className={btn} onClick={() => setScale((s) => Math.min(6, s * 1.25))} title="Zoom in" aria-label="Zoom in"><ZoomIn className="h-4 w-4" /></button>
                <button className={btn} onClick={reset} title="Fit to screen" aria-label="Fit to screen"><Maximize2 className="h-4 w-4" /></button>
              </>
            )}
            <button className={btn} onClick={download} title="Download" aria-label="Download"><Download className="h-4 w-4" /></button>
            <a className={btn} href={item.url} target="_blank" rel="noreferrer" title="Open in new tab" aria-label="Open in new tab"><ExternalLink className="h-4 w-4" /></a>
            <DialogPrimitive.Close className={btn} aria-label="Close"><X className="h-5 w-5" /></DialogPrimitive.Close>
          </div>

          {/* Body */}
          <div
            className="relative flex-1 min-h-0 flex items-center justify-center overflow-hidden px-2 pb-4"
            onWheel={onWheel}
            onPointerDown={(e) => { if (e.target === e.currentTarget) onOpenChange(false); }}
          >
            {items.length > 1 && (
              <>
                <button
                  onClick={() => go(-1)}
                  className="absolute left-1 sm:left-3 z-10 h-12 w-12 rounded-full bg-black/50 text-white/90 hover:bg-black/70 inline-flex items-center justify-center"
                  aria-label="Previous attachment"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  onClick={() => go(1)}
                  className="absolute right-1 sm:right-3 z-10 h-12 w-12 rounded-full bg-black/50 text-white/90 hover:bg-black/70 inline-flex items-center justify-center"
                  aria-label="Next attachment"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}

            {img ? (
              <img
                src={item.url}
                alt={label}
                draggable={false}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                onDoubleClick={() => (scale > 1 ? reset() : setScale(2))}
                className={cn(
                  'max-w-full max-h-full object-contain select-none rounded-lg shadow-2xl',
                  scale > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-in',
                )}
                style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`, transition: drag.current ? 'none' : 'transform 120ms ease-out' }}
              />
            ) : isPdf(item) ? (
              <iframe src={item.url} title={label} className="w-full h-full rounded-lg bg-white" />
            ) : isVideo(item) ? (
              <video src={item.url} controls className="max-w-full max-h-full rounded-lg" />
            ) : isAudio(item) ? (
              <div className="w-full max-w-md rounded-xl bg-white/10 p-5 text-white">
                <p className="text-sm font-medium truncate mb-3">{label}</p>
                <audio src={item.url} controls className="w-full" />
              </div>
            ) : (
              <div className="w-full max-w-sm rounded-xl bg-white/10 p-6 text-white text-center space-y-3">
                <FileText className="h-10 w-10 mx-auto opacity-80" />
                <p className="text-sm font-medium break-all">{label}</p>
                <p className="text-xs text-white/60">Is file ka inline preview available nahi hai.</p>
                <button onClick={download} className="inline-flex items-center gap-2 px-4 min-h-[44px] rounded-lg bg-white text-black text-sm font-medium">
                  <Download className="h-4 w-4" /> Download
                </button>
              </div>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/** Convenience hook: returns an opener + the rendered lightbox element. */
export function useLightbox() {
  const [state, setState] = useState<{ items: LightboxItem[]; index: number; open: boolean }>({ items: [], index: 0, open: false });

  const open = useCallback((items: LightboxItem[], index = 0) => {
    if (!items.length) return;
    setState({ items, index, open: true });
  }, []);

  const element = (
    <AttachmentLightbox
      items={state.items}
      index={state.index}
      open={state.open}
      onIndexChange={(i) => setState((s) => ({ ...s, index: i }))}
      onOpenChange={(o) => setState((s) => ({ ...s, open: o }))}
    />
  );

  return { open, element };
}

// ===== App-wide provider so nested/memoized components can open the lightbox =====
const LightboxCtx = createContext<(items: LightboxItem[], index?: number) => void>(() => {});

export function LightboxProvider({ children }: { children: React.ReactNode }) {
  const { open, element } = useLightbox();
  return (
    <LightboxCtx.Provider value={open}>
      {children}
      {element}
    </LightboxCtx.Provider>
  );
}

/** Opener from the nearest LightboxProvider. */
export function useOpenLightbox() {
  return useContext(LightboxCtx);
}
