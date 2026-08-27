import { cn } from "@/lib/utils";
import { CSSProperties } from "react";

/* ──────────────────────────────────────────────────────────────
   Theme variants
   ────────────────────────────────────────────────────────────── */

export type LoaderVariant =
  | "brand"      // default — primary → secondary
  | "midnight"   // deep navy + electric blue (dark splash)
  | "paper"      // ink on cream — editorial / paper theme
  | "neon"       // emerald/mint — Notes AI
  | "violet"     // indigo/violet — DistroKid AI
  | "mono"       // currentColor (inherits — perfect for buttons)
  | "sunset";    // warm coral → magenta

export type LoaderFontFamily =
  | "sans"       // Inter (default)
  | "serif"      // Instrument Serif (paper / editorial)
  | "mono"       // JetBrains Mono
  | "signature"; // Great Vibes (brand signature)

interface VariantTokens {
  from: string;       // gradient start (monogram + arc)
  to: string;         // gradient end
  halo: string;       // radial halo color
  track: string;      // faint background ring
  text: string;       // wordmark color
  shadow: string;     // monogram shadow
  monoFg: string;     // monogram text color
}

const VARIANTS: Record<LoaderVariant, VariantTokens> = {
  brand: {
    from: "hsl(var(--secondary))",
    to: "hsl(var(--primary))",
    halo: "hsl(var(--secondary) / 0.35)",
    track: "hsl(var(--border))",
    text: "hsl(var(--foreground))",
    shadow: "0 8px 24px -6px hsl(var(--primary) / 0.55)",
    monoFg: "hsl(var(--primary-foreground))",
  },
  midnight: {
    from: "#3F8EFC",
    to: "#0A1F44",
    halo: "rgba(63,142,252,0.35)",
    track: "rgba(255,255,255,0.12)",
    text: "#E8EDF6",
    shadow: "0 10px 28px -6px rgba(10,31,68,0.7)",
    monoFg: "#ffffff",
  },
  paper: {
    from: "#2d2d2d",
    to: "#0d0d0d",
    halo: "rgba(13,13,13,0.18)",
    track: "rgba(13,13,13,0.12)",
    text: "#1a1a1a",
    shadow: "0 8px 22px -8px rgba(0,0,0,0.4)",
    monoFg: "#f5f3ee",
  },
  neon: {
    from: "#34d399",
    to: "#059669",
    halo: "rgba(52,211,153,0.4)",
    track: "hsl(var(--border))",
    text: "hsl(var(--foreground))",
    shadow: "0 10px 26px -6px rgba(16,185,129,0.55)",
    monoFg: "#ffffff",
  },
  violet: {
    from: "#a78bfa",
    to: "#4f46e5",
    halo: "rgba(99,102,241,0.4)",
    track: "hsl(var(--border))",
    text: "hsl(var(--foreground))",
    shadow: "0 10px 26px -6px rgba(79,70,229,0.55)",
    monoFg: "#ffffff",
  },
  mono: {
    from: "currentColor",
    to: "currentColor",
    halo: "currentColor",
    track: "currentColor",
    text: "currentColor",
    shadow: "none",
    monoFg: "hsl(var(--background))",
  },
  sunset: {
    from: "#ff6b35",
    to: "#e84393",
    halo: "rgba(232,67,147,0.4)",
    track: "hsl(var(--border))",
    text: "hsl(var(--foreground))",
    shadow: "0 10px 26px -6px rgba(232,67,147,0.5)",
    monoFg: "#ffffff",
  },
};

const FONT_FAMILIES: Record<LoaderFontFamily, string> = {
  sans: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  serif: "'Instrument Serif', Georgia, serif",
  mono: "'JetBrains Mono', ui-monospace, monospace",
  signature: "'Great Vibes', cursive",
};

/* ──────────────────────────────────────────────────────────────
   Component
   ────────────────────────────────────────────────────────────── */

interface UniversalLoaderProps {
  fullscreen?: boolean;
  label?: string;
  size?: number;
  className?: string;
  backdrop?: boolean;
  /** Color theme — defaults to brand */
  variant?: LoaderVariant;
  /** Monogram text inside the disc (default "RG") */
  monogram?: string;
  /** Font family preset for wordmark */
  font?: LoaderFontFamily;
  /** Override backdrop tone: auto follows dark/light, dark, or light */
  backdropTone?: "auto" | "dark" | "light";
  /** Hide the monogram disc (just show arc + halo) */
  hideMonogram?: boolean;
  /** Custom token overrides (advanced) */
  tokens?: Partial<VariantTokens>;
}

export function UniversalLoader({
  fullscreen = false,
  label = "Rahul Gupta",
  size = 88,
  className,
  backdrop = true,
  variant = "brand",
  monogram = "RG",
  font = "sans",
  backdropTone = "auto",
  hideMonogram = false,
  tokens,
}: UniversalLoaderProps) {
  const t = { ...VARIANTS[variant], ...(tokens || {}) };
  const fontFamily = FONT_FAMILIES[font];
  const stroke = Math.max(3, Math.round(size * 0.06));
  const inner = size - stroke * 2;
  const gradId = `ul-arc-${variant}`;

  const mark = (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
      role="status"
      aria-label={`${label} loading`}
    >
      {/* Halo */}
      <span
        className="absolute inset-0 rounded-full opacity-60 animate-[ul-halo_2.2s_ease-in-out_infinite]"
        style={{
          background: `radial-gradient(circle, ${t.halo} 0%, transparent 70%)`,
        }}
      />

      {/* Rotating arc */}
      <svg
        className="absolute inset-0 animate-[ul-spin_1.15s_linear_infinite]"
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
      >
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={t.from} />
            <stop offset="100%" stopColor={t.to} />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={inner / 2}
          fill="none"
          stroke={t.track}
          strokeWidth={stroke}
          opacity={0.35}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={inner / 2}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${inner * Math.PI * 0.35} ${inner * Math.PI}`}
        />
      </svg>

      {/* Monogram disc */}
      {!hideMonogram && (
        <span
          className="relative flex items-center justify-center rounded-full font-bold animate-[ul-pop_1.8s_ease-in-out_infinite]"
          style={{
            width: inner * 0.72,
            height: inner * 0.72,
            background: `linear-gradient(135deg, ${t.from}, ${t.to})`,
            color: t.monoFg,
            boxShadow: t.shadow,
            fontFamily,
            fontSize: inner * (monogram.length > 2 ? 0.24 : 0.32),
            letterSpacing: "-0.04em",
          }}
        >
          {monogram}
        </span>
      )}
    </div>
  );

  const content = (
    <div className={cn("flex flex-col items-center justify-center gap-5", className)}>
      {mark}
      {label && (
        <div className="flex flex-col items-center gap-1.5">
          <span
            className="ul-shimmer text-base font-semibold tracking-tight"
            style={
              {
                fontFamily,
                "--ul-text": t.text,
              } as CSSProperties
            }
          >
            {label}
          </span>
          <span className="flex items-center gap-1 mt-0.5">
            <span
              className="w-1.5 h-1.5 rounded-full animate-[ul-dot_1.1s_ease-in-out_infinite] [animation-delay:0ms]"
              style={{ background: t.from }}
            />
            <span
              className="w-1.5 h-1.5 rounded-full animate-[ul-dot_1.1s_ease-in-out_infinite] [animation-delay:160ms]"
              style={{ background: t.from }}
            />
            <span
              className="w-1.5 h-1.5 rounded-full animate-[ul-dot_1.1s_ease-in-out_infinite] [animation-delay:320ms]"
              style={{ background: t.from }}
            />
          </span>
        </div>
      )}
    </div>
  );

  if (!fullscreen) return content;

  // Backdrop tone
  const backdropClass =
    backdropTone === "dark"
      ? "bg-[#0a0a1a]/85 backdrop-blur-md"
      : backdropTone === "light"
      ? "bg-white/80 backdrop-blur-md"
      : "bg-background/80 backdrop-blur-md"; // auto follows theme

  return (
    <div
      className={cn(
        "fixed inset-0 z-[9999] flex items-center justify-center",
        backdrop && backdropClass,
        "animate-in fade-in duration-200"
      )}
    >
      {content}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   Inline spinner — inherits currentColor (mono-friendly)
   ────────────────────────────────────────────────────────────── */
export function UniversalSpinner({
  size = 16,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn("inline-block align-[-2px]", className)}
      style={{ width: size, height: size }}
      role="status"
      aria-label="Loading"
    >
      <span
        className="block w-full h-full rounded-full animate-[ul-spin_0.9s_linear_infinite]"
        style={{
          background:
            "conic-gradient(from 0deg, transparent 0%, currentColor 90%)",
          WebkitMask:
            "radial-gradient(circle, transparent calc(50% - 2px), #000 calc(50% - 1px))",
          mask: "radial-gradient(circle, transparent calc(50% - 2px), #000 calc(50% - 1px))",
        }}
      />
    </span>
  );
}

/* ──────────────────────────────────────────────────────────────
   Top-of-page indeterminate progress bar
   ────────────────────────────────────────────────────────────── */
export function UniversalTopBar({
  className,
  variant = "brand",
}: {
  className?: string;
  variant?: LoaderVariant;
}) {
  const t = VARIANTS[variant];
  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-[9999] h-[2.5px] overflow-hidden bg-transparent",
        className
      )}
    >
      <div
        className="h-full w-1/3 rounded-r-full animate-[ul-bar_1.2s_ease-in-out_infinite]"
        style={{
          background: `linear-gradient(90deg, transparent, ${t.from}, ${t.to}, transparent)`,
          boxShadow: `0 0 12px ${t.halo}`,
        }}
      />
    </div>
  );
}

export default UniversalLoader;
