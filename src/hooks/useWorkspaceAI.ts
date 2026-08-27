import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { syncCachesForTool } from '@/lib/dkCacheSync';
import { toast } from 'sonner';
import { safeStorage } from '@/lib/safeStorage';

const FN_URL = '/api/public/workspace-ai-chat';

const AUTO_APPROVE_KEY = 'wsai:auto-approve';
const MODEL_KEY = 'wsai:model';

export type WSAIModel = 'fast' | 'deep' | 'lite';

function readModel(): WSAIModel {
  if (typeof window === 'undefined') return 'fast';
  try {
    const v = safeStorage.get(MODEL_KEY);
    return v === 'deep' || v === 'lite' ? v : 'fast';
  } catch { return 'fast'; }
}

function readAutoApprove(): boolean {
  if (typeof window === 'undefined') return false;
  try { return safeStorage.get(AUTO_APPROVE_KEY) === '1'; } catch { return false; }
}


export interface WSAIThread {
  id: string;
  title: string;
  pinned: boolean;
  archived: boolean;
  folder_id: string | null;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface WSAIFolder {
  id: string;
  name: string;
  sort_order: number;
  created_at: string;
  emoji?: string | null;
  color?: string | null;
}


export interface WSAIMessagePart {
  type: 'text' | 'tool_calls' | 'tool_result';
  text?: string;
  tool_calls?: { id: string; name: string; args: any; provider_call?: any }[];
  tool_call_id?: string;
  name?: string;
  status?: string;
  result?: any;
}

export interface WSAIMessage {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  parts: WSAIMessagePart[];
  metadata: any;
  created_at: string;
}

export interface WSAIProposal {
  toolCallId: string;
  name: string;
  args: any;
  summary: string;
}

export interface WSAIActivity {
  toolCallId: string;
  name: string;
  args?: any;
  result?: any;
  status: 'running' | 'done';
  durationMs?: number;
  startedAt?: number;
}

export type WSAIUsage = { prompt_tokens: number; completion_tokens: number; total_tokens: number; steps: number; model?: string };

/** Bulk progress for a single turn that fires many tool calls. */
export type WSAIBatch = { done: number; total: number; complete?: boolean };

export type MemoryEvent = { action: 'saved' | 'forgot'; kind?: string; content?: string; at: number };

export type Attachment = { url: string; name: string; kind: 'image' | 'pdf' | 'csv' | 'zip' | 'text' | 'file'; mime?: string };
export type ContextRef = { type: 'note' | 'todo' | 'dk_account' | 'dk_release' | 'dk_withdrawal'; id: string; label?: string };

export function useWorkspaceAI(activeThreadId: string | null) {
  const qc = useQueryClient();
  const [threads, setThreads] = useState<WSAIThread[]>([]);
  const [trashed, setTrashed] = useState<WSAIThread[]>([]);
  const [folders, setFolders] = useState<WSAIFolder[]>([]);
  const [messages, setMessages] = useState<WSAIMessage[]>([]);
  const [proposals, setProposals] = useState<WSAIProposal[]>([]);
  const [activities, setActivities] = useState<WSAIActivity[]>([]);
  const [streamingText, setStreamingText] = useState('');
  const [phase, setPhase] = useState<'idle' | 'thinking' | 'writing'>('idle');
  const [isSending, setIsSending] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [streamErrorQuota, setStreamErrorQuota] = useState(false);
  const [streamNotice, setStreamNotice] = useState<string | null>(null);
  const [memoryEvent, setMemoryEvent] = useState<MemoryEvent | null>(null);
  const [lastUsage, setLastUsage] = useState<WSAIUsage | null>(null);
  const [threadId, setThreadIdInternal] = useState<string | null>(activeThreadId);
  const [autoApprove, setAutoApproveState] = useState<boolean>(readAutoApprove);
  const [model, setModelState] = useState<WSAIModel>(readModel);
  const [batch, setBatch] = useState<WSAIBatch | null>(null);


  const abortRef = useRef<AbortController | null>(null);
  const runRef = useRef(0);
  // Latest loadMessages call ka token — late responses ko discard karne ke liye.
  const loadTokenRef = useRef(0);


  const loadThreads = useCallback(async () => {
    const { data } = await supabase
      .from('workspace_ai_threads')
      .select('*')
      .eq('archived', false)
      .order('pinned', { ascending: false })
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });
    setThreads((data as any) || []);
  }, []);

  const loadTrash = useCallback(async () => {
    const { data } = await supabase
      .from('workspace_ai_threads')
      .select('*')
      .eq('archived', true)
      .order('updated_at', { ascending: false });
    setTrashed((data as any) || []);
  }, []);

  const loadFolders = useCallback(async () => {
    const { data } = await supabase
      .from('workspace_ai_folders')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    setFolders((data as any) || []);
  }, []);


  const loadMessages = useCallback(async (tid: string | null) => {
    // Thread jaldi-jaldi switch hone par purani query late aa kar nayi thread ke
    // messages replace kar deti thi — token se sirf latest load hi apply hota hai.
    const token = ++loadTokenRef.current;
    if (!tid) { setMessages([]); setProposals([]); return; }
    const { data, error } = await supabase
      .from('workspace_ai_messages')
      .select('id, role, parts, metadata, created_at')
      .eq('thread_id', tid)
      .order('created_at', { ascending: true });
    if (token !== loadTokenRef.current) return;
    if (error) { toast.error('Messages load nahi hue: ' + error.message); return; }
    setMessages((data as any) || []);
    const rows = (data as any[]) || [];
    const results = new Set<string>();
    for (const r of rows) {
      if (r.role === 'tool') {
        for (const p of (r.parts || [])) if (p?.tool_call_id) results.add(p.tool_call_id);
      }
    }
    const pending: WSAIProposal[] = [];
    for (let i = rows.length - 1; i >= 0; i--) {
      const r = rows[i];
      if (r.role !== 'assistant') continue;
      const tcPart = (r.parts || []).find((p: any) => p?.type === 'tool_calls');
      if (!tcPart) continue;
      for (const tc of tcPart.tool_calls || []) {
        if (!results.has(tc.id)) {
          pending.push({ toolCallId: tc.id, name: tc.name, args: tc.args, summary: summarize(tc.name, tc.args) });
        }
      }
      break;
    }
    setProposals(pending);
  }, []);


  useEffect(() => { loadThreads(); loadFolders(); loadTrash(); }, [loadThreads, loadFolders, loadTrash]);
  useEffect(() => { loadMessages(threadId); }, [threadId, loadMessages]);
  useEffect(() => { setThreadIdInternal(activeThreadId); }, [activeThreadId]);

  useEffect(() => {
    const ch = supabase.channel(`wsai-threads-${Math.random().toString(36).slice(2, 8)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workspace_ai_threads' }, () => { loadThreads(); loadTrash(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workspace_ai_folders' }, loadFolders)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [loadThreads, loadFolders, loadTrash]);


  const stream = useCallback(async (body: any): Promise<boolean | void> => {
    const runId = ++runRef.current;
    setIsSending(true);
    setStreamError(null);
    setStreamErrorQuota(false);
    setStreamNotice(null);

    setStreamingText('');
    setActivities([]);
    setLastUsage(null);
    setBatch(null);
    setPhase('thinking');
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    let failed = false;
    // Hoisted so a broken stream can still salvage whatever text already arrived.
    let acc = '';
    let newThreadId: string | null = null;
    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      const res = await fetch(FN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) {
        await res.text().catch(() => '');
        throw new Error(res.status === 401 || res.status === 403
          ? 'Session expire ho gayi hai. Dobara sign in karein.'
          : 'Workspace AI server se connect nahi ho paaya. Dobara try karein.');
      }

      reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      let terminalDone = false;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (runRef.current !== runId) return;
        buf += dec.decode(value, { stream: true });
        // Robust SSE framing: handle \n\n and \r\n\r\n, multi-line data fields, comments.
        const events = buf.split(/\r?\n\r?\n/);
        buf = events.pop() || '';
        for (const ev of events) {
          const dataLines = ev
            .split(/\r?\n/)
            .map((l) => l.trimStart())
            .filter((l) => l.startsWith('data:'))
            .map((l) => l.slice(5).trim());
          if (!dataLines.length) continue;
          const payload = dataLines.join('\n').trim();
          if (!payload || payload === '[DONE]') continue;
          let obj: any;
          try {
            obj = JSON.parse(payload);
          } catch (e) {
            console.warn('parse SSE fail', e, payload.slice(0, 200));
            continue;
          }

          if (runRef.current !== runId) return;
          if (obj.type === 'thread') {
            newThreadId = obj.threadId;
            if (obj.threadId !== threadId) setThreadIdInternal(obj.threadId);
          } else if (obj.type === 'phase') {
            setPhase(obj.phase);
          } else if (obj.type === 'title') {
            setThreads((ts) => ts.map((x) => x.id === obj.threadId ? { ...x, title: obj.title } : x));
          } else if (obj.type === 'delta') {
            acc += obj.text;
            setStreamingText(acc);
          } else if (obj.type === 'tool_start') {
            setActivities((a) => [...a, { toolCallId: obj.toolCallId, name: obj.name, args: obj.args, status: 'running', startedAt: Date.now() }]);
          } else if (obj.type === 'tool_result') {
            setActivities((a) => a.map((x) => x.toolCallId === obj.toolCallId ? { ...x, result: obj.result, status: 'done', durationMs: obj.durationMs ?? (x.startedAt ? Date.now() - x.startedAt : undefined) } : x));
            syncCachesForTool(qc, obj.name);
          } else if (obj.type === 'proposal') {
            setProposals((p) => [...p, { toolCallId: obj.toolCallId, name: obj.name, args: obj.args, summary: obj.summary }]);
          } else if (obj.type === 'batch') {
            setBatch({ done: obj.done || 0, total: obj.total || 0, complete: !!obj.complete });
          } else if (obj.type === 'usage') {
            setLastUsage(obj.usage || null);
          } else if (obj.type === 'notice') {
            setStreamNotice(obj.message || null);
            if (obj.message) toast.info(obj.message);
          } else if (obj.type === 'memory') {
            setMemoryEvent({ action: obj.action, kind: obj.kind, content: obj.content, at: Date.now() });
          } else if (obj.type === 'done') {
            terminalDone = true;
            const tid = newThreadId || threadId;
            if (tid) await loadMessages(tid);
            await loadThreads();
          } else if (obj.type === 'error') {
            const err: any = new Error(obj.message || 'Agent error');
            err.quota = !!obj.quota;
            throw err;
          }
        }
      }
      if (!terminalDone) throw new Error('Reply beech mein ruk gaya. Dobara try karein.');
      return true;
    } catch (e: any) {
      if (e.name !== 'AbortError' && runRef.current === runId) {
        failed = true;
        const message = e.message || 'Chat failed';
        setStreamError(message);
        setStreamErrorQuota(!!e.quota);
        toast.error(message);
        // Salvage: stream toot gaya to jo reply aa chuki thi wo bhi save karo,
        // warna user ka kaam bina nishaan gayab ho jata hai.
        const tid = newThreadId || threadId;
        if (acc.trim() && tid) {
          try {
            const { data: sess2 } = await supabase.auth.getSession();
            const uid = sess2.session?.user?.id;
            if (uid) {
              await supabase.from('workspace_ai_messages').insert({
                thread_id: tid, user_id: uid, role: 'assistant',
                parts: [{ type: 'text', text: `${acc}\n\n_(adhoora — stream toot gaya)_` }],
                metadata: { interrupted: true, error: message },
              } as any);
              await loadMessages(tid);
            }
          } catch { /* salvage best-effort */ }
        }
      }
      return false;
    } finally {
      try { await reader?.cancel(); } catch { /* already closed */ }
      try { reader?.releaseLock(); } catch { /* already released */ }
      if (runRef.current === runId) {
        setIsSending(false);
        setStreamingText('');
        setPhase('idle');
        setBatch(null);
        if (!failed) setActivities([]);
      }
    }
  }, [threadId, loadMessages, loadThreads]);


  // ---- Auto-approve (AI reasoning approval) -------------------------------
  // When ON, the edge function executes write tools inline (no approval card),
  // so a single turn can complete large batches.
  const autoApproveRef = useRef(autoApprove);
  useEffect(() => { autoApproveRef.current = autoApprove; }, [autoApprove]);
  const modelRef = useRef(model);
  useEffect(() => { modelRef.current = model; }, [model]);

  const setModel = useCallback((m: WSAIModel) => {
    setModelState(m);
    try { safeStorage.set(MODEL_KEY, m); } catch {}
  }, []);

  const send = useCallback(async (message: string, opts?: { attachments?: Attachment[]; contextRefs?: ContextRef[]; mode?: 'auto' | 'viewer' | 'editor'; folderId?: string | null }): Promise<boolean> => {
    if (!message.trim() && !(opts?.attachments?.length)) return false;
    const ok = await stream({
      threadId,
      message,
      attachments: opts?.attachments || [],
      contextRefs: opts?.contextRefs || [],
      mode: opts?.mode,
      folderId: opts?.folderId || null,
      autoApprove: autoApproveRef.current,
      model: modelRef.current,
    });
    return ok !== false;
  }, [threadId, stream]);

  const restoreProposal = useCallback((toolCallId: string, prev?: WSAIProposal) => {
    if (!prev) return;
    setProposals((p) => p.some(x => x.toolCallId === toolCallId) ? p : [...p, prev]);
  }, []);

  const approve = useCallback(async (toolCallId: string, edits?: any) => {
    const prev = proposals.find((x) => x.toolCallId === toolCallId);
    setProposals((p) => p.filter(x => x.toolCallId !== toolCallId));
    try {
      const ok = await stream({ threadId, approval: { toolCallId, decision: 'approve', edits }, autoApprove: autoApproveRef.current, model: modelRef.current });
      // Failure: bring the approval card back so the user can retry.
      if (ok === false) restoreProposal(toolCallId, prev);
    } catch (e: any) {
      restoreProposal(toolCallId, prev);
      toast.error(e?.message || 'Approve fail ho gaya. Dobara try karein.');
    }
  }, [threadId, stream, proposals, restoreProposal]);

  const reject = useCallback(async (toolCallId: string) => {
    const prev = proposals.find((x) => x.toolCallId === toolCallId);
    setProposals((p) => p.filter(x => x.toolCallId !== toolCallId));
    try {
      const ok = await stream({ threadId, approval: { toolCallId, decision: 'reject' } });
      if (ok === false) restoreProposal(toolCallId, prev);
    } catch (e: any) {
      restoreProposal(toolCallId, prev);
      toast.error(e?.message || 'Reject fail ho gaya. Dobara try karein.');
    }
  }, [threadId, stream, proposals, restoreProposal]);


  const autoDoneRef = useRef<Set<string>>(new Set());
  const autoBusyRef = useRef(false);

  useEffect(() => {
    if (!autoApprove || isSending || autoBusyRef.current) return;
    const next = proposals.find((p) => !autoDoneRef.current.has(p.toolCallId));
    if (!next) return;
    autoDoneRef.current.add(next.toolCallId);
    autoBusyRef.current = true;
    (async () => {
      try {
        await approve(next.toolCallId);
      } finally {
        autoBusyRef.current = false;
      }
    })();
  }, [autoApprove, proposals, isSending, approve]);

  const setAutoApprove = useCallback((v: boolean) => {
    setAutoApproveState(v);
    try { safeStorage.set(AUTO_APPROVE_KEY, v ? '1' : '0'); } catch {}
  }, []);


  // Stop: stream abort karo aur jo partial reply already aa chuki hai use DB me
  // save kar do, warna user ka kaam bina nishaan gayab ho jata hai.
  const stop = useCallback(() => {
    runRef.current++;
    abortRef.current?.abort();
    setIsSending(false);
    setPhase('idle');
    const partial = streamingText;
    const tid = threadId;
    setStreamingText('');
    if (partial.trim() && tid) {
      (async () => {
        const { data: sess } = await supabase.auth.getSession();
        const uid = sess.session?.user?.id;
        if (!uid) return;
        await supabase.from('workspace_ai_messages').insert({
          thread_id: tid, user_id: uid, role: 'assistant',
          parts: [{ type: 'text', text: `${partial}\n\n_(rok diya gaya)_` }],
          metadata: { stopped: true },
        } as any);
        await loadMessages(tid);
      })();
    }
  }, [streamingText, threadId, loadMessages]);
  const setThreadId = useCallback((id: string | null) => { runRef.current++; abortRef.current?.abort(); setStreamError(null); setThreadIdInternal(id); }, []);
  const newThread = useCallback(() => { runRef.current++; abortRef.current?.abort(); setStreamError(null); setThreadIdInternal(null); }, []);

  // Any DB write failure must be visible — never silently swallowed.
  const mustOk = (label: string) => (res: { error: any } | any) => {
    const err = (res as any)?.error;
    if (err) {
      toast.error(`${label} fail: ${err.message || 'unknown error'}`);
      throw new Error(err.message || label + ' failed');
    }
    return res;
  };

  // Asli "Branch": is message tak ka poora context copy karke nayi thread banao.
  const branchThread = useCallback(async (uptoIndex: number): Promise<string | null> => {
    if (!threadId) { toast.error('Pehle koi chat kholein'); return null; }
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { toast.error('Login zaroori hai'); return null; }

    // Cut ko aage badhao taaki assistant ke tool_calls ke results bhi saath aa jaayen
    // (orphan tool result / unresolved tool_call se model 400 deta hai).
    let end = Math.min(Math.max(uptoIndex, 0), messages.length - 1);
    while (end + 1 < messages.length && messages[end + 1].role === 'tool') end++;
    const slice = messages.slice(0, end + 1);
    if (slice.length === 0) { toast.error('Copy karne ke liye kuch nahi hai'); return null; }

    const parent = threads.find(t => t.id === threadId) || trashed.find(t => t.id === threadId);
    const baseTitle = (parent?.title || 'Chat').replace(/\s*\(branch\)$/i, '');

    const created = await supabase
      .from('workspace_ai_threads')
      .insert({
        user_id: u.user.id,
        title: `${baseTitle} (branch)`.slice(0, 120),
        title_auto: false,
        folder_id: parent?.folder_id ?? null,
        model: (parent as any)?.model ?? undefined,
        branched_from_thread_id: threadId,
        branched_from_message_id: messages[end]?.id ?? null,
        last_message_at: slice[slice.length - 1]?.created_at ?? new Date().toISOString(),
      } as any)
      .select()
      .single();
    if (created.error || !created.data) {
      toast.error('Branch banane me dikkat: ' + (created.error?.message || 'unknown'));
      return null;
    }
    const newId = (created.data as any).id as string;

    try {
      // Local state me sirf kuch columns hote hain — full rows DB se laao (attachments/steps/content bhi).
      const ids = slice.map((m: any) => m.id);
      const full = await supabase
        .from('workspace_ai_messages')
        .select('id, role, content, parts, attachments, steps, metadata, created_at')
        .in('id', ids);
      if (full.error) throw full.error;
      const byId = new Map<string, any>((full.data as any[] || []).map(r => [r.id, r]));
      const rows = slice.map((m: any) => {
        const src = byId.get(m.id) || m;
        return {
          thread_id: newId,
          user_id: u.user!.id,
          role: src.role,
          content: src.content ?? '',
          parts: src.parts ?? null,
          attachments: src.attachments ?? null,
          steps: src.steps ?? null,
          metadata: src.metadata ?? null,
          created_at: src.created_at,
        };
      });

      for (let i = 0; i < rows.length; i += 500) {
        const { error } = await supabase.from('workspace_ai_messages').insert(rows.slice(i, i + 500) as any);
        if (error) throw error;
      }
    } catch (e: any) {
      await supabase.from('workspace_ai_threads').delete().eq('id', newId);
      toast.error('Branch copy fail: ' + (e?.message || 'unknown'));
      return null;
    }

    await loadThreads();
    return newId;
  }, [threadId, messages, threads, trashed, loadThreads]);

  const renameThread = useCallback(async (id: string, title: string) => {

    mustOk('Rename')(await supabase.from('workspace_ai_threads').update({ title, title_auto: false } as any).eq('id', id));
    await loadThreads();
  }, [loadThreads]);

  const togglePin = useCallback(async (id: string) => {
    const t = threads.find(x => x.id === id);
    if (!t) return;
    mustOk('Pin')(await supabase.from('workspace_ai_threads').update({ pinned: !t.pinned }).eq('id', id));
    await loadThreads();
  }, [threads, loadThreads]);

  const archiveThread = useCallback(async (id: string) => {
    mustOk('Archive')(await supabase.from('workspace_ai_threads').update({ archived: true }).eq('id', id));
    if (threadId === id) setThreadIdInternal(null);
    await loadThreads();
  }, [threadId, loadThreads]);

  // Soft-delete: move to trash (archived=true)
  const deleteThread = useCallback(async (id: string) => {
    mustOk('Delete')(await supabase.from('workspace_ai_threads').update({ archived: true }).eq('id', id));
    if (threadId === id) setThreadIdInternal(null);
    await loadThreads();
    await loadTrash();
  }, [threadId, loadThreads, loadTrash]);

  const restoreThread = useCallback(async (id: string) => {
    mustOk('Restore')(await supabase.from('workspace_ai_threads').update({ archived: false }).eq('id', id));
    await loadThreads();
    await loadTrash();
  }, [loadThreads, loadTrash]);

  const permanentDeleteThread = useCallback(async (id: string) => {
    mustOk('Permanent delete')(await supabase.from('workspace_ai_threads').delete().eq('id', id));
    if (threadId === id) setThreadIdInternal(null);
    await loadTrash();
  }, [threadId, loadTrash]);

  const emptyTrash = useCallback(async () => {
    mustOk('Trash empty')(await supabase.from('workspace_ai_threads').delete().eq('archived', true));
    await loadTrash();
  }, [loadTrash]);

  const moveThreadToFolder = useCallback(async (id: string, folder_id: string | null) => {
    mustOk('Project move')(await supabase.from('workspace_ai_threads').update({ folder_id }).eq('id', id));
    await loadThreads();
  }, [loadThreads]);

  const createFolder = useCallback(async (name: string, emoji?: string, color?: string) => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { toast.error('Login zaroori hai'); return null; }
    const res = await supabase
      .from('workspace_ai_folders')
      .insert({ name, user_id: u.user.id, emoji, color } as any)
      .select()
      .single();
    mustOk('Project banana')(res);
    await loadFolders();
    return res.data;
  }, [loadFolders]);

  const updateFolder = useCallback(async (id: string, patch: { name?: string; emoji?: string | null; color?: string | null }) => {
    mustOk('Project update')(await supabase.from('workspace_ai_folders').update(patch as any).eq('id', id));
    await loadFolders();
  }, [loadFolders]);

  const renameFolder = useCallback(async (id: string, name: string) => {
    mustOk('Project rename')(await supabase.from('workspace_ai_folders').update({ name }).eq('id', id));
    await loadFolders();
  }, [loadFolders]);

  const deleteFolder = useCallback(async (id: string) => {
    mustOk('Project delete')(await supabase.from('workspace_ai_threads').update({ folder_id: null }).eq('folder_id', id));
    mustOk('Project delete')(await supabase.from('workspace_ai_folders').delete().eq('id', id));
    await loadFolders();
    await loadThreads();
  }, [loadFolders, loadThreads]);


  return {
    threads, trashed, folders, messages, proposals, activities, streamingText, phase, isSending, streamError, streamErrorQuota, streamNotice, memoryEvent, lastUsage, batch,
    autoApprove, setAutoApprove, model, setModel,

    threadId, setThreadId, newThread,
    send, approve, reject, stop,
    renameThread, togglePin, archiveThread, deleteThread, moveThreadToFolder, branchThread,
    restoreThread, permanentDeleteThread, emptyTrash,
    createFolder, renameFolder, deleteFolder, updateFolder,
    reloadMessages: () => loadMessages(threadId),
  };
}


function summarize(name: string, args: any): string {
  if (name?.startsWith('create_')) return `Create ${name.replace('create_', '')}`;
  if (name?.startsWith('update_')) return `Update ${name.replace('update_', '')}`;
  if (name?.startsWith('delete_')) return `Delete ${name.replace('delete_', '')}`;
  return name || 'Action';
}
