import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

type RecState = 'idle' | 'recording' | 'transcribing';

const MIME_TO_EXT: Record<string, string> = {
  'audio/webm': 'webm',
  'audio/mp4': 'mp4',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/ogg': 'ogg',
  'audio/aac': 'aac',
};

/** Sarvam sync speech-to-text ~30s cap → har segment 25s ka rakhte hain. */
const SEGMENT_MS = 25_000;
/** Hard cap: 60 minutes. */
export const MAX_RECORD_SECONDS = 60 * 60;
const MAX_PARALLEL = 3;

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/mpeg'];
  for (const t of candidates) {
    // @ts-ignore
    if (MediaRecorder.isTypeSupported?.(t)) return t;
  }
  return undefined;
}

const log = (...args: any[]) => console.info('[wsai-voice]', ...args);

export interface UseVoiceRecorder {
  state: RecState;
  seconds: number;
  maxSeconds: number;
  /** Kitne segment abhi transcribe ho rahe hain (UI hint). */
  pending: number;
  start: () => Promise<void>;
  stop: () => void;
  cancel: () => void;
  analyserRef: React.MutableRefObject<AnalyserNode | null>;
}

interface SegJob {
  index: number;
  text: string | null;
  failed: boolean;
}

export function useVoiceRecorder(onTranscript: (text: string) => void): UseVoiceRecorder {
  const [state, setState] = useState<RecState>('idle');
  const [seconds, setSeconds] = useState(0);
  const [pending, setPending] = useState(0);

  const recRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const segTimerRef = useRef<number | null>(null);
  const cancelledRef = useRef(false);
  const stoppingRef = useRef(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const mimeRef = useRef<string | undefined>(undefined);
  const segIndexRef = useRef(0);
  const jobsRef = useRef<SegJob[]>([]);
  const promisesRef = useRef<Promise<void>[]>([]);
  const activeRef = useRef(0);
  const queueRef = useRef<Array<() => void>>([]);

  const teardownMedia = useCallback(() => {
    if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null; }
    if (segTimerRef.current) { window.clearTimeout(segTimerRef.current); segTimerRef.current = null; }
    try { sourceRef.current?.disconnect(); } catch {}
    try { analyserRef.current?.disconnect(); } catch {}
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close().catch(() => {});
    }
    sourceRef.current = null;
    analyserRef.current = null;
    audioCtxRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recRef.current = null;
  }, []);

  useEffect(() => () => { cancelledRef.current = true; teardownMedia(); }, [teardownMedia]);

  const transcribeBlob = useCallback(async (blob: Blob, type: string): Promise<string> => {
    const baseType = type.split(';')[0];
    const ext = MIME_TO_EXT[baseType] || 'webm';
    const rand = Math.random().toString(36).slice(2, 8);
    const path = `wsai-voice/${Date.now()}-${rand}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from('personal-audio')
      .upload(path, blob, { contentType: type });
    if (upErr) throw new Error('Upload: ' + upErr.message);
    try {
      const { data, error } = await supabase.functions.invoke('transcribe-audio', {
        body: { storage_path: path },
      });
      if (error) throw new Error('Transcribe: ' + error.message);
      const transcript: string = data?.transcript?.trim?.() || '';
      if (!transcript && data?.error) throw new Error(data.error);
      return transcript;
    } finally {
      supabase.storage.from('personal-audio').remove([path]).catch(() => {});
    }
  }, []);

  /** Limited-concurrency runner. */
  const runLimited = useCallback((fn: () => Promise<void>) => {
    const p = new Promise<void>((resolve) => {
      const exec = () => {
        activeRef.current += 1;
        fn().finally(() => {
          activeRef.current -= 1;
          const next = queueRef.current.shift();
          if (next) next();
          resolve();
        });
      };
      if (activeRef.current < MAX_PARALLEL) exec();
      else queueRef.current.push(exec);
    });
    promisesRef.current.push(p);
    return p;
  }, []);

  const queueSegment = useCallback((blob: Blob, type: string, index: number) => {
    const job: SegJob = { index, text: null, failed: false };
    jobsRef.current.push(job);
    setPending((n) => n + 1);
    runLimited(async () => {
      try {
        job.text = await transcribeBlob(blob, type);
      } catch (e: any) {
        log('segment failed, retrying', index, e?.message);
        try {
          job.text = await transcribeBlob(blob, type);
        } catch (e2: any) {
          log('segment failed twice', index, e2?.message);
          job.failed = true;
        }
      } finally {
        setPending((n) => Math.max(0, n - 1));
      }
    });
  }, [runLimited, transcribeBlob]);

  /** Ek self-contained segment record karta hai; stop hone par next segment shuru. */
  const startSegment = useCallback(() => {
    const stream = streamRef.current;
    if (!stream || cancelledRef.current || stoppingRef.current) return;
    const mimeType = mimeRef.current;
    let rec: MediaRecorder;
    try {
      rec = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    } catch (e: any) {
      log('MediaRecorder init failed', e?.message);
      return;
    }
    const chunks: Blob[] = [];
    const index = segIndexRef.current++;
    rec.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunks.push(e.data); };
    rec.onstop = () => {
      const type = rec.mimeType || mimeType || 'audio/webm';
      const blob = new Blob(chunks, { type });
      log('segment stopped', { index, size: blob.size });
      if (!cancelledRef.current && blob.size >= 1200) queueSegment(blob, type, index);
      if (!cancelledRef.current && !stoppingRef.current) startSegment();
    };
    recRef.current = rec;
    rec.start();
    segTimerRef.current = window.setTimeout(() => {
      if (recRef.current === rec && rec.state !== 'inactive') rec.stop();
    }, SEGMENT_MS);
  }, [queueSegment]);

  const finish = useCallback(async () => {
    setState('transcribing');
    try {
      await Promise.all(promisesRef.current);
    } catch {}
    const jobs = [...jobsRef.current].sort((a, b) => a.index - b.index);
    const anyFailed = jobs.some((j) => j.failed);
    const text = jobs
      .map((j) => (j.failed ? '[…]' : (j.text || '')))
      .filter((t) => t.length > 0)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    jobsRef.current = [];
    promisesRef.current = [];
    setPending(0);
    setState('idle');
    if (!text) {
      toast.error('Koi transcript nahi mila. Firse try karo.');
      return;
    }
    if (anyFailed) toast.warning('Kuch hisse transcribe nahi ho paaye — wahan […] laga hai.');
    onTranscript(text);
  }, [onTranscript]);

  const start = useCallback(async () => {
    if (state !== 'idle') return;
    cancelledRef.current = false;
    stoppingRef.current = false;
    segIndexRef.current = 0;
    jobsRef.current = [];
    promisesRef.current = [];
    queueRef.current = [];
    activeRef.current = 0;
    setPending(0);

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e: any) {
      log('getUserMedia denied', e?.message);
      toast.error('Mic access denied. Browser permission dena hoga.');
      return;
    }
    streamRef.current = stream;

    try {
      const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
      const ctx = new Ctx();
      if (ctx.state === 'suspended') { try { await ctx.resume(); } catch {} }
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.7;
      source.connect(analyser);
      audioCtxRef.current = ctx;
      sourceRef.current = source;
      analyserRef.current = analyser;
    } catch (e: any) {
      log('analyser setup failed (non-fatal)', e?.message);
    }

    if (typeof MediaRecorder === 'undefined') {
      teardownMedia();
      toast.error('Recording not supported in this browser.');
      return;
    }
    mimeRef.current = pickMimeType();

    setState('recording');
    setSeconds(0);
    timerRef.current = window.setInterval(() => {
      setSeconds((s) => {
        const next = s + 1;
        if (next >= MAX_RECORD_SECONDS) {
          // auto-stop at hard cap
          window.setTimeout(() => stopRef.current?.(), 0);
        }
        return next;
      });
    }, 1000);
    startSegment();
    log('recording started (segmented)', { mimeType: mimeRef.current });
  }, [state, startSegment, teardownMedia]);

  const stopRef = useRef<(() => void) | null>(null);

  const stop = useCallback(() => {
    if (stoppingRef.current || state !== 'recording') return;
    stoppingRef.current = true;
    cancelledRef.current = false;
    if (segTimerRef.current) { window.clearTimeout(segTimerRef.current); segTimerRef.current = null; }
    const rec = recRef.current;
    if (rec && rec.state !== 'inactive') rec.stop();
    // rec.onstop queues the last segment synchronously before we await
    window.setTimeout(() => {
      teardownMedia();
      setSeconds(0);
      void finish();
    }, 120);
  }, [state, teardownMedia, finish]);

  stopRef.current = stop;

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    stoppingRef.current = true;
    const rec = recRef.current;
    if (rec && rec.state !== 'inactive') { try { rec.stop(); } catch {} }
    teardownMedia();
    jobsRef.current = [];
    promisesRef.current = [];
    queueRef.current = [];
    setPending(0);
    setSeconds(0);
    setState('idle');
  }, [teardownMedia]);

  return { state, seconds, maxSeconds: MAX_RECORD_SECONDS, pending, start, stop, cancel, analyserRef };
}
