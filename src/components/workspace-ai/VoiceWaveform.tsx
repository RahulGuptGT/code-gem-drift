import { useEffect, useRef } from 'react';

type AnalyserLike = AnalyserNode | null | undefined;

interface VoiceWaveformProps {
  /** AnalyserNode, or a ref to one (refs are read live each frame, so late setup still animates). */
  analyser: AnalyserLike | React.MutableRefObject<AnalyserLike>;
  active: boolean;
  bars?: number;
  className?: string;
}

function resolve(a: VoiceWaveformProps['analyser']): AnalyserNode | null {
  if (!a) return null;
  if ('current' in (a as any)) return ((a as any).current as AnalyserNode) || null;
  return a as AnalyserNode;
}

/**
 * Live audio waveform bars driven by an AnalyserNode.
 * Renders symmetric center-aligned bars whose heights react to mic loudness.
 */
export function VoiceWaveform({ analyser, active, bars = 28, className = '' }: VoiceWaveformProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const dataRef = useRef<Uint8Array | null>(null);
  const timeRef = useRef<Uint8Array | null>(null);
  const heightsRef = useRef<number[]>(Array(bars).fill(4));
  const analyserProp = useRef(analyser);
  analyserProp.current = analyser;

  useEffect(() => {
    if (!active) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      const nodes = containerRef.current?.children;
      if (nodes) {
        for (let i = 0; i < nodes.length; i++) {
          (nodes[i] as HTMLElement).style.height = '4px';
        }
      }
      heightsRef.current = Array(bars).fill(4);
      return;
    }

    const tick = () => {
      const el = containerRef.current;
      if (!el) return;
      const a = resolve(analyserProp.current);
      const heights = heightsRef.current;

      if (a) {
        const bins = a.frequencyBinCount;
        if (!dataRef.current || dataRef.current.length !== bins) {
          dataRef.current = new Uint8Array(new ArrayBuffer(bins));
        }
        if (!timeRef.current || timeRef.current.length !== bins) {
          timeRef.current = new Uint8Array(new ArrayBuffer(bins));
        }
        a.getByteFrequencyData(dataRef.current as unknown as Uint8Array<ArrayBuffer>);
        a.getByteTimeDomainData(timeRef.current as unknown as Uint8Array<ArrayBuffer>);

        // Overall loudness (RMS) keeps bars alive even when spectrum is flat.
        let sum = 0;
        const t = timeRef.current;
        for (let i = 0; i < t.length; i++) {
          const d = (t[i] - 128) / 128;
          sum += d * d;
        }
        const rms = Math.min(1, Math.sqrt(sum / t.length) * 3);

        const buf = dataRef.current;
        const usable = Math.min(buf.length, 64);
        for (let i = 0; i < bars; i++) {
          const idx = Math.floor((i / bars) * usable);
          const v = buf[idx] / 255; // 0..1
          const mix = Math.max(v, rms * 0.85);
          const target = 4 + Math.pow(mix, 0.6) * 28; // px, easing
          heights[i] = heights[i] + (target - heights[i]) * 0.35;
        }
      } else {
        // Idle shimmer when analyser not ready
        const now = performance.now() / 500;
        for (let i = 0; i < bars; i++) {
          const target = 4 + (Math.sin(now + i * 0.4) + 1) * 2;
          heights[i] = heights[i] + (target - heights[i]) * 0.2;
        }
      }

      const nodes = el.children;
      const count = Math.min(nodes.length, bars);
      for (let i = 0; i < count; i++) {
        (nodes[i] as HTMLElement).style.height = `${heights[i].toFixed(1)}px`;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [active, bars]);


  return (
    <div
      ref={containerRef}
      className={`flex items-center justify-center gap-[3px] h-8 ${className}`}
      aria-hidden="true"
    >
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          className="inline-block w-[3px] rounded-full bg-foreground/70 transition-[height] duration-75 ease-out"
          style={{ height: '4px' }}
        />
      ))}
    </div>
  );
}
