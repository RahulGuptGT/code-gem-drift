// Lightweight behavior tracking: rage clicks, copy events, idle time, tab focus
type Emitter = (event: { type: string; data?: Record<string, unknown>; page_path: string }) => void;

export function startBehaviorTracking(emit: Emitter): () => void {
  const clickHistory: { x: number; y: number; t: number }[] = [];

  const onClick = (e: MouseEvent) => {
    const now = Date.now();
    clickHistory.push({ x: e.clientX, y: e.clientY, t: now });
    // keep only last 1s
    while (clickHistory.length && now - clickHistory[0].t > 1000) clickHistory.shift();
    // Rage click: 3+ clicks within 60px within 1s
    if (clickHistory.length >= 3) {
      const recent = clickHistory.slice(-3);
      const within = recent.every(c =>
        Math.abs(c.x - recent[0].x) < 60 && Math.abs(c.y - recent[0].y) < 60
      );
      if (within) {
        emit({
          type: 'rage_click',
          page_path: window.location.pathname,
          data: { x: e.clientX, y: e.clientY },
        });
        clickHistory.length = 0;
      }
    }
  };

  const onCopy = () => {
    const sel = window.getSelection()?.toString() || '';
    if (!sel.trim()) return;
    emit({
      type: 'copy',
      page_path: window.location.pathname,
      data: { text: sel.substring(0, 200) },
    });
  };

  const onVisibility = () => {
    emit({
      type: document.hidden ? 'blur' : 'focus',
      page_path: window.location.pathname,
    });
  };

  // Idle detection — fires after 60s no activity
  let idleTimer: ReturnType<typeof setTimeout> | null = null;
  const resetIdle = () => {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      emit({ type: 'idle', page_path: window.location.pathname, data: { seconds: 60 } });
    }, 60000);
  };

  document.addEventListener('click', onClick, { passive: true });
  document.addEventListener('copy', onCopy);
  document.addEventListener('visibilitychange', onVisibility);
  ['mousemove', 'keydown', 'scroll', 'touchstart'].forEach(evt =>
    document.addEventListener(evt, resetIdle, { passive: true })
  );
  resetIdle();

  return () => {
    document.removeEventListener('click', onClick);
    document.removeEventListener('copy', onCopy);
    document.removeEventListener('visibilitychange', onVisibility);
    ['mousemove', 'keydown', 'scroll', 'touchstart'].forEach(evt =>
      document.removeEventListener(evt, resetIdle)
    );
    if (idleTimer) clearTimeout(idleTimer);
  };
}
