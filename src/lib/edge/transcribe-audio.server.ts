import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type Resp = { success: boolean; transcript?: string; error?: string; stage?: string };

const json = (status: number, body: Resp) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const ALLOWED_EXT = ['mp3', 'wav', 'm4a', 'webm', 'ogg', 'mp4', 'aac', 'flac'];
const MAX_BYTES = 25 * 1024 * 1024; // 25MB

export async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const t0 = Date.now();

  try {
    console.log('[transcribe-audio] request received');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json(401, { success: false, error: 'Unauthorized', stage: 'auth' });
    }

    const supabase = createClient(
      process.env['SUPABASE_URL']!,
      (process.env["SUPABASE_ANON_KEY"] ?? process.env["SUPABASE_PUBLISHABLE_KEY"])!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: uErr } = await supabase.auth.getUser(token);
    if (uErr || !userData?.user) {
      console.warn('[transcribe-audio] invalid user', uErr?.message);
      return json(401, { success: false, error: 'Unauthorized', stage: 'auth' });
    }

    const { data: roleRow } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userData.user.id)
      .eq('role', 'admin')
      .maybeSingle();
    if (!roleRow) {
      return json(403, { success: false, error: 'Forbidden — admin only', stage: 'auth' });
    }

    const SARVAM_API_KEY = process.env['SARVAM_API_KEY'];
    const LOVABLE_API_KEY = process.env['LOVABLE_API_KEY'];
    if (!SARVAM_API_KEY && !LOVABLE_API_KEY) {
      console.error('[transcribe-audio] no transcription provider key');
      return json(500, { success: false, error: 'Transcription service not configured', stage: 'config' });
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return json(400, { success: false, error: 'Invalid JSON body', stage: 'parse' });
    }

    const storage_path: unknown = body?.storage_path;
    if (!storage_path || typeof storage_path !== 'string' || storage_path.length > 500) {
      return json(400, { success: false, error: 'storage_path required (string)', stage: 'validate' });
    }

    const ext = storage_path.split('.').pop()?.toLowerCase() || '';
    if (!ALLOWED_EXT.includes(ext)) {
      return json(400, { success: false, error: `Unsupported audio format: .${ext}`, stage: 'validate' });
    }

    console.log('[transcribe-audio] downloading', storage_path);
    const service = createClient(process.env['SUPABASE_URL']!, process.env['SUPABASE_SERVICE_ROLE_KEY']!);
    const { data: file, error: dlErr } = await service.storage.from('personal-audio').download(storage_path);
    if (dlErr || !file) {
      console.error('[transcribe-audio] download failed', dlErr?.message);
      return json(404, { success: false, error: `Audio not found: ${dlErr?.message || 'unknown'}`, stage: 'download' });
    }

    if (file.size > MAX_BYTES) {
      return json(413, { success: false, error: `Audio too large (${(file.size / 1024 / 1024).toFixed(1)}MB, max 25MB)`, stage: 'validate' });
    }

    console.log('[transcribe-audio] file size', file.size, 'type', file.type);

    const filename = storage_path.split('/').pop() || `audio.${ext}`;

    // Duration heuristic: Sarvam ka sync endpoint ~30s tak hi leta hai.
    // Opus/webm ~3KB/s, mp3 ~16KB/s — 700KB se bada file lambi clip maan lete hain.
    const LONG_AUDIO_BYTES = 700 * 1024;
    const isLong = file.size > LONG_AUDIO_BYTES;

    type Provider = { name: string; run: () => Promise<{ transcript: string } | { status: number; error: string }> };

    const sarvam: Provider = {
      name: 'sarvam',
      run: async () => {
        const form = new FormData();
        form.append('file', file, filename);
        form.append('model', 'saarika:v2.5');
        const ctl = new AbortController();
        const tt = setTimeout(() => ctl.abort(), 90_000);
        try {
          const res = await fetch('https://api.sarvam.ai/speech-to-text', {
            method: 'POST',
            headers: { 'api-subscription-key': SARVAM_API_KEY! },
            body: form,
            signal: ctl.signal,
          });
          const result = await res.json().catch(() => ({}));
          if (!res.ok) {
            const errMsg = result?.error?.message || result?.message || result?.error || JSON.stringify(result).slice(0, 300);
            return { status: res.status, error: `Sarvam ${res.status}: ${errMsg}` };
          }
          const transcript = String(result.transcript || result.text || '').trim();
          if (!transcript) return { status: 502, error: 'Sarvam: empty transcript' };
          return { transcript };
        } finally {
          clearTimeout(tt);
        }
      },
    };

    const lovable: Provider = {
      name: 'lovable',
      run: async () => {
        const form = new FormData();
        form.append('file', file, filename);
        form.append('model', 'openai/gpt-4o-transcribe');
        const ctl = new AbortController();
        const tt = setTimeout(() => ctl.abort(), 180_000);
        try {
          const res = await fetch('https://ai.gateway.lovable.dev/v1/audio/transcriptions', {
            method: 'POST',
            headers: { Authorization: `Bearer ${LOVABLE_API_KEY!}` },
            body: form,
            signal: ctl.signal,
          });
          const raw = await res.text();
          if (!res.ok) return { status: res.status, error: `Lovable ${res.status}: ${raw.slice(0, 300)}` };
          let transcript = '';
          try {
            transcript = String(JSON.parse(raw)?.text || '').trim();
          } catch {
            transcript = raw.trim();
          }
          if (!transcript) return { status: 502, error: 'Lovable: empty transcript' };
          return { transcript };
        } finally {
          clearTimeout(tt);
        }
      },
    };

    // Lambi clip → Lovable Cloud pehle (poori file ek request me leta hai).
    // Chhoti clip → Sarvam pehle (Hinglish me best), fail par Lovable.
    const chain = (isLong ? [lovable, sarvam] : [sarvam, lovable])
      .filter((p) => (p.name === 'sarvam' ? !!SARVAM_API_KEY : !!LOVABLE_API_KEY));

    const failures: string[] = [];
    let lastStatus = 502;

    for (const provider of chain) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const out = await provider.run();
          if ('transcript' in out) {
            console.log(`[transcribe-audio] success via ${provider.name} in`, Date.now() - t0, 'ms', failures.length ? `(after ${failures.join(', ')})` : '');
            return json(200, { success: true, transcript: out.transcript });
          }
          failures.push(`${provider.name}:${out.status}`);
          lastStatus = out.status;
          console.warn(`[transcribe-audio] ${provider.name} attempt ${attempt} failed`, out.error);
          // Retry same provider only on rate-limit / transient server errors.
          if (attempt === 1 && (out.status === 429 || out.status >= 500)) {
            await new Promise((r) => setTimeout(r, 1500));
            continue;
          }
          break;
        } catch (e: any) {
          const msg = e?.message || String(e);
          failures.push(`${provider.name}:err`);
          console.warn(`[transcribe-audio] ${provider.name} attempt ${attempt} error`, msg);
          if (attempt === 1) { await new Promise((r) => setTimeout(r, 1000)); continue; }
          break;
        }
      }
    }

    const status = lastStatus === 429 ? 429 : lastStatus === 402 ? 402 : 502;
    return json(status, {
      success: false,
      error: status === 429
        ? 'Sabhi transcription providers rate-limited hain. Thodi der baad try karo.'
        : status === 402
          ? 'Transcription credits khatam (Sarvam + Lovable Cloud dono). Please top-up karo.'
          : `Transcription failed. Tried: ${failures.join(', ') || 'none'}`,
      stage: 'providers',
    });
  } catch (e: any) {
    console.error('[transcribe-audio] unhandled', e?.stack || e);
    return json(500, { success: false, error: e?.message || 'Internal error', stage: 'unhandled' });
  }
}
