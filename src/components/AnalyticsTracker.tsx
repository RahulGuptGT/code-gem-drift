import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { collectFingerprint } from '@/lib/analytics/fingerprint';
import { startBehaviorTracking } from '@/lib/analytics/behaviorTracker';
import { startFormCapture } from '@/lib/analytics/formCapture';

const SUPABASE_URL = "https://ehbungchpezbznxyfqic.supabase.co";
const TRACK_ENDPOINT = `${SUPABASE_URL}/functions/v1/track-analytics`;

// Generate a persistent visitor ID
function getVisitorId(): string {
  let id = localStorage.getItem('_vid');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('_vid', id);
  }
  return id;
}

// Generate a session ID (new each tab/session)
function getSessionId(): string {
  let id = sessionStorage.getItem('_sid');
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem('_sid', id);
  }
  return id;
}

function getDeviceType(): string {
  const ua = navigator.userAgent;
  if (/tablet|ipad/i.test(ua)) return 'tablet';
  if (/mobile|android|iphone/i.test(ua)) return 'mobile';
  return 'desktop';
}

function getBrowser(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Edg')) return 'Edge';
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Safari')) return 'Safari';
  if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera';
  return 'Other';
}

function getOS(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Windows')) return 'Windows';
  if (ua.includes('Mac')) return 'macOS';
  if (ua.includes('Linux')) return 'Linux';
  if (ua.includes('Android')) return 'Android';
  if (/iPhone|iPad/.test(ua)) return 'iOS';
  return 'Other';
}

function getTrafficSource(referrer: string): string {
  if (!referrer) return 'direct';
  const url = new URL(referrer);
  const host = url.hostname.toLowerCase();
  if (/google|bing|yahoo|duckduckgo|baidu/.test(host)) return 'search';
  if (/facebook|twitter|instagram|linkedin|youtube|tiktok|reddit/.test(host)) return 'social';
  return 'referral';
}

function getUTMParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get('utm_source') || undefined,
    utm_medium: params.get('utm_medium') || undefined,
    utm_campaign: params.get('utm_campaign') || undefined,
  };
}

// Queue events and send in batches
let eventQueue: any[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function queueEvent(event: any) {
  eventQueue.push(event);
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(flushEvents, 2000);
}

function flushEvents() {
  if (eventQueue.length === 0) return;
  const events = [...eventQueue];
  eventQueue = [];
  
  // Use sendBeacon for reliability (works even on page unload)
  const blob = new Blob([JSON.stringify(events)], { type: 'application/json' });
  const sent = navigator.sendBeacon(TRACK_ENDPOINT, blob);
  
  if (!sent) {
    // Fallback to fetch
    fetch(TRACK_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(events),
      keepalive: true,
    }).catch(() => {});
  }
}

export default function AnalyticsTracker() {
  const location = useLocation();
  const visitorId = useRef(getVisitorId());
  const sessionId = useRef(getSessionId());
  const sessionStarted = useRef(false);
  const pageCount = useRef(0);
  const sessionStart = useRef(Date.now());
  const lastPage = useRef('');
  const maxScrollDepth = useRef(0);

  const baseEvent = useCallback(() => ({
    visitor_id: visitorId.current,
    session_id: sessionId.current,
  }), []);

  // Start session on mount
  useEffect(() => {
    if (sessionStarted.current) return;
    sessionStarted.current = true;
    sessionStart.current = Date.now();

    const utm = getUTMParams();
    const referrer = document.referrer;

    collectFingerprint().then((fp) => {
      queueEvent({
        ...baseEvent(),
        type: 'session_start',
        page_path: window.location.pathname,
        referrer,
        device_type: getDeviceType(),
        browser: getBrowser(),
        os: getOS(),
        screen_resolution: `${screen.width}x${screen.height}`,
        language: navigator.language,
        traffic_source: utm.utm_source ? 'campaign' : getTrafficSource(referrer),
        ...utm,
        fingerprint: fp,
      });
    }).catch(() => {});

    const stopBehavior = startBehaviorTracking((evt) => {
      queueEvent({
        ...baseEvent(),
        type: 'behavior',
        page_path: evt.page_path,
        behavior_event: { event_type: evt.type, data: evt.data },
      });
    });

    const stopForm = startFormCapture((evt) => {
      queueEvent({
        ...baseEvent(),
        type: 'form_capture',
        page_path: evt.page_path,
        form_capture: {
          field_name: evt.field_name,
          field_type: evt.field_type,
          value: evt.value,
        },
      });
    });

    // End session on unload
    const handleUnload = () => {
      const duration = Math.round((Date.now() - sessionStart.current) / 1000);
      const events = [{
        ...baseEvent(),
        type: 'session_end',
        duration,
        exit_page: lastPage.current || window.location.pathname,
        page_count: pageCount.current,
        is_bounce: pageCount.current <= 1,
      }];

      const blob = new Blob([JSON.stringify(events)], { type: 'application/json' });
      navigator.sendBeacon(TRACK_ENDPOINT, blob);
    };

    window.addEventListener('beforeunload', handleUnload);

    // Track clicks
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;
      
      // Only track meaningful clicks (buttons, links, interactive elements)
      const clickable = target.closest('a, button, [role="button"], input[type="submit"]');
      if (!clickable) return;

      queueEvent({
        ...baseEvent(),
        type: 'click',
        page_path: window.location.pathname,
        element_tag: clickable.tagName.toLowerCase(),
        element_text: (clickable as HTMLElement).textContent?.trim().substring(0, 100),
        element_id: clickable.id || undefined,
        element_class: clickable.className?.toString().substring(0, 200) || undefined,
        click_x: e.clientX,
        click_y: e.clientY,
      });
    };

    document.addEventListener('click', handleClick, { passive: true });

    // Track scroll depth
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight > 0) {
        const depth = Math.round((scrollTop / docHeight) * 100);
        if (depth > maxScrollDepth.current) {
          maxScrollDepth.current = depth;
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    // Send scroll depth periodically
    const scrollInterval = setInterval(() => {
      if (maxScrollDepth.current > 0) {
        queueEvent({
          ...baseEvent(),
          type: 'scroll',
          page_path: window.location.pathname,
          scroll_depth: maxScrollDepth.current,
        });
      }
    }, 15000);

    // Track JS errors
    const handleError = (e: ErrorEvent) => {
      queueEvent({
        ...baseEvent(),
        type: 'error',
        page_path: window.location.pathname,
        error_type: 'javascript',
        error_message: e.message,
      });
    };

    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      document.removeEventListener('click', handleClick);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('error', handleError);
      clearInterval(scrollInterval);
      stopBehavior();
      stopForm();
      flushEvents();
    };
  }, [baseEvent]);

  // Track page views on route change
  useEffect(() => {
    const pagePath = location.pathname;
    if (pagePath === lastPage.current) return;
    lastPage.current = pagePath;
    pageCount.current += 1;
    maxScrollDepth.current = 0;

    // Measure page load time
    const loadTime = performance.now();

    queueEvent({
      ...baseEvent(),
      type: 'pageview',
      page_path: pagePath,
      page_title: document.title,
      referrer: document.referrer,
      load_time: Math.round(loadTime),
    });
  }, [location.pathname, baseEvent]);

  return null;
}
