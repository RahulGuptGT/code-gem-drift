// Collect maximum possible device data on session start
async function hashString(str: string): Promise<string> {
  try {
    const enc = new TextEncoder().encode(str);
    const buf = await crypto.subtle.digest('SHA-256', enc);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
  } catch {
    return '';
  }
}

function getCanvasFingerprint(): string {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    canvas.width = 280; canvas.height = 60;
    ctx.textBaseline = 'top';
    ctx.font = "14px 'Arial'";
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('fingerprint-x9!', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('fingerprint-x9!', 4, 17);
    return canvas.toDataURL();
  } catch {
    return '';
  }
}

function getWebGLInfo(): { vendor: string; renderer: string } {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return { vendor: '', renderer: '' };
    const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info');
    if (!debugInfo) return { vendor: '', renderer: '' };
    return {
      vendor: (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) as string || '',
      renderer: (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) as string || '',
    };
  } catch {
    return { vendor: '', renderer: '' };
  }
}

async function getBattery(): Promise<{ level: number | null; charging: boolean | null }> {
  try {
    // @ts-expect-error - non-standard
    if (navigator.getBattery) {
      // @ts-expect-error
      const b = await navigator.getBattery();
      return { level: b.level, charging: b.charging };
    }
  } catch {}
  return { level: null, charging: null };
}

function getNetwork(): { type: string | null; downlink: number | null } {
  // @ts-expect-error - non-standard
  const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (!c) return { type: null, downlink: null };
  return { type: c.effectiveType || c.type || null, downlink: c.downlink ?? null };
}

export interface DeviceFingerprint {
  device_fingerprint_hash: string;
  user_agent: string;
  screen_resolution: string;
  viewport: string;
  color_depth: number;
  pixel_ratio: number;
  languages: string[];
  cpu_cores: number | null;
  device_memory_gb: number | null;
  touch_support: boolean;
  max_touch_points: number;
  cookies_enabled: boolean;
  do_not_track: boolean;
  gpu_vendor: string;
  gpu_renderer: string;
  battery_level: number | null;
  battery_charging: boolean | null;
  network_type: string | null;
  network_downlink: number | null;
  timezone: string;
}

export async function collectFingerprint(): Promise<DeviceFingerprint> {
  const gl = getWebGLInfo();
  const battery = await getBattery();
  const net = getNetwork();
  const canvas = getCanvasFingerprint();
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const seed = [
    navigator.userAgent,
    `${screen.width}x${screen.height}`,
    `${navigator.hardwareConcurrency}`,
    gl.renderer,
    canvas,
    tz,
    navigator.language,
  ].join('|');

  return {
    device_fingerprint_hash: await hashString(seed),
    user_agent: navigator.userAgent.substring(0, 500),
    screen_resolution: `${screen.width}x${screen.height}`,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    color_depth: screen.colorDepth,
    pixel_ratio: window.devicePixelRatio,
    languages: Array.from(navigator.languages || [navigator.language]),
    cpu_cores: navigator.hardwareConcurrency || null,
    // @ts-expect-error - non-standard
    device_memory_gb: navigator.deviceMemory ?? null,
    touch_support: 'ontouchstart' in window,
    max_touch_points: navigator.maxTouchPoints || 0,
    cookies_enabled: navigator.cookieEnabled,
    do_not_track: navigator.doNotTrack === '1',
    gpu_vendor: gl.vendor.substring(0, 100),
    gpu_renderer: gl.renderer.substring(0, 200),
    battery_level: battery.level,
    battery_charging: battery.charging,
    network_type: net.type,
    network_downlink: net.downlink,
    timezone: tz,
  };
}
