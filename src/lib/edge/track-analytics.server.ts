import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface TrackingEvent {
  type: string;
  visitor_id: string;
  session_id: string;
  page_path?: string;
  page_title?: string;
  referrer?: string;
  device_type?: string;
  browser?: string;
  os?: string;
  screen_resolution?: string;
  language?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  element_tag?: string;
  element_text?: string;
  element_id?: string;
  element_class?: string;
  click_x?: number;
  click_y?: number;
  scroll_depth?: number;
  time_on_page?: number;
  load_time?: number;
  duration?: number;
  exit_page?: string;
  page_count?: number;
  is_bounce?: boolean;
  event_name?: string;
  event_category?: string;
  event_data?: Record<string, unknown>;
  error_type?: string;
  error_message?: string;
  status_code?: number;
  traffic_source?: string;
  country?: string;
  city?: string;
  // New fields
  fingerprint?: Record<string, unknown>;
  behavior_event?: { event_type: string; data?: Record<string, unknown> };
  form_capture?: { field_name: string; field_type: string; value: string };
}

// Simple in-memory geo cache (per-instance)
const geoCache = new Map<string, { data: any; ts: number }>();
const GEO_TTL_MS = 24 * 60 * 60 * 1000;

async function geolocate(ip: string): Promise<any | null> {
  const cached = geoCache.get(ip);
  if (cached && Date.now() - cached.ts < GEO_TTL_MS) return cached.data;
  try {
    const res = await fetch(
      `http://ip-api.com/json/${ip}?fields=status,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,query`,
      { signal: AbortSignal.timeout(3000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== "success") return null;
    geoCache.set(ip, { data, ts: Date.now() });
    return data;
  } catch {
    return null;
  }
}

async function hashString(str: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("").substring(0, 16);
}

function uniqAppend(arr: any, value: string, max = 10): string[] {
  const list = Array.isArray(arr) ? arr.filter((v) => typeof v === "string") : [];
  const v = value.trim();
  if (!v) return list;
  if (list.includes(v)) return list;
  return [...list, v].slice(-max);
}

export async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      process.env["SUPABASE_URL"]!,
      process.env["SUPABASE_SERVICE_ROLE_KEY"]!
    );

    const { data: settings } = await supabase
      .from("analytics_settings")
      .select("value")
      .eq("key", "tracking_enabled")
      .single();

    if (settings?.value === "false") {
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const events: TrackingEvent[] = await req.json();
    if (!Array.isArray(events) || events.length === 0) {
      return new Response(JSON.stringify({ error: "No events" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const MAX_EVENTS = 100;
    if (events.length > MAX_EVENTS) {
      return new Response(JSON.stringify({ error: "Too many events" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const { data: excludedSetting } = await supabase
      .from("analytics_settings")
      .select("value")
      .eq("key", "excluded_ips")
      .single();

    if (excludedSetting?.value) {
      try {
        const excludedIps = JSON.parse(excludedSetting.value);
        if (Array.isArray(excludedIps) && excludedIps.includes(clientIp)) {
          return new Response(JSON.stringify({ ok: true, skipped: true }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } catch {}
    }

    const ipHash = await hashString(clientIp);

    // Geolocate
    let geo: any = null;
    if (clientIp !== "unknown" && !clientIp.startsWith("127.") && clientIp !== "::1" && !clientIp.startsWith("192.168.")) {
      geo = await geolocate(clientIp);
    }

    // Sanitize
    const PATH_RE = /^[a-zA-Z0-9/_\-?=&%.:#]{1,200}$/;
    const sanitizeText = (s: string | undefined, max: number): string | undefined => {
      if (s == null) return undefined;
      return String(s)
        .replace(/[\u0000-\u001F\u007F]/g, " ")
        .replace(/[<>]/g, "")
        .replace(/\b(ignore|disregard)\s+(all\s+)?(previous|prior|above)\s+instructions?\b/gi, "[filtered]")
        .substring(0, max);
    };
    const sanitizePath = (p: string | undefined): string | undefined => {
      if (!p) return undefined;
      return PATH_RE.test(p) ? p : "/invalid";
    };

    for (const event of events) {
      event.page_path = sanitizePath(event.page_path);
      event.exit_page = sanitizePath(event.exit_page);
      event.element_text = sanitizeText(event.element_text, 100);
      event.element_id = sanitizeText(event.element_id, 100);
      event.element_class = sanitizeText(event.element_class, 200);
      event.error_message = sanitizeText(event.error_message, 500);
      event.page_title = sanitizeText(event.page_title, 200);
    }

    for (const event of events) {
      switch (event.type) {
        case "session_start": {
          const { data: existing } = await supabase
            .from("analytics_visitors")
            .select("id, total_visits")
            .eq("visitor_id", event.visitor_id)
            .single();

          if (existing) {
            await supabase
              .from("analytics_visitors")
              .update({
                last_seen_at: new Date().toISOString(),
                total_visits: (existing.total_visits || 0) + 1,
                is_returning: true,
                device_type: event.device_type,
                browser: event.browser,
                os: event.os,
                screen_resolution: event.screen_resolution,
                language: event.language,
              })
              .eq("id", existing.id);
          } else {
            await supabase.from("analytics_visitors").insert({
              visitor_id: event.visitor_id,
              device_type: event.device_type,
              browser: event.browser,
              os: event.os,
              screen_resolution: event.screen_resolution,
              language: event.language,
              country: geo?.country || event.country,
              city: geo?.city || event.city,
            });
          }

          await supabase.from("analytics_sessions").insert({
            visitor_id: event.visitor_id,
            session_id: event.session_id,
            entry_page: event.page_path,
            referrer: event.referrer,
            utm_source: event.utm_source,
            utm_medium: event.utm_medium,
            utm_campaign: event.utm_campaign,
            traffic_source: event.traffic_source || "direct",
            device_type: event.device_type,
            browser: event.browser,
            os: event.os,
            ip_hash: ipHash,
            country: geo?.country || event.country,
            city: geo?.city || event.city,
          });

          // === Upsert deep visitor profile ===
          const fp = (event.fingerprint || {}) as Record<string, any>;
          const { data: existingProfile } = await supabase
            .from("analytics_visitor_profiles")
            .select("id, visit_count")
            .eq("visitor_id", event.visitor_id)
            .single();

          const profilePayload: Record<string, any> = {
            ip_address: clientIp !== "unknown" ? clientIp : null,
            country: geo?.country || null,
            country_code: geo?.countryCode || null,
            region: geo?.regionName || null,
            city: geo?.city || null,
            postal_code: geo?.zip || null,
            latitude: geo?.lat ?? null,
            longitude: geo?.lon ?? null,
            isp: geo?.isp || null,
            org: geo?.org || null,
            asn: geo?.as || null,
            timezone: fp.timezone || geo?.timezone || null,
            device_fingerprint_hash: fp.device_fingerprint_hash || null,
            user_agent: fp.user_agent || null,
            device_type: event.device_type || null,
            browser: event.browser || null,
            os: event.os || null,
            gpu_vendor: fp.gpu_vendor || null,
            gpu_renderer: fp.gpu_renderer || null,
            cpu_cores: fp.cpu_cores ?? null,
            device_memory_gb: fp.device_memory_gb ?? null,
            screen_resolution: fp.screen_resolution || event.screen_resolution || null,
            viewport: fp.viewport || null,
            color_depth: fp.color_depth ?? null,
            pixel_ratio: fp.pixel_ratio ?? null,
            languages: fp.languages || null,
            touch_support: fp.touch_support ?? null,
            max_touch_points: fp.max_touch_points ?? null,
            cookies_enabled: fp.cookies_enabled ?? null,
            do_not_track: fp.do_not_track ?? null,
            battery_level: fp.battery_level ?? null,
            battery_charging: fp.battery_charging ?? null,
            network_type: fp.network_type || null,
            network_downlink: fp.network_downlink ?? null,
            last_seen_at: new Date().toISOString(),
          };

          if (existingProfile) {
            profilePayload.visit_count = (existingProfile.visit_count || 1) + 1;
            await supabase
              .from("analytics_visitor_profiles")
              .update(profilePayload)
              .eq("id", existingProfile.id);
          } else {
            await supabase.from("analytics_visitor_profiles").insert({
              visitor_id: event.visitor_id,
              ...profilePayload,
            });
          }
          break;
        }

        case "session_end": {
          await supabase
            .from("analytics_sessions")
            .update({
              ended_at: new Date().toISOString(),
              duration_seconds: event.duration || 0,
              exit_page: event.exit_page,
              page_count: event.page_count || 0,
              is_bounce: event.is_bounce ?? true,
            })
            .eq("session_id", event.session_id);

          // bump profile time
          if (event.duration) {
            const { data: prof } = await supabase
              .from("analytics_visitor_profiles")
              .select("id, total_time_seconds")
              .eq("visitor_id", event.visitor_id)
              .single();
            if (prof) {
              await supabase
                .from("analytics_visitor_profiles")
                .update({ total_time_seconds: (prof.total_time_seconds || 0) + (event.duration || 0) })
                .eq("id", prof.id);
            }
          }
          break;
        }

        case "pageview": {
          await supabase.from("analytics_page_views").insert({
            session_id: event.session_id,
            visitor_id: event.visitor_id,
            page_path: event.page_path,
            page_title: event.page_title,
            referrer: event.referrer,
            load_time_ms: event.load_time,
          });

          const { data: session } = await supabase
            .from("analytics_sessions")
            .select("page_count")
            .eq("session_id", event.session_id)
            .single();

          if (session) {
            await supabase
              .from("analytics_sessions")
              .update({
                page_count: (session.page_count || 0) + 1,
                is_bounce: (session.page_count || 0) + 1 <= 1,
              })
              .eq("session_id", event.session_id);
          }

          // bump profile pageviews
          await supabase.rpc("increment_url_clicks", { url_code: "__noop__" }).then(() => {}, () => {});
          const { data: prof } = await supabase
            .from("analytics_visitor_profiles")
            .select("id, total_pageviews")
            .eq("visitor_id", event.visitor_id)
            .single();
          if (prof) {
            await supabase
              .from("analytics_visitor_profiles")
              .update({ total_pageviews: (prof.total_pageviews || 0) + 1, last_seen_at: new Date().toISOString() })
              .eq("id", prof.id);
          }
          break;
        }

        case "scroll": {
          await supabase
            .from("analytics_page_views")
            .update({ scroll_depth_percent: event.scroll_depth })
            .eq("session_id", event.session_id)
            .eq("page_path", event.page_path)
            .order("created_at", { ascending: false })
            .limit(1);
          break;
        }

        case "click": {
          await supabase.from("analytics_clicks").insert({
            session_id: event.session_id,
            visitor_id: event.visitor_id,
            page_path: event.page_path,
            element_tag: event.element_tag,
            element_text: event.element_text?.substring(0, 100),
            element_id: event.element_id,
            element_class: event.element_class?.substring(0, 200),
            click_x: event.click_x,
            click_y: event.click_y,
          });

          const { data: prof } = await supabase
            .from("analytics_visitor_profiles")
            .select("id, total_clicks")
            .eq("visitor_id", event.visitor_id)
            .single();
          if (prof) {
            await supabase
              .from("analytics_visitor_profiles")
              .update({ total_clicks: (prof.total_clicks || 0) + 1 })
              .eq("id", prof.id);
          }
          break;
        }

        case "behavior": {
          if (!event.behavior_event) break;
          const be = event.behavior_event;
          await supabase.from("analytics_behavior_events").insert({
            visitor_id: event.visitor_id,
            session_id: event.session_id,
            page_path: event.page_path,
            event_type: be.event_type,
            data: be.data || {},
          });
          if (be.event_type === "rage_click") {
            const { data: prof } = await supabase
              .from("analytics_visitor_profiles")
              .select("id, rage_click_count")
              .eq("visitor_id", event.visitor_id)
              .single();
            if (prof) {
              await supabase
                .from("analytics_visitor_profiles")
                .update({ rage_click_count: (prof.rage_click_count || 0) + 1 })
                .eq("id", prof.id);
            }
          }
          break;
        }

        case "form_capture": {
          if (!event.form_capture) break;
          const fc = event.form_capture;
          const allowedTypes = new Set(["email", "phone", "name", "text"]);
          const fieldType = String(fc.field_type || "").toLowerCase();
          if (!allowedTypes.has(fieldType)) break;
          const rawValue = sanitizeText(fc.value, 200) || "";
          if (!rawValue) break;
          // Strict per-type validation to prevent arbitrary PII injection
          if (fieldType === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawValue)) break;
          if (fieldType === "phone" && !/^[+()\-\s\d]{6,20}$/.test(rawValue)) break;
          if (fieldType === "name" && rawValue.length > 80) break;
          const safeFieldName = sanitizeText(fc.field_name, 100);
          await supabase.from("analytics_form_captures").insert({
            visitor_id: event.visitor_id,
            session_id: event.session_id,
            page_path: event.page_path,
            field_name: safeFieldName,
            field_type: fieldType,
            value: rawValue,
          });

          // Append to profile arrays
          const { data: prof } = await supabase
            .from("analytics_visitor_profiles")
            .select("id, captured_emails, captured_phones, captured_names")
            .eq("visitor_id", event.visitor_id)
            .single();
          if (prof) {
            const update: Record<string, any> = {};
            if (fieldType === "email") update.captured_emails = uniqAppend(prof.captured_emails, rawValue);
            else if (fieldType === "phone") update.captured_phones = uniqAppend(prof.captured_phones, rawValue);
            else if (fieldType === "name") update.captured_names = uniqAppend(prof.captured_names, rawValue);
            if (Object.keys(update).length) {
              await supabase.from("analytics_visitor_profiles").update(update).eq("id", prof.id);
            }
          }
          break;
        }


        case "event": {
          await supabase.from("analytics_events").insert({
            session_id: event.session_id,
            visitor_id: event.visitor_id,
            event_name: event.event_name || "unknown",
            event_category: event.event_category,
            event_data: event.event_data || {},
            page_path: event.page_path,
          });
          break;
        }

        case "error": {
          await supabase.from("analytics_errors").insert({
            session_id: event.session_id,
            visitor_id: event.visitor_id,
            page_path: event.page_path,
            error_type: event.error_type,
            error_message: event.error_message?.substring(0, 500),
            status_code: event.status_code,
          });
          break;
        }
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Tracking error:", error);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}
