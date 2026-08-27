import { createClient } from "@supabase/supabase-js";
import { corsHeaders } from "./_shared/cors";

interface Body {
  event_type: 'login' | 'logout' | 'refresh';
  user_agent?: string;
}


function parseUA(ua: string): { browser: string; os: string; device_label: string } {
  let browser = 'Unknown';
  let os = 'Unknown';
  if (/Edg\//.test(ua)) browser = 'Edge';
  else if (/Chrome\//.test(ua)) browser = 'Chrome';
  else if (/Firefox\//.test(ua)) browser = 'Firefox';
  else if (/Safari\//.test(ua)) browser = 'Safari';
  else if (/OPR\//.test(ua)) browser = 'Opera';

  if (/Windows NT/.test(ua)) os = 'Windows';
  else if (/Android/.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iPod/.test(ua)) os = 'iOS';
  else if (/Mac OS X/.test(ua)) os = 'macOS';
  else if (/Linux/.test(ua)) os = 'Linux';

  return { browser, os, device_label: `${browser} on ${os}` };
}

async function fetchGeo(ip: string): Promise<{ city?: string; region?: string; country?: string }> {
  if (!ip || ip === 'unknown' || ip.startsWith('127.') || ip.startsWith('10.') || ip === '::1') return {};
  try {
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,regionName,city`, {
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) return {};
    const j = await res.json();
    if (j.status !== 'success') return {};
    return { city: j.city, region: j.regionName, country: j.country };
  } catch { return {}; }
}

export async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const auth = req.headers.get('Authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
    if (!token) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const authClient = createClient(
      process.env['SUPABASE_URL']!,
      (process.env["SUPABASE_ANON_KEY"] ?? process.env["SUPABASE_PUBLISHABLE_KEY"])!,
      { global: { headers: { Authorization: `Bearer ${token}` } } },
    );
    const { data: userData, error: userErr } = await authClient.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const user_id = userData.user.id;

    let body: Body;
    try { body = await req.json(); } catch {
      return new Response(JSON.stringify({ error: 'invalid json' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!['login','logout','refresh'].includes(body.event_type)) {
      return new Response(JSON.stringify({ error: 'invalid event_type' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const ip = (req.headers.get('cf-connecting-ip')
      || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip')
      || 'unknown');
    const ua = (body.user_agent || req.headers.get('user-agent') || '').slice(0, 500);
    const { browser, os, device_label } = parseUA(ua);
    const geo = await fetchGeo(ip);

    const supabase = createClient(
      process.env['SUPABASE_URL']!,
      process.env['SUPABASE_SERVICE_ROLE_KEY']!,
    );

    const { error } = await supabase.from('personal_login_events').insert({
      user_id,
      event_type: body.event_type,
      ip_address: ip,
      user_agent: ua,
      device_label,
      browser,
      os,
      city: geo.city ?? null,
      region: geo.region ?? null,
      country: geo.country ?? null,
      session_fingerprint: token ? token.slice(-16) : null,
    });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}
