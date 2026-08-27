import { useEffect, useMemo, useRef, useState, useCallback, memo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useWorkspaceAI, type Attachment, type ContextRef, type WSAIActivity } from '@/hooks/useWorkspaceAI';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  Menu, Plus, ArrowUp, Square, Pin, Trash2, Check, X, Loader2,
  Paperclip, Image as ImageIcon, Folder, FolderPlus, ChevronDown, ChevronRight, Brain, AtSign,
  Copy, RefreshCw, Pencil, GitBranch, ArrowDown, Zap, Search, Sparkles, FileEdit, Trash,
  PlusCircle, Undo2, MoreHorizontal, RotateCcw, PanelLeftOpen, ChevronsDownUp, ChevronsUpDown,
  Mic, MessageCircleQuestion, SquarePen, Share2, Archive, Lightbulb, Settings2, Palette, Smile,
  MessagesSquare, LogOut, ChevronsUpDown as ChevronsUpDownIcon, Settings, Clock3,
  Cpu, Gauge, Rocket, ListChecks,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { cn } from '@/lib/utils';
import { useOpenLightbox } from '@/components/ui/AttachmentLightbox';
import { parseCtxParam, ctxLabel } from '@/lib/workspaceAiContext';
import { MentionPicker } from './MentionPicker';
import { SlashCommandPicker, type SlashCommand } from './SlashCommandPicker';
import { ChatGlyph, ProjectGlyph, AIAvatarGlyph } from './glyphs';
import { MemoriesPanel } from './MemoriesPanel';
import { useVoiceRecorder } from './useVoiceRecorder';
import { VoiceWaveform } from './VoiceWaveform';
import { useDraft } from '@/hooks/useDraft';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent,
  DropdownMenuShortcut,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Star } from 'lucide-react';
import { safeStorage, safeSession } from '@/lib/safeStorage';


type AiMode = 'auto' | 'viewer' | 'editor';
const AI_MODE_LABELS: Record<AiMode, string> = { auto: 'Default', viewer: 'Ask', editor: 'Edit' };
const AI_MODE_DESC: Record<AiMode, string> = {
  auto: 'Search, edit — sab kuch',
  viewer: 'Sirf answers, koi edit nahi',
  editor: 'Changes samajh ke edit karega',
};
const TEMPORARY_PROJECT_NAME = 'Temporary Chats';

type WSModel = 'fast' | 'deep' | 'lite';
const MODEL_LABELS: Record<WSModel, string> = { fast: 'Balanced', deep: 'Deep', lite: 'Quick' };
const MODEL_DESC: Record<WSModel, string> = {
  fast: 'Roz ke kaam ke liye — tez aur samajhdaar',
  deep: 'Sabse accurate — lamba socha samjha jawab, thoda slow',
  lite: 'Sabse tez — chhote sawaal aur quick edits',
};
const MODEL_ICONS: Record<WSModel, React.ReactNode> = {
  fast: <Gauge className="h-3.5 w-3.5" />,
  deep: <Rocket className="h-3.5 w-3.5" />,
  lite: <Zap className="h-3.5 w-3.5" />,
};

const FOLDER_EMOJIS = ['📁', '📌', '⭐', '🎵', '📝', '💼', '🧠', '🚀', '🎨', '🔥', '📊', '💡'];
const FOLDER_COLORS = ['#C96442', '#D97757', '#8B7355', '#4A6741', '#2D8A9E', '#9B72CF', '#C44569'];

interface WorkspaceAIShellProps {
  embedded?: boolean;
  initialContext?: ContextRef[];
  onRequestClose?: () => void;
  onOpenFullPage?: (threadId: string | null) => void;
  onActiveThreadChange?: (threadId: string | null) => void;
}

export function WorkspaceAIShell({ embedded = false, initialContext, onRequestClose, onOpenFullPage, onActiveThreadChange }: WorkspaceAIShellProps = {}) {

  const nav = useNavigate();
  const openLightbox = useOpenLightbox();
  const params = useParams<{ threadId: string }>();
  const urlThreadId = embedded ? null : (params.threadId || null);
  const [search, setSearch] = useSearchParams();

  const chat = useWorkspaceAI(urlThreadId);
  // Persistent per-thread composer draft — tab band / crash hone par bhi text bacha rahega.
  const [input, setInput, clearDraft] = useDraft(`wsai:${embedded ? 'fab:' : ''}${chat.threadId ?? 'new'}`);
  const [atts, setAtts] = useState<Attachment[]>([]);
  const [ctx, setCtx] = useState<ContextRef[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return safeStorage.get('wsai:sidebar') !== 'closed';
  });
  const [projectsOpen, setProjectsOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return safeStorage.get('wsai:projects-open') !== '0';
  });
  const [chatsOpen, setChatsOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return safeStorage.get('wsai:chats-open') !== '0';
  });
  const [mainView, setMainView] = useState<'chat' | 'chats-list' | 'projects-list'>('chat');
  const [temporaryMode, setTemporaryMode] = useState(false);
  const [temporaryFolderId, setTemporaryFolderId] = useState<string | null>(null);
  useEffect(() => { safeStorage.set('wsai:sidebar', desktopSidebarOpen ? 'open' : 'closed'); }, [desktopSidebarOpen]);
  useEffect(() => { safeStorage.set('wsai:projects-open', projectsOpen ? '1' : '0'); }, [projectsOpen]);
  useEffect(() => { safeStorage.set('wsai:chats-open', chatsOpen ? '1' : '0'); }, [chatsOpen]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [slashQuery, setSlashQuery] = useState<string | null>(null);
  const [mentionStart, setMentionStart] = useState(0);
  const [memOpen, setMemOpen] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);
  const [showJumpLatest, setShowJumpLatest] = useState(false);
  const [focusedIdx, setFocusedIdx] = useState<number | null>(null);
  const [aiMode, setAiModeState] = useState<AiMode>(() => {
    if (typeof window === 'undefined') return 'auto';
    const v = safeStorage.get('wsai:mode');
    return v === 'viewer' || v === 'editor' ? v : 'auto';
  });
  const setAiMode = (m: AiMode) => {
    setAiModeState(m);
    safeStorage.set('wsai:mode', m);
  };
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const voice = useVoiceRecorder((text) => {
    setInput((cur) => (cur ? `${cur.trimEnd()} ${text}` : text));
    setTimeout(() => {
      const el = composerRef.current;
      if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
    }, 0);
  });

  useEffect(() => {
    if (urlThreadId !== chat.threadId) chat.setThreadId(urlThreadId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlThreadId]);
  useEffect(() => {
    if (embedded) return;
    if (chat.threadId && chat.threadId !== urlThreadId) nav(`/personal/ai/${chat.threadId}`, { replace: true });
    if (!chat.threadId && urlThreadId) nav('/personal/ai', { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat.threadId]);

  useEffect(() => {
    onActiveThreadChange?.(chat.threadId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat.threadId]);


  const openThread = useCallback((tid: string | null) => {
    setMainView('chat');
    if (embedded) { chat.setThreadId(tid); setSidebarOpen(false); return; }
    nav(tid ? `/personal/ai/${tid}` : '/personal/ai');
  }, [embedded, nav, chat]);

  useEffect(() => {
    if (embedded) {
      if (initialContext?.length) {
        setCtx((c) => [...initialContext, ...c.filter(x => !initialContext.some(r => r.id === x.id && r.type === x.type))]);
      }
      return;
    }
    const raw = search.get('ctx');
    if (!raw) return;
    const refs = parseCtxParam(raw);
    if (refs.length) setCtx((c) => [...refs, ...c.filter(x => !refs.some(r => r.id === x.id && r.type === x.type))]);
    const next = new URLSearchParams(search);
    next.delete('ctx');
    setSearch(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const d = safeSession.get('wsai:draft');
    if (d) { setInput(d); safeSession.remove('wsai:draft'); composerRef.current?.focus(); }
  }, []);

  useEffect(() => {
    const h = () => setMemOpen(true);
    window.addEventListener('wsai:open-memories', h);
    return () => window.removeEventListener('wsai:open-memories', h);
  }, []);

  useEffect(() => { composerRef.current?.focus(); }, [chat.threadId, chat.isSending]);

  // tool_call_id -> result / duration. Built once per message-list change instead
  // of on every streaming token (was an O(n) scan inside render).
  const toolMaps = useMemo(() => {
    const results = new Map<string, any>();
    const durations = new Map<string, number>();
    for (const mm of chat.messages) {
      if (mm.role !== 'tool') continue;
      for (const p of ((mm as any).parts || []) as any[]) {
        if (!p?.tool_call_id) continue;
        results.set(p.tool_call_id, p.result);
        if (typeof p.duration_ms === 'number') durations.set(p.tool_call_id, p.duration_ms);
      }
    }
    return { results, durations };
  }, [chat.messages]);



  const scrollToBottom = useCallback((smooth = true) => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  useEffect(() => {
    scrollToBottom(true);
  }, [chat.messages.length, chat.streamingText, chat.activities.length, scrollToBottom]);

  // Track scroll for jump-to-latest button
  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - (el.scrollTop + el.clientHeight);
    setShowJumpLatest(distanceFromBottom > 200);
  };

  // Keyboard nav: j/k to move between messages when composer not focused
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const active = document.activeElement as HTMLElement | null;
      if (active && (active.tagName === 'TEXTAREA' || active.tagName === 'INPUT' || active.isContentEditable)) return;
      if (!['j', 'k'].includes(e.key)) return;
      e.preventDefault();
      const max = chat.messages.length - 1;
      if (max < 0) return;
      setFocusedIdx((cur) => {
        const base = cur ?? max;
        const next = e.key === 'j' ? Math.min(max, base + 1) : Math.max(0, base - 1);
        const el = document.querySelector<HTMLElement>(`[data-wsai-msg="${next}"]`);
        el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        return next;
      });
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [chat.messages.length]);

  const temporaryFolders = useMemo(
    () => chat.folders.filter((f) => (f.name || '').trim().toLowerCase() === TEMPORARY_PROJECT_NAME.toLowerCase()),
    [chat.folders],
  );
  const temporaryFolderIds = useMemo(() => {
    const ids = new Set<string>();
    temporaryFolders.forEach((f) => ids.add(f.id));
    if (temporaryFolderId) ids.add(temporaryFolderId);
    return ids;
  }, [temporaryFolders, temporaryFolderId]);
  const temporaryFolder = temporaryFolders[0] || null;
  const activeThread = useMemo(
    () => chat.threads.find((t) => t.id === chat.threadId) || null,
    [chat.threads, chat.threadId],
  );
  const activeIsTemporary = !!activeThread?.folder_id && temporaryFolderIds.has(activeThread.folder_id);
  const temporaryModeActive = temporaryMode || activeIsTemporary;

  useEffect(() => {
    if (activeThread && !activeIsTemporary && temporaryMode) setTemporaryMode(false);
  }, [activeThread, activeIsTemporary, temporaryMode]);

  useEffect(() => {
    if (temporaryFolder?.id) setTemporaryFolderId(temporaryFolder.id);
  }, [temporaryFolder?.id]);

  const ensureTemporaryProject = useCallback(async () => {
    const existing = chat.folders.find((f) => (f.name || '').trim().toLowerCase() === TEMPORARY_PROJECT_NAME.toLowerCase());
    if (existing?.id) {
      setTemporaryFolderId(existing.id);
      return existing.id;
    }
    const created = await chat.createFolder(TEMPORARY_PROJECT_NAME, '⏱️', '#8B7355');
    if (created?.id) {
      setTemporaryFolderId(created.id);
      return created.id;
    }
    toast.error('Temporary Chats project create nahi ho paya');
    return null;
  }, [chat]);

  const toggleTemporaryMode = useCallback(async () => {
    if (temporaryModeActive) {
      setTemporaryMode(false);
      if (activeIsTemporary) {
        chat.newThread();
        openThread(null);
      }
      toast.info('Temporary chat off');
      return;
    }
    const id = await ensureTemporaryProject();
    if (!id) return;
    setTemporaryMode(true);
    setMainView('chat');
    if (chat.threadId && !activeIsTemporary) {
      chat.newThread();
      openThread(null);
    }
    toast.success('Temporary chat on');
  }, [temporaryModeActive, activeIsTemporary, ensureTemporaryProject, chat, openThread]);

  const getSendFolderId = useCallback(async () => {
    if (!temporaryModeActive || chat.threadId) return null;
    return ensureTemporaryProject();
  }, [temporaryModeActive, chat.threadId, ensureTemporaryProject]);

  const onSend = async () => {
    const msg = input.trim();
    if (!msg && !atts.length) return;
    clearDraft();
    setSlashQuery(null);
    const attsCopy = atts; const ctxCopy = ctx;
    setAtts([]); setCtx([]);
    const folderId = await getSendFolderId();
    await chat.send(msg, { attachments: attsCopy, contextRefs: ctxCopy, mode: aiMode, folderId });
  };

  const onUpload = async (files: FileList | null) => {
    if (!files) return;
    const TEXT_EXT = new Set(['csv','tsv','txt','json','md','log','xml','yml','yaml']);
    for (const f of Array.from(files).slice(0, 20)) {
      if (f.size > 10 * 1024 * 1024) { toast.error(`${f.name}: 10 MB se bada file skip`); continue; }
      const isImg = f.type.startsWith('image/');
      const lower = f.name.toLowerCase();
      const ext = lower.includes('.') ? lower.split('.').pop()! : '';
      let kind: Attachment['kind'] = 'file';
      if (isImg) kind = 'image';
      else if (f.type === 'application/pdf' || ext === 'pdf') kind = 'pdf';
      else if (ext === 'csv') kind = 'csv';
      else if (ext === 'zip' || f.type === 'application/zip' || f.type === 'application/x-zip-compressed') kind = 'zip';
      else if (TEXT_EXT.has(ext) || f.type.startsWith('text/') || f.type === 'application/json') kind = 'text';
      else {
        // Magic-byte sniff for ZIP when MIME/extension are missing
        try {
          const head = new Uint8Array(await f.slice(0, 4).arrayBuffer());
          if (head[0] === 0x50 && head[1] === 0x4b && head[2] === 0x03 && head[3] === 0x04) kind = 'zip';
        } catch { /* ignore */ }
      }
      const safeName = (f.name.replace(/[^a-zA-Z0-9._-]+/g, '_') || 'file').slice(0, 120);
      const path = `wsai/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;
      const { error } = await supabase.storage.from('personal-notes-media').upload(path, f, { contentType: f.type || 'application/octet-stream' });
      if (error) { toast.error(error.message); continue; }
      const { data } = await supabase.storage.from('personal-notes-media').createSignedUrl(path, 60 * 60 * 24 * 30);
      if (!data?.signedUrl) continue;
      setAtts((a) => [...a, { url: data.signedUrl, name: f.name, kind, mime: f.type }]);
    }
  };

  const onInputChange = (v: string) => {
    setInput(v);
    // Slash commands: sirf tab jab poora input "/word" ho (Claude/ChatGPT jaisa).
    const slash = /^\/([a-zA-Z0-9-]*)$/.exec(v);
    if (slash) { setSlashQuery(slash[1]); setMentionQuery(null); return; }
    setSlashQuery(null);
    const el = composerRef.current;
    const pos = el?.selectionStart ?? v.length;
    const before = v.slice(0, pos);
    const at = before.lastIndexOf('@');
    if (at >= 0) {
      const chunk = before.slice(at + 1);
      if (!/\s/.test(chunk) && chunk.length <= 30) {
        setMentionQuery(chunk);
        setMentionStart(at);
        return;
      }
    }
    setMentionQuery(null);
  };

  const pickMention = (ref: ContextRef, label: string) => {
    setCtx((c) => c.some(x => x.id === ref.id && x.type === ref.type) ? c : [...c, { ...ref, label }]);
    const el = composerRef.current;
    const pos = el?.selectionStart ?? input.length;
    const before = input.slice(0, mentionStart);
    const after = input.slice(pos);
    const inserted = `@${label} `;
    const next = before + inserted + after;
    setInput(next);
    setMentionQuery(null);
    setTimeout(() => {
      const p = (before + inserted).length;
      el?.setSelectionRange(p, p);
      el?.focus();
    }, 0);
  };

  const regenerate = async (idx: number) => {
    // Resend last user message before this assistant message, and supersede the
    // old assistant/tool rows so thread me duplicate Q&A na bane.
    // IMPORTANT: purane rows tabhi delete karo jab naya reply safely aa gaya ho,
    // warna send fail hone par purani reply permanently chali jaati hai.
    for (let i = idx - 1; i >= 0; i--) {
      const m = chat.messages[i];
      if (m.role === 'user') {
        const text = (m.parts || []).filter((p: any) => p.type === 'text').map((p: any) => p.text).join('\n\n');
        const staleIds = chat.messages.slice(i + 1).map((x) => x.id).filter(Boolean);
        const ok = await chat.send(text || 'Regenerate previous response', { mode: aiMode });
        if (ok && staleIds.length) {
          const { error } = await supabase.from('workspace_ai_messages').delete().in('id', staleIds);
          if (error) toast.error('Purani reply hata nahi paaye: ' + error.message);
          await chat.reloadMessages();
        }
        return;
      }
    }
  };


  const retryLastTurn = async () => {
    for (let i = chat.messages.length - 1; i >= 0; i--) {
      const m = chat.messages[i];
      if (m.role === 'user') {
        await regenerate(i + 1);
        return;
      }
    }
    await chat.reloadMessages();
  };


  const editAndResend = (idx: number) => {
    const m = chat.messages[idx];
    const text = (m.parts || []).filter((p: any) => p.type === 'text').map((p: any) => p.text).join('\n\n');
    setInput(text);
    composerRef.current?.focus();
  };

  const branchFrom = async (idx: number) => {
    const newId = await chat.branchThread(idx);
    if (!newId) return;
    openThread(newId);
    setMainView('chat');
    toast.success('Branch ban gaya — yahin se continue karein.');
  };

  // ---- Sidebar ----
  const threadsByFolder = useMemo(() => {
    const map = new Map<string | null, typeof chat.threads>();
    for (const t of chat.threads) {
      const key = t.folder_id;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return map;
  }, [chat.threads]);

  const [openFolders, setOpenFolders] = useState<Record<string, boolean>>({});
  const [dropTarget, setDropTarget] = useState<string | null | undefined>(undefined);
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [moveThreadIdAfterCreate, setMoveThreadIdAfterCreate] = useState<string | null>(null);
  const [renameThreadTarget, setRenameThreadTarget] = useState<any | null>(null);
  const [renameFolderTarget, setRenameFolderTarget] = useState<any | null>(null);

  const openCreateProject = useCallback((moveThreadId?: string) => {
    setMoveThreadIdAfterCreate(moveThreadId || null);
    setCreateProjectOpen(true);
  }, []);

  useEffect(() => {
    const h = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      openCreateProject(detail?.threadId);
    };
    window.addEventListener('wsai:new-project', h);
    return () => window.removeEventListener('wsai:new-project', h);
  }, [openCreateProject]);



  const onDragStart = (e: React.DragEvent, threadId: string) => {
    e.dataTransfer.setData('wsai/thread', threadId);
    e.dataTransfer.effectAllowed = 'move';
  };
  const onDropOn = (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('wsai/thread');
    if (id) chat.moveThreadToFolder(id, folderId);
    setDropTarget(undefined);
  };

  const [sidebarTab, setSidebarTab] = useState<'chats' | 'projects'>(() => {
    if (typeof window === 'undefined') return 'chats';
    const v = safeStorage.get('wsai:sidebar-tab');
    return v === 'projects' ? 'projects' : 'chats';
  });
  useEffect(() => { safeStorage.set('wsai:sidebar-tab', sidebarTab); }, [sidebarTab]);

  const unfiledThreads = threadsByFolder.get(null) || [];
  const allChatThreads = chat.threads.filter((t) => !t.folder_id || !temporaryFolderIds.has(t.folder_id));

  const [sidebarSearch, setSidebarSearch] = useState<string | null>(null);
  const { user, profile, signOut } = useAuth();
  const [trashDialogOpen, setTrashDialogOpen] = useState(false);

  const filteredChats = useMemo(() => {
    if (!sidebarSearch) return allChatThreads;
    const q = sidebarSearch.toLowerCase().trim();
    if (!q) return allChatThreads;
    return allChatThreads.filter((t) => (t.title || '').toLowerCase().includes(q));
  }, [allChatThreads, sidebarSearch]);



  const groupedChats = useMemo(() => {
    const now = Date.now();
    const day = 86400000;
    const todayStart = new Date(); todayStart.setHours(0,0,0,0);
    const yStart = todayStart.getTime() - day;
    const wStart = todayStart.getTime() - 7 * day;
    const pinned: any[] = []; const today: any[] = []; const yesterday: any[] = []; const week: any[] = []; const earlier: any[] = [];
    for (const t of filteredChats) {
      if (t.pinned) { pinned.push(t); continue; }
      const ts = t.last_message_at ? new Date(t.last_message_at).getTime() : new Date(t.updated_at || t.created_at || now).getTime();
      if (ts >= todayStart.getTime()) today.push(t);
      else if (ts >= yStart) yesterday.push(t);
      else if (ts >= wStart) week.push(t);
      else earlier.push(t);
    }
    return [
      { label: 'Pinned', items: pinned },
      { label: 'Today', items: today },
      { label: 'Yesterday', items: yesterday },
      { label: 'Last 7 days', items: week },
      { label: 'Earlier', items: earlier },
    ].filter(g => g.items.length > 0);
  }, [filteredChats]);

  const displayName = (profile as any)?.display_name || (user?.email?.split('@')[0]) || 'You';
  const initials = displayName
    .split(/\s+/)
    .map((s: string) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U';

  // ---- Slash commands ----------------------------------------------------
  const slashCommands: SlashCommand[] = useMemo(() => [
    { id: 'new', label: 'New chat', hint: 'Fresh conversation shuru karein', icon: <Plus className="h-4 w-4" />, kind: 'action',
      run: () => { chat.newThread(); openThread(null); setMainView('chat'); } },
    { id: 'temp', label: 'Temporary chat', hint: 'History me save na ho aisi chat', icon: <Clock3 className="h-4 w-4" />, kind: 'action',
      run: () => { toggleTemporaryMode(); } },
    { id: 'chats', label: 'All chats', hint: 'Saare chats ki list kholo', icon: <MessagesSquare className="h-4 w-4" />, kind: 'action',
      run: () => { setMainView('chats-list'); setSidebarTab('chats'); } },
    { id: 'projects', label: 'Projects', hint: 'Projects view kholo', icon: <Folder className="h-4 w-4" />, kind: 'action',
      run: () => { setMainView('projects-list'); setSidebarTab('projects'); } },
    { id: 'search', label: 'Search chats', hint: 'Sidebar search kholo', icon: <Search className="h-4 w-4" />, kind: 'action',
      run: () => { setSidebarSearch(''); setSidebarOpen(true); } },
    { id: 'rename', label: 'Rename this chat', hint: 'Is thread ka naam badlo', icon: <Pencil className="h-4 w-4" />, kind: 'action',
      run: () => { if (activeThread) setRenameThreadTarget(activeThread); else toast.info('Pehle koi chat kholein'); } },
    { id: 'archive', label: 'Archive this chat', hint: 'Thread ko archive (trash) me bhejo', icon: <Archive className="h-4 w-4" />, kind: 'action',
      run: () => {
        if (!activeThread) { toast.info('Pehle koi chat kholein'); return; }
        chat.archiveThread(activeThread.id);
        openThread(null);
        toast.success('Chat archive ho gayi');
      } },
    { id: 'memory', label: 'Memory', hint: 'AI ki saved memories dekho', icon: <Brain className="h-4 w-4" />, kind: 'action',
      run: () => setMemOpen(true) },
    { id: 'model', label: `Model — ${MODEL_LABELS[chat.model as WSModel]}`, hint: 'Balanced → Deep → Quick cycle karo', icon: <Cpu className="h-4 w-4" />, kind: 'action',
      run: () => {
        const order: WSModel[] = ['fast', 'deep', 'lite'];
        const next = order[(order.indexOf(chat.model as WSModel) + 1) % order.length];
        chat.setModel(next);
        toast.success(`Model: ${MODEL_LABELS[next]}`);
      } },
    { id: 'summary', label: 'Summarise this chat', hint: 'Prompt template', icon: <ListChecks className="h-4 w-4" />, kind: 'prompt',
      text: 'Is poori chat ka short summary do — key decisions aur pending kaam bullet points me.' },
    { id: 'todo', label: 'Pending tasks nikalo', hint: 'Prompt template', icon: <ListChecks className="h-4 w-4" />, kind: 'prompt',
      text: 'Meri pending todos list karo, priority ke hisaab se sort karke.' },
    { id: 'release', label: 'DistroKid release status', hint: 'Prompt template', icon: <Sparkles className="h-4 w-4" />, kind: 'prompt',
      text: 'Meri latest DistroKid releases ka status aur expected reporting dates batao.' },
  ], [chat, openThread, activeThread, toggleTemporaryMode]);

  const runSlashCommand = useCallback((cmd: SlashCommand) => {
    setSlashQuery(null);
    if (cmd.kind === 'prompt' && cmd.text) {
      setInput(cmd.text);
      setTimeout(() => composerRef.current?.focus(), 0);
      return;
    }
    setInput('');
    cmd.run?.();
  }, []);

  const sidebar = (
    <div className="relative flex flex-col h-full wsai-panel">
      {/* Brand */}
      <div className="px-4 pt-4 pb-2 flex items-center gap-1">
        <div
          className="flex-1 text-[22px] leading-none wsai-text tracking-tight"
          style={{ fontFamily: "'Instrument Serif', 'Cormorant Garamond', Georgia, serif" }}
        >
          Workspace AI
        </div>
        <button
          onClick={() => setSidebarSearch((s) => (s === null ? '' : null))}
          className="p-1.5 rounded-md wsai-hover wsai-muted"
          title="Search chats"
          aria-label="Search chats"
        >
          <Search className="h-4 w-4" />
        </button>
      </div>

      {sidebarSearch !== null && (
        <div className="px-3 pt-1 pb-2">
          <Input
            autoFocus
            value={sidebarSearch}
            onChange={(e) => setSidebarSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Escape') setSidebarSearch(null); }}
            placeholder="Search chats…"
            className="h-9 rounded-lg wsai-surface wsai-border wsai-text text-sm"
          />
        </div>
      )}

      {/* Primary nav — Claude style */}
      <nav className="px-2 pt-1 space-y-0.5">
        <button
          onClick={() => { chat.newThread(); openThread(null); setSidebarOpen(false); }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg wsai-hover text-sm font-medium wsai-text"
        >
          <Plus className="h-4 w-4 wsai-muted" /> New chat
        </button>
        <button
          onClick={() => { setSidebarTab('chats'); setMainView('chats-list'); setSidebarOpen(false); }}
          data-active={sidebarTab === 'chats' && mainView === 'chats-list'}
          className="wsai-nav-row w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium wsai-text"
        >
          <MessagesSquare className="h-4 w-4 wsai-muted" /> Chats
        </button>
        <button
          onClick={() => { setSidebarTab('projects'); setMainView('projects-list'); setSidebarOpen(false); }}
          data-active={sidebarTab === 'projects' && mainView === 'projects-list'}
          className="wsai-nav-row w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium wsai-text"
        >
          <Folder className="h-4 w-4 wsai-muted" /> Projects
        </button>
      </nav>

      <ScrollArea className="flex-1 mt-1">
        <div className="px-2 pb-3">
          {sidebarTab === 'chats' && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDropTarget(null); }}
              onDragLeave={() => setDropTarget((t) => t === null ? undefined : t)}
              onDrop={(e) => onDropOn(e, null)}
              className={cn('rounded-lg', dropTarget === null && 'wsai-ring-accent')}
            >
              <div className="flex items-center justify-between px-3 pt-3 pb-1">
                <span className="text-[11px] font-medium wsai-muted">Recents</span>
              </div>
              {groupedChats.length === 0 && (
                <p className="px-3 py-6 text-xs wsai-muted text-center">
                  {sidebarSearch ? 'Koi match nahi.' : 'No chats yet. Start a new conversation.'}
                </p>
              )}
              {groupedChats.map((g) => (
                <div key={g.label} className="mb-1">
                  {g.label !== 'Today' && (
                    <div className="px-3 pt-2 pb-0.5 text-[10px] font-medium wsai-muted uppercase tracking-wider">
                      {g.label}
                    </div>
                  )}
                  <div className="space-y-0.5">
                    {g.items.map((t: any) => (
                      <ThreadRow
                        key={t.id}
                        t={t}
                        chat={chat}
                        onNav={() => { openThread(t.id); setSidebarOpen(false); }}
                        onRename={() => setRenameThreadTarget(t)}
                        onDragStart={onDragStart}
                        hideIcon
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {sidebarTab === 'projects' && (
            <div className="space-y-0.5">
              <div className="flex items-center justify-between px-3 pt-3 pb-1">
                <span className="text-[11px] font-medium wsai-muted">Projects</span>
                <button
                  onClick={() => openCreateProject()}
                  className="p-1 rounded wsai-hover wsai-muted"
                  title="New project"
                  aria-label="New project"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
              {chat.folders.length === 0 && (
                <p className="px-3 py-6 text-xs wsai-muted text-center">
                  No projects yet.<br />Group related chats together.
                </p>
              )}
              {chat.folders.map((f: any) => {
                const open = openFolders[f.id] ?? true;
                const items = threadsByFolder.get(f.id) || [];
                return (
                  <div
                    key={f.id}
                    onDragOver={(e) => { e.preventDefault(); setDropTarget(f.id); }}
                    onDragLeave={() => setDropTarget((t) => t === f.id ? undefined : t)}
                    onDrop={(e) => onDropOn(e, f.id)}
                    className={cn(
                      'rounded-lg transition-all',
                      dropTarget === f.id && 'wsai-ring-accent',
                    )}
                  >
                    <div className="group/folder relative flex items-center gap-1.5 px-2 py-1.5 rounded-lg wsai-hover transition-all">
                      <button
                        onClick={() => setOpenFolders((o) => ({ ...o, [f.id]: !open }))}
                        className="p-0.5 hover:opacity-70 wsai-muted shrink-0"
                        aria-label={open ? 'Collapse' : 'Expand'}
                      >
                        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                      </button>
                      <ProjectGlyph />
                      <span className="flex-1 truncate pr-10 text-sm font-medium wsai-text">{f.name}</span>
                      {items.length > 0 && (
                        <span className="text-[10px] wsai-muted mr-6 tabular-nums">{items.length}</span>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="wsai-menu-trigger absolute right-1 top-1/2 z-10 -translate-y-1/2 shrink-0 opacity-100 sm:opacity-0 sm:group-hover/folder:opacity-100 sm:group-focus-within/folder:opacity-100"
                            onClick={(e) => e.stopPropagation()}
                            onPointerDown={(e) => e.stopPropagation()}
                            aria-label="Project options"
                            title="Project options"
                          ><MoreHorizontal className="h-4 w-4" /></button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" sideOffset={6} className="z-[100] w-52 rounded-xl p-1.5 wsai-theme wsai-surface wsai-border wsai-text shadow-xl" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenuItem className="rounded-lg py-2" onSelect={() => window.setTimeout(() => setRenameFolderTarget(f), 0)}>
                            <Pencil className="h-4 w-4 mr-2.5" /> Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem className="rounded-lg py-2" onSelect={() => setOpenFolders((o) => ({ ...o, [f.id]: !open }))}>
                            {open ? <ChevronsDownUp className="h-4 w-4 mr-2.5" /> : <ChevronsUpDown className="h-4 w-4 mr-2.5" />}
                            {open ? 'Collapse' : 'Expand'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="rounded-lg py-2 text-destructive focus:text-destructive"
                            onSelect={() => { if (confirm(`Delete project "${f.name}"? Chats will move to Unfiled.`)) chat.deleteFolder(f.id); }}
                          >
                            <Trash2 className="h-4 w-4 mr-2.5" /> Delete project
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    {open && (
                      <div className="pl-6 mt-0.5 space-y-0.5">
                        {items.map((t: any) => <ThreadRow key={t.id} t={t} chat={chat} onNav={() => { openThread(t.id); setSidebarOpen(false); }} onRename={() => setRenameThreadTarget(t)} onDragStart={onDragStart} hideIcon />)}
                        {items.length === 0 && <div className="pl-2 py-1.5 text-[10px] wsai-muted italic">Drop chats here</div>}
                      </div>
                    )}
                  </div>
                );
              })}

              {unfiledThreads.length > 0 && (
                <div
                  className="mt-3 pt-3 wsai-border border-t"
                  onDragOver={(e) => { e.preventDefault(); setDropTarget(null); }}
                  onDragLeave={() => setDropTarget((t) => t === null ? undefined : t)}
                  onDrop={(e) => onDropOn(e, null)}
                >
                  <div className="px-3 pb-1 text-[10px] font-medium wsai-muted uppercase tracking-wider">
                    Unfiled
                  </div>
                  <div className="space-y-0.5">
                    {unfiledThreads.slice(0, 20).map((t: any) => (
                      <ThreadRow key={t.id} t={t} chat={chat} onNav={() => { openThread(t.id); setSidebarOpen(false); }} onRename={() => setRenameThreadTarget(t)} onDragStart={onDragStart} hideIcon />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Bottom user chip — Claude style */}
      <div className="mt-auto p-2 shrink-0 wsai-border border-t">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg wsai-hover text-left">
              <div
                className="h-8 w-8 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0"
                style={{ background: 'hsl(var(--wsai-accent))', color: 'hsl(var(--wsai-accent-fg))' }}
              >
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium wsai-text truncate">{displayName}</div>
                <div className="text-[10px] wsai-muted truncate">Personal workspace</div>
              </div>
              <ChevronsUpDownIcon className="h-3.5 w-3.5 wsai-muted shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="top" sideOffset={6} className="w-64 rounded-xl p-1.5 wsai-theme wsai-surface wsai-border wsai-text shadow-xl">
            <div className="px-2.5 py-2 border-b wsai-border mb-1">
              <div className="text-sm font-medium wsai-text truncate">{displayName}</div>
              <div className="text-[11px] wsai-muted truncate">{user?.email}</div>
            </div>
            <DropdownMenuItem className="rounded-lg py-2" onSelect={() => nav('/personal')}>
              <Settings className="h-4 w-4 mr-2.5" /> Personal dashboard
            </DropdownMenuItem>
            <DropdownMenuItem className="rounded-lg py-2" onSelect={() => setMemOpen(true)}>
              <Brain className="h-4 w-4 mr-2.5" /> Memory
            </DropdownMenuItem>
            <DropdownMenuItem className="rounded-lg py-2" onSelect={() => setTrashDialogOpen(true)}>
              <Trash className="h-4 w-4 mr-2.5" />
              <span className="flex-1">Trash</span>
              {chat.trashed.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full wsai-accent-bg">{chat.trashed.length}</span>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="rounded-lg py-2 text-destructive focus:text-destructive focus:bg-destructive/10"
              onSelect={async () => { await signOut(); nav('/'); }}
            >
              <LogOut className="h-4 w-4 mr-2.5" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );




  // ⌘\ toggles the desktop sidebar
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
        e.preventDefault();
        setDesktopSidebarOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  return (
    <div className={cn('wsai-theme flex w-full', embedded ? 'h-full' : 'h-[100dvh]')}>
      {/* Desktop sidebar (full page only — the FAB window uses the slide-over) */}
      <aside
        className={cn(
          'relative flex-col shrink-0 wsai-border transition-[width] duration-300 ease-out overflow-visible',
          embedded ? 'hidden' : 'hidden lg:flex',
          desktopSidebarOpen ? 'w-[280px] border-r' : 'w-0 border-r-0',
        )}
      >
        {desktopSidebarOpen && sidebar}
        {/* Floating edge handle (visible in both states) */}
        <button
          type="button"
          onClick={() => setDesktopSidebarOpen((v) => !v)}
          className={cn(
            'hidden lg:inline-flex wsai-edge-handle',
            desktopSidebarOpen ? 'wsai-edge-handle--open' : 'wsai-edge-handle--closed',
          )}
          title={desktopSidebarOpen ? 'Close sidebar (⌘\\)' : 'Open sidebar (⌘\\)'}
          aria-label={desktopSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
        >
          {desktopSidebarOpen
            ? <ChevronRight className="h-3.5 w-3.5 rotate-180" />
            : <ChevronRight className="h-3.5 w-3.5" />}
        </button>
      </aside>

      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="p-0 w-[300px] wsai-theme">{sidebar}</SheetContent>
      </Sheet>



      <CreateProjectDialog
        open={createProjectOpen}
        onOpenChange={setCreateProjectOpen}
        onCreate={async (name) => {
          const folder = await chat.createFolder(name);
          setSidebarTab('projects');
          if (folder?.id && moveThreadIdAfterCreate) {
            await chat.moveThreadToFolder(moveThreadIdAfterCreate, folder.id);
          }
          setMoveThreadIdAfterCreate(null);
        }}
      />

      <RenameEntityDialog
        open={!!renameThreadTarget}
        title="Rename chat"
        label="Chat title"
        initialValue={renameThreadTarget?.title || ''}
        placeholder="Chat title"
        submitLabel="Save chat"
        onOpenChange={(v) => { if (!v) setRenameThreadTarget(null); }}
        onRename={async (value) => {
          if (!renameThreadTarget) return;
          await chat.renameThread(renameThreadTarget.id, value);
          setRenameThreadTarget(null);
          toast.success('Chat renamed');
        }}
      />

      <RenameEntityDialog
        open={!!renameFolderTarget}
        title="Rename project"
        label="Project name"
        initialValue={renameFolderTarget?.name || ''}
        placeholder="Project name"
        submitLabel="Save project"
        onOpenChange={(v) => { if (!v) setRenameFolderTarget(null); }}
        onRename={async (value) => {
          if (!renameFolderTarget) return;
          await chat.renameFolder(renameFolderTarget.id, value);
          setRenameFolderTarget(null);
          toast.success('Project renamed');
        }}
      />


      <main className="flex-1 flex flex-col min-w-0 wsai-bg">
        <header className={cn('h-14 wsai-border border-b flex items-center gap-2 px-2 sm:px-4 shrink-0 wsai-surface', !embedded && !desktopSidebarOpen && 'lg:pl-14')}>
          <Button
            variant="ghost"
            size="icon"
            className={cn('h-11 w-11 shrink-0', !embedded && 'lg:hidden')}
            onClick={() => setSidebarOpen(true)}
            title={embedded ? 'Chat history' : 'Menu'}
            aria-label={embedded ? 'Chat history' : 'Menu'}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0 flex items-center gap-1.5">
            {mainView === 'chats-list' || mainView === 'projects-list' ? (
              <div className="text-sm font-medium truncate wsai-text">
                {mainView === 'chats-list' ? 'Chats' : 'Projects'}
              </div>
            ) : activeThread ? (
              <>
                <button
                  type="button"
                  onClick={() => setRenameThreadTarget(activeThread)}
                  onDoubleClick={() => setRenameThreadTarget(activeThread)}
                  className="group/title inline-flex items-center gap-1.5 min-w-0 max-w-full text-sm font-medium wsai-text wsai-hover rounded-md px-2 py-1 -ml-2"
                  title="Rename thread"
                >
                  <span className="truncate">{activeThread.title || 'New chat'}</span>
                  <Pencil className="h-3.5 w-3.5 wsai-muted opacity-0 group-hover/title:opacity-100 transition-opacity shrink-0" />
                </button>
                {(activeThread as any).branched_from_thread_id && (
                  <button
                    type="button"
                    onClick={() => { openThread((activeThread as any).branched_from_thread_id); setMainView('chat'); }}
                    className="shrink-0 inline-flex items-center gap-1 rounded-full wsai-border border px-2 py-0.5 text-[11px] wsai-muted wsai-hover"
                    title="Parent chat kholein"
                  >
                    <GitBranch className="h-3 w-3" />
                    Branched
                  </button>
                )}
              </>
            ) : (
              <div className="text-sm font-medium truncate wsai-text">New chat</div>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              const next = !chat.autoApprove;
              chat.setAutoApprove(next);
              toast[next ? 'success' : 'info'](
                next ? 'Auto approve on — AI khud decide karega' : 'Auto approve off — approval card aayega',
              );
            }}
            data-active={chat.autoApprove}
            className={cn(
              'min-h-11 px-3 rounded-full wsai-border border text-xs font-medium wsai-text wsai-hover inline-flex items-center gap-1.5 shrink-0',
              chat.autoApprove && 'wsai-accent-bg border-transparent',
            )}
            aria-pressed={chat.autoApprove}
            title={chat.autoApprove ? 'Auto approve ON — no approval cards' : 'Auto approve OFF — approval cards shown'}
          >
            <Zap className={cn('h-3.5 w-3.5', chat.autoApprove && 'fill-current')} />
            <span className="hidden sm:inline">Auto</span>
            <span
              className={cn(
                'h-3.5 w-6 rounded-full relative transition-colors',
                chat.autoApprove ? 'bg-current/40' : 'bg-current/15',
              )}
              aria-hidden
            >
              <span
                className={cn(
                  'absolute top-0.5 h-2.5 w-2.5 rounded-full bg-current transition-all',
                  chat.autoApprove ? 'left-3' : 'left-0.5',
                )}
              />
            </span>
          </button>
          {!embedded && (

            <button
              type="button"
              onClick={toggleTemporaryMode}
              data-active={temporaryModeActive}
              className={cn(
                'min-h-11 px-3 rounded-full wsai-border border text-xs font-medium wsai-text wsai-hover inline-flex items-center gap-1.5',
                temporaryModeActive && 'wsai-accent-bg border-transparent',
              )}
              aria-pressed={temporaryModeActive}
              title={temporaryModeActive ? 'Temporary chat on' : 'Start temporary chat'}
            >
              <Clock3 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Temporary</span>
            </button>
          )}
          {!embedded && <kbd className="hidden md:inline-flex text-[10px] wsai-muted px-1.5 py-0.5 rounded border wsai-border font-mono">j/k to nav</kbd>}
          <div className="text-[10px] wsai-muted shrink-0">
            {chat.phase === 'thinking' && <span className="inline-flex items-center gap-1"><span className="wsai-thinking-dot inline-block h-1.5 w-1.5 rounded-full wsai-accent-bg" /> thinking</span>}
            {chat.phase === 'writing' && <span className="inline-flex items-center gap-1"><span className="wsai-thinking-dot inline-block h-1.5 w-1.5 rounded-full wsai-accent-bg" /> writing</span>}
          </div>
        </header>

        <MemoryUpdatedChip event={chat.memoryEvent} onView={() => setMemOpen(true)} />

        {mainView !== 'chat' ? (
          <MainListView
            kind={mainView}
            chat={chat}
            threadsByFolder={threadsByFolder}
            hiddenThreadFolderIds={temporaryFolderIds}
            onOpenThread={(id) => openThread(id)}
            onNewChat={() => { chat.newThread(); openThread(null); }}
            onNewProject={() => openCreateProject()}
            onRenameThread={(t) => setRenameThreadTarget(t)}
            onRenameFolder={(f) => setRenameFolderTarget(f)}
          />
        ) : (<>
        <div ref={scrollRef} onScroll={onScroll} className="flex-1 overflow-y-auto relative">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">
            {chat.messages.length === 0 && !chat.isSending && <EmptyState onPick={async (t) => chat.send(t, { contextRefs: ctx, mode: aiMode, folderId: await getSendFolderId() })} />}
            {(() => {
              const toolResultsById = toolMaps.results;
              const toolDurationById = toolMaps.durations;
              return chat.messages.map((m, i) => {

                if (m.role === 'tool') return null; // merged into pill above
                const parts = (m.parts || []) as any[];
                const tcPart = parts.find((p) => p?.type === 'tool_calls');
                const hasText = parts.some((p) => p?.type === 'text' && (p.text || '').trim().length > 0);
                const persistedActs: WSAIActivity[] = tcPart
                  ? (tcPart.tool_calls || []).map((tc: any) => ({
                      toolCallId: tc.id,
                      name: tc.name,
                      args: tc.args,
                      result: toolResultsById.get(tc.id),
                      durationMs: toolDurationById.get(tc.id),
                      status: 'done' as const,
                    }))
                  : [];
                return (
                  <div key={m.id} className="space-y-2">
                    {persistedActs.length > 0 && (
                      <ActivityTimeline acts={persistedActs} persisted />
                    )}
                    {(hasText || m.role === 'user') && (
                      <MessageBubble
                        idx={i}
                        message={m}
                        focused={focusedIdx === i}
                        onCopy={() => {
                          const t = parts.filter((p: any) => p.type === 'text').map((p: any) => p.text).join('\n\n');
                          navigator.clipboard.writeText(t); toast.success('Copied');
                        }}
                        onRegenerate={m.role === 'assistant' ? () => regenerate(i) : undefined}
                        onEdit={m.role === 'user' ? () => editAndResend(i) : undefined}
                        onBranch={() => branchFrom(i)}
                      />
                    )}
                    {m.role === 'assistant' && m.metadata?.usage?.total_tokens > 0 && (
                      <UsageFooter usage={m.metadata.usage} />
                    )}
                  </div>
                );
              });
            })()}
            {chat.isSending && !chat.streamingText && <LiveStatus phase={chat.phase} acts={chat.activities} batch={chat.batch} />}
            {chat.activities.length > 0 && <ActivityTimeline acts={chat.activities} />}
            {chat.isSending && chat.lastUsage && chat.lastUsage.total_tokens > 0 && <UsageFooter usage={chat.lastUsage} live />}
            {chat.streamError && !chat.isSending && (
              <div className="flex gap-3 items-start -mx-2 px-2 py-2" role="alert">
                <AIAvatarGlyph size={32} />
                <div className="min-w-0 rounded-lg wsai-panel wsai-border border px-3 py-2.5">
                  <p className="text-sm wsai-text">
                    {chat.streamErrorQuota ? 'Gemini API key ka quota khatam ho gaya.' : 'Reply complete nahi ho paaya.'}
                  </p>
                  <p className="text-xs wsai-muted mt-1 break-words">{chat.streamError}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {chat.streamErrorQuota ? (
                      <>
                        {chat.model !== 'lite' && (
                          <Button variant="secondary" size="sm" className="h-9 px-2.5" onClick={() => { chat.setModel('lite'); retryLastTurn(); }}>
                            <Zap className="h-3.5 w-3.5 mr-1.5" /> Quick model se try karein
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="h-9 px-2.5" asChild>
                          <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer">
                            Billing / quota check karein
                          </a>
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button variant="secondary" size="sm" className="h-9 px-2.5" onClick={retryLastTurn}>
                          <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Dobara try karein
                        </Button>
                        <Button variant="ghost" size="sm" className="h-9 px-2.5" onClick={() => chat.reloadMessages()}>
                          <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Refresh chat
                        </Button>
                      </>
                    )}
                  </div>

                </div>
              </div>
            )}

            {chat.streamingText && (
              <MessageBubble
                idx={-1}
                message={{ id: 'stream', role: 'assistant', parts: [{ type: 'text', text: chat.streamingText }], metadata: null, created_at: '' } as any}
                streaming
              />
            )}
            {!chat.autoApprove && chat.proposals.length > 0 && (
              <div className="space-y-2">
                {chat.proposals.map((p) => (
                  <ProposalCard key={p.toolCallId} proposal={p} onApprove={() => chat.approve(p.toolCallId)} onReject={() => chat.reject(p.toolCallId)} />
                ))}
              </div>
            )}
            {chat.isSending && !chat.streamingText && !chat.activities.length && (
              <div className="flex items-center gap-2 text-xs wsai-muted pl-2 sm:pl-11">
                <span className="wsai-thinking-dot inline-block h-2 w-2 rounded-full wsai-accent-bg" />
                <span className="wsai-thinking-dot inline-block h-2 w-2 rounded-full wsai-accent-bg" style={{ animationDelay: '0.2s' }} />
                <span className="wsai-thinking-dot inline-block h-2 w-2 rounded-full wsai-accent-bg" style={{ animationDelay: '0.4s' }} />
                <span className="ml-1">Workspace AI is thinking…</span>
              </div>
            )}
          </div>

          {showJumpLatest && (
            <button
              onClick={() => scrollToBottom(true)}
              className="sticky bottom-4 float-right mr-4 wsai-accent-bg rounded-full h-10 w-10 shadow-lg flex items-center justify-center hover:opacity-90"
              aria-label="Jump to latest"
            >
              <ArrowDown className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Composer — big warm Claude-style box */}
        <div className="p-4 sm:p-6 wsai-bg">
          <div className="max-w-3xl mx-auto">
            {ctx.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {ctx.map((c, i) => (
                  <div key={`${c.type}:${c.id}`} className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border" style={{ background: 'hsl(var(--wsai-accent) / 0.12)', color: 'hsl(var(--wsai-accent))', borderColor: 'hsl(var(--wsai-accent) / 0.3)' }}>
                    <AtSign className="h-3 w-3" />
                    <span className="font-medium">{ctxLabel(c.type)}:</span>
                    <span className="truncate max-w-[140px]">{c.label || c.id.slice(0, 8)}</span>
                    <button onClick={() => setCtx((x) => x.filter((_, j) => j !== i))}><X className="h-3 w-3" /></button>
                  </div>
                ))}
              </div>
            )}
            {atts.length > 0 && (
              <div className="mb-2 wsai-surface wsai-border border rounded-2xl p-3 shadow-sm">
                <div className="flex items-center justify-between mb-2 px-1">
                  <div className="flex items-center gap-2 text-xs wsai-muted">
                    <Paperclip className="h-3.5 w-3.5" />
                    <span className="font-medium">
                      {atts.length} attachment{atts.length > 1 ? 's' : ''} ready to send
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="text-[11px] px-2 py-1 rounded-md wsai-hover wsai-muted hover:wsai-text"
                    >
                      + Add more
                    </button>
                    <button
                      type="button"
                      onClick={() => setAtts([])}
                      className="text-[11px] px-2 py-1 rounded-md wsai-hover text-destructive"
                    >
                      Clear all
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {atts.map((a, i) => (
                    a.kind === 'image' ? (
                      <div key={i} className="relative group/att">
                        <button
                          type="button"
                          title={a.name}
                          onClick={() => openLightbox(atts.map((x) => ({ url: x.url, name: x.name, kind: x.kind })), i)}
                          className="block"
                        >
                          <img src={a.url} alt={a.name} className="h-20 w-20 object-cover rounded-xl wsai-border border shadow-sm" />
                        </button>
                        <button
                          onClick={() => setAtts((x) => x.filter((_, j) => j !== i))}
                          className="absolute -top-1.5 -right-1.5 h-6 w-6 rounded-full bg-black/80 text-white flex items-center justify-center shadow-md hover:bg-black"
                          aria-label={`Remove ${a.name}`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent rounded-b-xl px-1.5 py-1 pointer-events-none">
                          <p className="text-[9px] text-white truncate">{a.name}</p>
                        </div>
                      </div>
                    ) : (
                      <div key={i} className="flex items-center gap-2 px-3 py-2 wsai-panel wsai-border border rounded-xl text-xs shadow-sm">
                        <div className="h-8 w-8 rounded-md wsai-surface flex items-center justify-center shrink-0">
                          <Paperclip className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="truncate max-w-[160px] font-medium">{a.name}</span>
                          <span className="wsai-muted uppercase text-[10px]">{a.kind}</span>
                        </div>
                        <button
                          onClick={() => setAtts((x) => x.filter((_, j) => j !== i))}
                          className="ml-1 h-6 w-6 rounded-full wsai-hover flex items-center justify-center shrink-0"
                          aria-label={`Remove ${a.name}`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )
                  ))}
                </div>
              </div>
            )}
            <div className="relative wsai-surface wsai-border border rounded-3xl shadow-sm wsai-ring-accent transition-shadow">
              {slashQuery !== null && (
                <SlashCommandPicker
                  query={slashQuery}
                  commands={slashCommands}
                  onPick={runSlashCommand}
                  onClose={() => setSlashQuery(null)}
                />
              )}
              {mentionQuery !== null && (
                <MentionPicker
                  query={mentionQuery}
                  onPick={pickMention}
                  onClose={() => setMentionQuery(null)}
                />
              )}
              <input ref={fileRef} type="file" multiple hidden onChange={(e) => onUpload(e.target.files)} />
              <Textarea
                ref={composerRef}
                value={input}
                onChange={(e) => onInputChange(e.target.value)}
                onPaste={(e) => {
                  const items = e.clipboardData?.items;
                  if (!items) return;
                  const files: File[] = [];
                  for (const it of Array.from(items)) {
                    if (it.kind === 'file') {
                      const f = it.getAsFile();
                      if (f) files.push(f);
                    }
                  }
                  if (files.length) {
                    e.preventDefault();
                    const dt = new DataTransfer();
                    files.forEach((f) => dt.items.add(f));
                    onUpload(dt.files);
                  }
                }}
                onDrop={(e) => {
                  if (e.dataTransfer?.files?.length) {
                    e.preventDefault();
                    onUpload(e.dataTransfer.files);
                  }
                }}
                onDragOver={(e) => { if (e.dataTransfer?.types?.includes('Files')) e.preventDefault(); }}
                onKeyDown={(e) => {
                  if ((mentionQuery !== null || slashQuery !== null) && ['ArrowUp', 'ArrowDown', 'Enter', 'Tab', 'Escape'].includes(e.key)) return;
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); }
                }}
                placeholder="Reply to Workspace AI… (type @ to mention, paste/drop images, Shift+Enter for newline)"
                rows={2}
                className="w-full min-h-[76px] max-h-[280px] resize-none border-0 focus-visible:ring-0 shadow-none bg-transparent px-5 pt-4 pb-14 text-[15px] leading-relaxed wsai-text placeholder:wsai-muted"
                disabled={chat.isSending || voice.state === 'recording' || voice.state === 'transcribing'}
              />

              {(voice.state === 'recording' || voice.state === 'transcribing') && (
                <div
                  className="absolute inset-x-0 top-0 bottom-14 flex items-center gap-3 px-4 wsai-surface rounded-t-3xl animate-in fade-in duration-150"
                  role="status"
                  aria-live="polite"
                >
                  <button
                    type="button"
                    onClick={voice.cancel}
                    disabled={voice.state === 'transcribing'}
                    className="h-8 w-8 shrink-0 inline-flex items-center justify-center rounded-full wsai-hover wsai-muted disabled:opacity-40"
                    aria-label="Cancel recording"
                    title="Cancel"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <VoiceWaveform
                      analyser={voice.analyserRef}
                      active={voice.state === 'recording'}
                    />
                  </div>
                  <span className="text-[12px] font-medium tabular-nums wsai-muted shrink-0">
                    {voice.state === 'transcribing'
                      ? (voice.pending > 0 ? `Transcribing… (${voice.pending})` : 'Transcribing…')
                      : `${Math.floor(voice.seconds / 60)}:${String(voice.seconds % 60).padStart(2, '0')} / ${Math.floor(voice.maxSeconds / 60)}:00`}
                  </span>
                  {voice.state === 'recording' && (
                    <button
                      type="button"
                      onClick={voice.stop}
                      className="h-9 w-9 shrink-0 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md hover:opacity-90"
                      aria-label="Stop and transcribe"
                      title="Stop and transcribe"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  )}
                  {voice.state === 'transcribing' && (
                    <Loader2 className="h-4 w-4 animate-spin wsai-muted shrink-0" />
                  )}
                </div>
              )}

              <div className="absolute left-2 bottom-2 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="h-9 w-9 inline-flex items-center justify-center rounded-full wsai-hover wsai-muted"
                  aria-label="Attach"
                  title="Attach file"
                  disabled={voice.state !== 'idle'}
                >
                  <Paperclip className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={voice.start}
                  disabled={voice.state !== 'idle' || chat.isSending}
                  className={cn(
                    "h-9 w-9 inline-flex items-center justify-center rounded-full wsai-hover wsai-muted disabled:opacity-50",
                    voice.state === 'recording' && "bg-destructive/10 text-destructive"
                  )}
                  aria-label="Voice input"
                  title="Voice input"
                >
                  {voice.state === 'transcribing'
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Mic className="h-4 w-4" />}
                </button>
              </div>

              <div className="absolute right-2 bottom-2 flex items-center gap-1">
                <span className="hidden sm:inline text-[10px] wsai-muted mr-1">
                  {voice.state === 'transcribing' && <span>Transcribing…</span>}
                  {voice.state === 'idle' && input.length > 0 && `${input.length} chars`}
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="h-9 inline-flex items-center gap-1 px-2.5 rounded-full wsai-hover wsai-muted text-xs font-medium"
                      title="AI model"
                      aria-label="AI model"
                    >
                      {MODEL_ICONS[chat.model as WSModel]}
                      <span className="hidden sm:inline">{MODEL_LABELS[chat.model as WSModel]}</span>
                      <ChevronDown className="h-3 w-3 opacity-60" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64 wsai-theme">
                    {(['fast', 'deep', 'lite'] as WSModel[]).map((m) => (
                      <DropdownMenuItem key={m} onClick={() => chat.setModel(m)} className="flex items-start gap-2.5 py-2">
                        <div className="mt-0.5 shrink-0">{MODEL_ICONS[m]}</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">{MODEL_LABELS[m]}</div>
                          <div className="text-[11px] wsai-muted">{MODEL_DESC[m]}</div>
                        </div>
                        {chat.model === m && <Check className="h-4 w-4 mt-0.5 opacity-80" />}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="h-9 inline-flex items-center gap-1 px-2.5 rounded-full wsai-hover wsai-muted text-xs font-medium"
                      title="Chat mode"
                      aria-label="Chat mode"
                    >
                      {aiMode === 'auto' && <Sparkles className="h-3.5 w-3.5" />}
                      {aiMode === 'viewer' && <MessageCircleQuestion className="h-3.5 w-3.5" />}
                      {aiMode === 'editor' && <Pencil className="h-3.5 w-3.5" />}
                      <span>{AI_MODE_LABELS[aiMode]}</span>
                      <ChevronDown className="h-3 w-3 opacity-60" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64 wsai-theme">
                    {(['auto','viewer','editor'] as AiMode[]).map((m) => (
                      <DropdownMenuItem key={m} onClick={() => setAiMode(m)} className="flex items-start gap-2.5 py-2">
                        <div className="mt-0.5 shrink-0">
                          {m === 'auto' && <Sparkles className="h-4 w-4" />}
                          {m === 'viewer' && <MessageCircleQuestion className="h-4 w-4" />}
                          {m === 'editor' && <Pencil className="h-4 w-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">{AI_MODE_LABELS[m]}</div>
                          <div className="text-[11px] wsai-muted">{AI_MODE_DESC[m]}</div>
                        </div>
                        {aiMode === m && <Check className="h-4 w-4 mt-0.5 opacity-80" />}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                {chat.isSending ? (
                  <button
                    onClick={chat.stop}
                    className="h-11 w-11 sm:h-10 sm:w-10 rounded-full wsai-accent-bg flex items-center justify-center shadow-md hover:opacity-90 transition-opacity"
                    aria-label="Stop"
                    title="Stop generating"
                  >
                    <Square className="h-4 w-4 fill-current" />
                  </button>
                ) : (
                  <button
                    onClick={onSend}
                    disabled={!input.trim() && !atts.length}
                    className={cn(
                      'h-11 w-11 sm:h-10 sm:w-10 rounded-full flex items-center justify-center shadow-md transition-all',
                      (!input.trim() && !atts.length)
                        ? 'opacity-40 cursor-not-allowed wsai-panel wsai-muted'
                        : 'wsai-accent-bg hover:opacity-90 hover:scale-105',
                    )}
                    aria-label="Send"
                    title="Send (Enter)"
                  >
                    <ArrowUp className="h-5 w-5" strokeWidth={2.5} />
                  </button>
                )}
              </div>
            </div>
            <p className="text-[10px] wsai-muted text-center mt-2">
              Workspace AI can make mistakes. Verify important actions before approving.
            </p>
          </div>
        </div>
        </>)}
      </main>

      <MemoriesPanel open={memOpen} onOpenChange={setMemOpen} refreshKey={chat.memoryEvent?.at || 0} />

      <Dialog open={trashDialogOpen} onOpenChange={setTrashDialogOpen}>
        <DialogContent className="wsai-theme wsai-surface wsai-border wsai-text sm:max-w-md rounded-2xl p-0 overflow-hidden">
          <DialogHeader className="px-5 pt-5 pb-2">
            <DialogTitle className="text-base font-semibold wsai-text flex items-center gap-2">
              <Trash className="h-4 w-4" /> Trash
              {chat.trashed.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full wsai-accent-bg ml-auto">{chat.trashed.length}</span>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="px-3 pb-2 max-h-[60vh] overflow-y-auto">
            {chat.trashed.length === 0 && (
              <p className="px-3 py-8 text-xs wsai-muted text-center italic">Trash is empty.</p>
            )}
            {chat.trashed.map((t) => (
              <div key={t.id} className="group flex items-center gap-1 px-2 py-2 rounded-lg wsai-hover text-sm">
                <Trash2 className="h-3.5 w-3.5 wsai-muted shrink-0" />
                <span className="flex-1 truncate wsai-muted line-through">{t.title}</span>
                <button
                  className="opacity-70 hover:opacity-100 p-1.5 rounded wsai-hover"
                  onClick={() => chat.restoreThread(t.id)}
                  title="Restore"
                  aria-label="Restore"
                ><Undo2 className="h-3.5 w-3.5" /></button>
                <button
                  className="opacity-70 hover:opacity-100 hover:text-destructive p-1.5 rounded wsai-hover"
                  onClick={() => { if (confirm('Delete forever?')) chat.permanentDeleteThread(t.id); }}
                  title="Delete forever"
                  aria-label="Delete forever"
                ><X className="h-3.5 w-3.5" /></button>
              </div>
            ))}
          </div>
          {chat.trashed.length > 0 && (
            <DialogFooter className="px-5 py-3 wsai-border border-t">
              <Button
                variant="outline"
                onClick={() => { if (confirm('Empty trash permanently?')) chat.emptyTrash(); }}
                className="ml-auto rounded-full text-destructive hover:text-destructive"
              >
                Empty trash
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}

function MainListView({
  kind, chat, threadsByFolder, hiddenThreadFolderIds, onOpenThread, onNewChat, onNewProject, onRenameThread, onRenameFolder,
}: {
  kind: 'chats-list' | 'projects-list';
  chat: any;
  threadsByFolder: Map<string | null, any[]>;
  hiddenThreadFolderIds?: Set<string>;
  onOpenThread: (id: string) => void;
  onNewChat: () => void;
  onNewProject: () => void;
  onRenameThread: (t: any) => void;
  onRenameFolder: (f: any) => void;
}) {
  const [q, setQ] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  if (kind === 'chats-list') {
    const query = q.trim().toLowerCase();
    const visibleThreads = hiddenThreadFolderIds
      ? chat.threads.filter((t: any) => !t.folder_id || !hiddenThreadFolderIds.has(t.folder_id))
      : chat.threads;
    const list = query
      ? visibleThreads.filter((t: any) => (t.title || '').toLowerCase().includes(query))
      : visibleThreads;
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8">
          <div className="flex items-center justify-between mb-5">
            <h1 className="text-2xl font-semibold wsai-text" style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}>Chats</h1>
            <button
              onClick={onNewChat}
              className="h-9 px-3 rounded-lg wsai-border border text-sm font-medium wsai-text wsai-hover inline-flex items-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" /> New chat
            </button>
          </div>
          <div className="relative mb-4">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 wsai-muted" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search chats…"
              className="h-11 pl-9 rounded-xl wsai-surface wsai-border wsai-text"
            />
          </div>
          <div className="wsai-surface wsai-border border rounded-xl overflow-hidden">
            {list.length === 0 && (
              <div className="px-4 py-10 text-center text-sm wsai-muted">
                {query ? 'Koi match nahi.' : 'No chats yet. Start a new conversation.'}
              </div>
            )}
            {list.map((t: any) => (
              <div
                key={t.id}
                onClick={(e) => {
                  const el = e.target as HTMLElement;
                  if (el.closest('[data-wsai-actions]')) return;
                  onOpenThread(t.id);
                }}
                onDoubleClick={(e) => { e.stopPropagation(); onRenameThread(t); }}
                className="group/row w-full flex items-center justify-between gap-3 px-4 py-3 wsai-hover border-b wsai-border last:border-b-0 cursor-pointer"
              >
                <span className="flex-1 truncate text-sm wsai-text">{t.title || 'Untitled'}</span>
                <span className="text-[11px] wsai-muted shrink-0 tabular-nums">
                  {(() => {
                    const ts = t.last_message_at || t.updated_at || t.created_at;
                    if (!ts) return '';
                    const d = Date.now() - new Date(ts).getTime();
                    const days = Math.floor(d / 86400000);
                    if (days === 0) return 'Today';
                    if (days === 1) return 'Yesterday';
                    if (days < 7) return `${days} days ago`;
                    if (days < 30) return `${Math.floor(days / 7)}w ago`;
                    return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
                  })()}
                </span>
                <div data-wsai-actions className="opacity-60 group-hover/row:opacity-100 transition-opacity">
                  <ThreadActionMenu t={t} chat={chat} onRename={() => onRenameThread(t)} />
                </div>
              </div>
            ))}

          </div>
        </div>
      </div>
    );
  }

  // projects-list
  const query = q.trim().toLowerCase();
  const projects = query
    ? chat.folders.filter((f: any) => (f.name || '').toLowerCase().includes(query))
    : chat.folders;
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-2xl font-semibold wsai-text" style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}>Projects</h1>
          <button
            onClick={onNewProject}
            className="h-9 px-3 rounded-lg wsai-border border text-sm font-medium wsai-text wsai-hover inline-flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" /> New project
          </button>
        </div>
        <div className="relative mb-4">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 wsai-muted" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search projects…"
            className="h-11 pl-9 rounded-xl wsai-surface wsai-border wsai-text"
          />
        </div>
        {projects.length === 0 ? (
          <div className="wsai-surface wsai-border border rounded-2xl px-6 py-16 text-center">
            <ProjectGlyph className="mx-auto mb-3 h-10 w-10" />
            <p className="text-sm wsai-text font-medium mb-1">Looking to start a project?</p>
            <p className="text-xs wsai-muted mb-4">Group related chats and keep context together.</p>
            <button
              onClick={onNewProject}
              className="h-9 px-4 rounded-lg wsai-accent-bg text-sm font-medium inline-flex items-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" /> New project
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {projects.map((f: any) => {
              const items = threadsByFolder.get(f.id) || [];
              const open = !!expanded[f.id];
              return (
                <div key={f.id} className="wsai-surface wsai-border border rounded-xl overflow-hidden">
                  <div className="group flex items-center gap-2 px-4 py-3 wsai-hover">
                    <button
                      onClick={() => setExpanded((s) => ({ ...s, [f.id]: !open }))}
                      className="p-1 rounded wsai-hover wsai-muted"
                      aria-label={open ? 'Collapse' : 'Expand'}
                    >
                      {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                    <ProjectGlyph />
                    <span className="flex-1 text-sm font-medium wsai-text truncate">{f.name}</span>
                    <span className="text-[11px] wsai-muted tabular-nums">{items.length} chat{items.length === 1 ? '' : 's'}</span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button type="button" className="wsai-menu-trigger" aria-label="Project options">
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="z-[100] w-52 rounded-xl p-1.5 wsai-theme wsai-surface wsai-border wsai-text shadow-xl">
                        <DropdownMenuItem className="rounded-lg py-2" onSelect={() => window.setTimeout(() => onRenameFolder(f), 0)}>
                          <Pencil className="h-4 w-4 mr-2.5" /> Rename
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="rounded-lg py-2 text-destructive focus:text-destructive"
                          onSelect={() => { if (confirm(`Delete project "${f.name}"? Chats will move to Unfiled.`)) chat.deleteFolder(f.id); }}
                        >
                          <Trash2 className="h-4 w-4 mr-2.5" /> Delete project
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {open && (
                    <div className="border-t wsai-border">
                      {items.length === 0 && (
                        <div className="px-4 py-4 text-xs wsai-muted italic">No chats in this project yet.</div>
                      )}
                      {items.map((t: any) => (
                        <div
                          key={t.id}
                          onClick={(e) => {
                            const el = e.target as HTMLElement;
                            if (el.closest('[data-wsai-actions]')) return;
                            onOpenThread(t.id);
                          }}
                          onDoubleClick={(e) => { e.stopPropagation(); onRenameThread(t); }}
                          className="group/row w-full flex items-center justify-between gap-3 px-6 py-2.5 wsai-hover border-b wsai-border last:border-b-0 cursor-pointer"
                        >
                          <span className="flex-1 truncate text-sm wsai-text">{t.title || 'Untitled'}</span>
                          <div data-wsai-actions className="opacity-60 group-hover/row:opacity-100 transition-opacity">
                            <ThreadActionMenu t={t} chat={chat} onRename={() => onRenameThread(t)} />
                          </div>
                        </div>
                      ))}

                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const ThreadRow = memo(function ThreadRow({ t, chat, onNav, onRename, onDragStart, hideIcon }: { t: any; chat: any; onNav: () => void; onRename: () => void; onDragStart: (e: React.DragEvent, id: string) => void; hideIcon?: boolean }) {
  const active = t.id === chat.threadId;
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(t.title || '');
  const [menuOpen, setMenuOpen] = useState(false);

  const commitRename = async () => {
    const v = name.trim();
    setRenaming(false);
    if (!v || v === t.title) return;
    await chat.renameThread(t.id, v);
    toast.success('Renamed');
  };

  return (
    <div
      draggable={!renaming}
      onDragStart={(e) => {
        const el = e.target as HTMLElement;
        if (el.closest('[data-wsai-actions]')) {
          e.preventDefault();
          return;
        }
        onDragStart(e, t.id);
      }}
      onClick={(e) => {
        if (renaming) return;
        const el = e.target as HTMLElement;
        if (el.closest('[data-wsai-actions]')) return;
        onNav();
      }}
      onDoubleClick={(e) => { e.stopPropagation(); setName(t.title || ''); setRenaming(true); }}
      className={cn(
        'group/thread relative flex min-w-0 items-center gap-1.5 px-2.5 py-2 rounded-lg cursor-pointer text-sm transition-colors',
        active ? 'wsai-accent-bg' : 'wsai-hover wsai-text',
      )}
    >
      {!hideIcon && <ChatGlyph active={active} className="!h-5 !w-5" />}
      {renaming ? (
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Enter') { e.preventDefault(); commitRename(); }
            if (e.key === 'Escape') { setRenaming(false); setName(t.title || ''); }
          }}
          onClick={(e) => e.stopPropagation()}
          className="min-w-0 flex-1 bg-transparent border wsai-border rounded px-1.5 py-0.5 text-sm outline-none focus:ring-2 wsai-ring-accent"
        />
      ) : (
        <span className={cn('min-w-0 flex-1 truncate pr-14', t.pinned && 'pr-20')}>{t.title}</span>
      )}
      {!renaming && (
        <div
          data-wsai-actions
          className={cn(
            'absolute right-1 top-1/2 z-10 flex -translate-y-1/2 items-center gap-0.5 transition-opacity duration-150',
            'opacity-100',
          )}
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
        >
          {t.pinned && (
            <span className={cn('wsai-inline-action', active && 'wsai-inline-action-active')} title="Pinned">
              <Pin className="h-3.5 w-3.5 fill-current" />
            </span>
          )}
          <button
            type="button"
            draggable={false}
            className={cn('wsai-menu-trigger shrink-0 hidden sm:inline-flex', active && 'text-current')}
            onClick={(e) => { e.stopPropagation(); onRename(); }}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label="Rename chat"
            title="Rename chat"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <ThreadActionMenu t={t} chat={chat} onRename={onRename} open={menuOpen} onOpenChange={setMenuOpen} />
        </div>
      )}
    </div>
  );
});

function ThreadActionMenu({
  t, chat, onRename, open, onOpenChange, buttonClassName,
}: {
  t: any; chat: any; onRename: () => void;
  open?: boolean; onOpenChange?: (v: boolean) => void;
  buttonClassName?: string;
}) {
  const [uncontrolled, setUncontrolled] = useState(false);
  const isOpen = open ?? uncontrolled;
  const setOpen = onOpenChange ?? setUncontrolled;
  return (
    <DropdownMenu open={isOpen} onOpenChange={setOpen} modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          draggable={false}
          className={cn('wsai-menu-trigger shrink-0', buttonClassName)}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label="Chat options: rename, move, pin, archive, delete"
          title="Edit chat options"
        ><MoreHorizontal className="h-4 w-4" /></button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="z-[100] w-60 rounded-xl p-1.5 wsai-theme wsai-surface wsai-border wsai-text shadow-xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          const k = e.key.toLowerCase();
          if (k === 's') { e.preventDefault(); chat.togglePin(t.id); setOpen(false); }
          else if (k === 'r') { e.preventDefault(); setOpen(false); window.setTimeout(onRename, 0); }
          else if (k === 'e') {
            e.preventDefault();
            chat.archiveThread(t.id);
            toast('Archived', { action: { label: 'Undo', onClick: () => chat.restoreThread(t.id) } });
            setOpen(false);
          }
          else if (k === 'd') {
            e.preventDefault();
            chat.deleteThread(t.id);
            toast('Moved to Trash', { action: { label: 'Undo', onClick: () => chat.restoreThread(t.id) } });
            setOpen(false);
          }
        }}
      >
        <DropdownMenuItem
          className="rounded-lg py-2"
          onSelect={async () => {
            const text = `${window.location.origin}/personal/ai/${t.id}`;
            try {
              if (navigator.share) await navigator.share({ title: t.title || 'Chat', url: text });
              else { await navigator.clipboard.writeText(text); toast.success('Link copied'); }
            } catch {}
          }}
        >
          <Share2 className="h-4 w-4 mr-2.5" />
          <span className="flex-1">Share</span>
        </DropdownMenuItem>
        <DropdownMenuItem className="rounded-lg py-2" onSelect={() => { setOpen(false); window.setTimeout(onRename, 0); }}>
          <Pencil className="h-4 w-4 mr-2.5" />
          <span className="flex-1">Rename</span>
          <DropdownMenuShortcut>R</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="rounded-lg py-2">
            <Folder className="h-4 w-4 mr-2.5" />
            <span className="flex-1">Move to project</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="z-[100] w-52 max-h-72 overflow-y-auto rounded-xl p-1.5 wsai-theme wsai-surface wsai-border wsai-text shadow-xl">
            <DropdownMenuItem
              className="rounded-lg py-2"
              disabled={t.folder_id == null}
              onSelect={() => chat.moveThreadToFolder(t.id, null)}
            >
              <X className="h-4 w-4 mr-2.5" /> Unfiled
            </DropdownMenuItem>
            {chat.folders.length === 0 && (
              <div className="px-2 py-1.5 text-xs wsai-muted">No projects yet</div>
            )}
            {chat.folders.map((f: any) => (
              <DropdownMenuItem
                key={f.id}
                className="rounded-lg py-2"
                disabled={t.folder_id === f.id}
                onSelect={() => chat.moveThreadToFolder(t.id, f.id)}
              >
                <ProjectGlyph className="mr-2.5" />
                <span className="truncate">{f.name}</span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="rounded-lg py-2"
              onSelect={() => {
                window.dispatchEvent(new CustomEvent('wsai:new-project', { detail: { threadId: t.id } }));
              }}
            >
              <FolderPlus className="h-4 w-4 mr-2.5" /> New project…
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuItem className="rounded-lg py-2" onSelect={() => chat.togglePin(t.id)}>
          <Pin className={cn('h-4 w-4 mr-2.5', t.pinned && 'fill-current')} />
          <span className="flex-1">{t.pinned ? 'Unpin chat' : 'Pin chat'}</span>
          <DropdownMenuShortcut>S</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="rounded-lg py-2"
          onSelect={() => {
            chat.archiveThread(t.id);
            toast('Archived', { action: { label: 'Undo', onClick: () => chat.restoreThread(t.id) } });
          }}
        >
          <Archive className="h-4 w-4 mr-2.5" />
          <span className="flex-1">Archive</span>
          <DropdownMenuShortcut>E</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="rounded-lg py-2 text-destructive focus:text-destructive focus:bg-destructive/10"
          onSelect={() => {
            chat.deleteThread(t.id);
            toast('Moved to Trash', { action: { label: 'Undo', onClick: () => chat.restoreThread(t.id) } });
          }}
        >
          <Trash2 className="h-4 w-4 mr-2.5" />
          <span className="flex-1">Delete</span>
          <DropdownMenuShortcut>D</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}


// ============ Message bubble with actions ============
const MessageBubble = memo(function MessageBubble({
  message, idx, focused, streaming,
  onCopy, onRegenerate, onEdit, onBranch,
}: {
  message: any; idx: number; focused?: boolean; streaming?: boolean;
  onCopy?: () => void; onRegenerate?: () => void; onEdit?: () => void; onBranch?: () => void;
}) {
  const openLightbox = useOpenLightbox();
  const isUser = message.role === 'user';
  const text = (message.parts || []).filter((p: any) => p.type === 'text').map((p: any) => p.text).join('\n\n');
  const meta = message.metadata || {};
  const allAtts = Array.isArray(meta.attachments) ? meta.attachments : [];
  const imgAtts = allAtts.filter((a: any) => a.kind === 'image');
  const fileAtts = allAtts.filter((a: any) => a.kind !== 'image');

  return (
    <div
      data-wsai-msg={idx}
      className={cn(
        'group flex gap-3 scroll-mt-24 rounded-xl transition-colors -mx-2 px-2 py-1',
        isUser && 'flex-row-reverse',
        focused && 'ring-2 ring-offset-2 ring-offset-transparent',
      )}
      style={focused ? { boxShadow: '0 0 0 2px hsl(var(--wsai-accent) / 0.4)' } : undefined}
    >
      {isUser ? (
        <div
          className="h-8 w-8 rounded-full shrink-0 flex items-center justify-center text-[11px] font-bold shadow-sm"
          style={{ background: 'hsl(var(--wsai-user-bg))', color: 'hsl(var(--wsai-user-fg))' }}
        >
          You
        </div>
      ) : (
        <AIAvatarGlyph size={32} live={streaming} />
      )}
      <div className={cn('flex-1 min-w-0 space-y-2', isUser && 'flex flex-col items-end')}>
        {imgAtts.length > 0 && (
          <div className={cn('flex flex-wrap gap-2', isUser && 'justify-end')}>
            {imgAtts.map((a: any, i: number) => (
              <button key={i} type="button" onClick={() => openLightbox(allAtts, allAtts.indexOf(a))} className="block">
                <img src={a.url} alt={a.name} className="max-w-[280px] max-h-[220px] rounded-xl wsai-border border shadow-sm hover:opacity-90 transition-opacity" />
              </button>
            ))}
          </div>
        )}
        {fileAtts.length > 0 && (
          <div className={cn('flex flex-wrap gap-2', isUser && 'justify-end')}>
            {fileAtts.map((a: any, i: number) => (
              <button key={i} type="button" onClick={() => openLightbox(allAtts, allAtts.indexOf(a))} className="flex items-center gap-2 px-3 py-2 wsai-surface wsai-border border rounded-xl text-xs shadow-sm hover:opacity-90 text-left">
                <div className="h-8 w-8 rounded-md wsai-panel flex items-center justify-center">
                  <Paperclip className="h-4 w-4" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="truncate max-w-[200px] font-medium">{a.name}</span>
                  <span className="wsai-muted uppercase text-[10px]">{a.kind}</span>
                </div>
              </button>
            ))}
          </div>
        )}
        {text && (
          isUser ? (
            <div className="rounded-2xl px-4 py-2.5 max-w-[85%] wsai-user-bubble">
              <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{text}</p>
            </div>
          ) : (
            <div className="prose prose-sm max-w-none wsai-text prose-p:my-2 prose-pre:my-2 prose-pre:p-0 prose-pre:bg-transparent prose-code:before:content-none prose-code:after:content-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight as any]}
                components={{
                  pre: ({ children, ...props }: any) => <CodeBlock {...props}>{children}</CodeBlock>,
                  code: ({ inline, className, children, ...props }: any) =>
                    inline ? (
                      <code className="wsai-panel px-1 py-0.5 rounded text-[0.85em]" {...props}>{children}</code>
                    ) : (
                      <code className={className} {...props}>{children}</code>
                    ),
                  a: ({ children, ...props }: any) => <a {...props} target="_blank" rel="noreferrer" style={{ color: 'hsl(var(--wsai-accent))' }}>{children}</a>,
                }}
              >{text}</ReactMarkdown>
              {streaming && <span className="inline-block ml-0.5 w-1.5 h-4 align-middle wsai-accent-bg animate-pulse rounded-sm" />}
            </div>
          )
        )}
        {!streaming && text && (
          <div className={cn('flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity', isUser && 'justify-end')}>
            {onCopy && <ActionBtn icon={<Copy className="h-3.5 w-3.5" />} label="Copy" onClick={onCopy} />}
            {onRegenerate && <ActionBtn icon={<RefreshCw className="h-3.5 w-3.5" />} label="Regenerate" onClick={onRegenerate} />}
            {onEdit && <ActionBtn icon={<Pencil className="h-3.5 w-3.5" />} label="Edit" onClick={onEdit} />}
            {onBranch && <ActionBtn icon={<GitBranch className="h-3.5 w-3.5" />} label="Branch" onClick={onBranch} />}
          </div>
        )}
      </div>
    </div>
  );
});

function ActionBtn({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 text-[11px] wsai-muted wsai-hover px-2 py-1.5 rounded-md min-h-[32px]"
      title={label}
      aria-label={label}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

// ============ Code block with copy button + language label ============
function CodeBlock({ children }: any) {
  const [copied, setCopied] = useState(false);
  const codeEl = (Array.isArray(children) ? children[0] : children) as any;
  const codeStr = extractText(codeEl);
  const langMatch = /language-(\w+)/.exec(codeEl?.props?.className || '');
  const lang = langMatch?.[1] || 'text';
  return (
    <div className="relative group/code my-3 rounded-lg overflow-hidden wsai-border border">
      <div className="flex items-center justify-between wsai-panel px-3 py-1.5 text-[10px] wsai-muted uppercase tracking-wider font-mono">
        <span>{lang}</span>
        <button
          onClick={() => { navigator.clipboard.writeText(codeStr); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
          className="inline-flex items-center gap-1 wsai-hover px-1.5 py-0.5 rounded"
        >
          {copied ? <><Check className="h-3 w-3" />Copied</> : <><Copy className="h-3 w-3" />Copy</>}
        </button>
      </div>
      <pre className="!m-0 !bg-transparent overflow-x-auto">{children}</pre>
    </div>
  );
}
function extractText(node: any): string {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (node.props?.children) return extractText(node.props.children);
  return '';
}

// ============ Activity Timeline — stacked Claude-artifact style ============
/** Live "what the AI is doing right now" line with the round AI mark. */
function LiveStatus({ phase, acts, batch }: { phase: 'idle' | 'thinking' | 'writing'; acts: WSAIActivity[]; batch?: { done: number; total: number; complete?: boolean } | null }) {
  const running = [...acts].reverse().find((a) => a.status === 'running') || acts[acts.length - 1];
  const writes = acts.filter((a) => /^(create|update|delete|commit)_/.test(a.name || ''));
  const done = writes.filter((a) => a.status === 'done').length;
  let label = phase === 'writing' ? 'Jawab likh raha hoon…' : 'Soch raha hoon…';
  if (running) {
    const p = toolPresentation(running.name);
    const detail = shortArgs(running.args);
    label = `${p.label}${detail ? ` · ${detail}` : ''}${running.status === 'running' ? '…' : ''}`;
  }
  return (
    <div className="flex gap-3 items-center -mx-2 px-2 py-1">
      <AIAvatarGlyph size={32} live />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="wsai-live-shimmer text-sm truncate">{label}</span>
          {!batch && writes.length > 1 && (
            <span className="text-[10px] font-mono wsai-muted shrink-0">{done}/{writes.length}</span>
          )}
          {batch && batch.total > 1 && (
            <span className="text-[10px] font-mono wsai-muted shrink-0">{batch.done}/{batch.total}</span>
          )}
        </div>
        {batch && batch.total > 1 && (
          <div className="mt-1.5 h-1 w-full max-w-[220px] rounded-full bg-current/10 overflow-hidden" role="progressbar" aria-valuenow={batch.done} aria-valuemin={0} aria-valuemax={batch.total}>
            <div
              className="h-full rounded-full bg-current/60 transition-all duration-300"
              style={{ width: `${Math.round((batch.done / Math.max(1, batch.total)) * 100)}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

const ActivityTimeline = memo(function ActivityTimeline({ acts, persisted }: { acts: WSAIActivity[]; persisted?: boolean }) {
  return (
    <div className="ml-0 sm:ml-11 wsai-surface wsai-border border rounded-xl overflow-hidden">
      <div className="px-3 py-2 wsai-panel wsai-border border-b flex items-center gap-2 text-[11px] font-semibold wsai-muted uppercase tracking-wider">
        <Zap className="h-3 w-3 wsai-accent" />
        <span>{persisted ? `Used ${acts.length} tool${acts.length !== 1 ? 's' : ''}` : `Working — ${acts.length} step${acts.length !== 1 ? 's' : ''}`}</span>
      </div>
      <div className="p-2 space-y-0.5">
        {acts.map((a, i) => (
          <TimelineStep key={a.toolCallId} act={a} last={i === acts.length - 1} />
        ))}
      </div>
    </div>
  );
});

function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.max(1, Math.round(ms))}ms`;
  return `${(ms / 1000).toFixed(ms < 10000 ? 1 : 0)}s`;
}

function UsageFooter({ usage, live }: { usage: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number; steps?: number }; live?: boolean }) {
  return (
    <div className="ml-0 sm:ml-11 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] wsai-muted font-mono">
      <span>{(usage.total_tokens || 0).toLocaleString()} tokens</span>
      <span>in {(usage.prompt_tokens || 0).toLocaleString()}</span>
      <span>out {(usage.completion_tokens || 0).toLocaleString()}</span>
      {!!usage.steps && <span>{usage.steps} step{usage.steps !== 1 ? 's' : ''}</span>}
      {live && <span className="wsai-accent">live</span>}
    </div>
  );
}

function TimelineStep({ act, last }: { act: WSAIActivity; last: boolean }) {
  const [open, setOpen] = useState(false);
  const { icon, label, tone } = toolPresentation(act.name);
  const running = act.status === 'running';
  return (
    <div className={cn('relative pl-1', !last && 'wsai-step-line')}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg wsai-hover text-left"
      >
        <div
          className={cn(
            'relative z-10 h-6 w-6 rounded-full flex items-center justify-center shrink-0 shadow-sm',
            running ? 'wsai-accent-bg' : 'wsai-panel wsai-border border',
          )}
        >
          {running ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3 wsai-accent" />}
        </div>
        <span className={cn('text-xs', tone)}>{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="text-sm wsai-text truncate">
            <span className="font-medium">{label}</span>
            <span className="wsai-muted ml-1">{shortArgs(act.args)}</span>
          </div>
        </div>
        <span className="text-[10px] wsai-muted font-mono">
          {running ? '…' : typeof act.durationMs === 'number' ? formatDuration(act.durationMs) : 'done'}
        </span>
        {open ? <ChevronDown className="h-3 w-3 wsai-muted" /> : <ChevronRight className="h-3 w-3 wsai-muted" />}
      </button>
      {open && (
        <div className="ml-9 mr-2 mb-2 space-y-2">
          <div>
            <div className="text-[10px] wsai-muted uppercase tracking-wider mb-1">Input</div>
            <pre className="text-[11px] wsai-panel wsai-border border p-2 rounded-md overflow-x-auto max-h-48">{JSON.stringify(act.args || {}, null, 2)}</pre>
          </div>
          {act.result !== undefined && (
            <div>
              <div className="text-[10px] wsai-muted uppercase tracking-wider mb-1">Result</div>
              <pre className="text-[11px] wsai-panel wsai-border border p-2 rounded-md overflow-x-auto max-h-48">{typeof act.result === 'string' ? act.result : JSON.stringify(act.result, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function toolPresentation(name: string): { icon: React.ReactNode; label: string; tone: string } {
  const n = name || '';
  if (n.startsWith('create_')) return { icon: <PlusCircle className="h-3.5 w-3.5" />, label: `Creating ${n.replace('create_', '')}`, tone: 'wsai-accent' };
  if (n.startsWith('update_') || n.startsWith('edit_')) return { icon: <FileEdit className="h-3.5 w-3.5" />, label: `Editing ${n.replace(/^(update_|edit_)/, '')}`, tone: 'wsai-accent' };
  if (n.startsWith('delete_')) return { icon: <Trash2 className="h-3.5 w-3.5" />, label: `Deleting ${n.replace('delete_', '')}`, tone: 'text-destructive' };
  if (n.startsWith('search_') || n.startsWith('find_') || n.startsWith('list_')) return { icon: <Search className="h-3.5 w-3.5" />, label: `Searching ${n.replace(/^(search_|find_|list_)/, '')}`, tone: 'wsai-muted' };
  if (n.startsWith('get_') || n.startsWith('read_')) return { icon: <Sparkles className="h-3.5 w-3.5" />, label: `Reading ${n.replace(/^(get_|read_)/, '')}`, tone: 'wsai-muted' };
  return { icon: <Zap className="h-3.5 w-3.5" />, label: n || 'Tool', tone: 'wsai-muted' };
}
function shortArgs(args: any): string {
  if (!args || typeof args !== 'object') return '';
  const keys = Object.keys(args).slice(0, 2);
  const parts = keys.map((k) => {
    const v = args[k];
    const s = typeof v === 'string' ? v : JSON.stringify(v);
    return `${k}: ${s.length > 28 ? s.slice(0, 28) + '…' : s}`;
  });
  return parts.length ? `· ${parts.join(', ')}` : '';
}

function ProposalCard({ proposal, onApprove, onReject }: { proposal: any; onApprove: () => void; onReject: () => void }) {
  return (
    <div className="ml-0 sm:ml-11 wsai-border border rounded-xl p-4 wsai-surface shadow-sm" style={{ borderColor: 'hsl(var(--wsai-accent) / 0.4)' }}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-semibold wsai-accent uppercase tracking-wider">Approve action</span>
      </div>
      <div className="text-sm wsai-text mb-3">{proposal.summary}</div>
      <details className="mb-3">
        <summary className="text-xs cursor-pointer wsai-muted hover:wsai-text">View details</summary>
        <pre className="text-[10px] mt-2 overflow-auto max-h-40 p-2 wsai-panel rounded">{JSON.stringify(proposal.args, null, 2)}</pre>
      </details>
      <div className="flex gap-2">
        <button onClick={onApprove} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium wsai-accent-bg hover:opacity-90">
          <Check className="h-3 w-3" /> Approve
        </button>
        <button onClick={onReject} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium wsai-border border wsai-hover">
          <X className="h-3 w-3" /> Reject
        </button>
      </div>
    </div>
  );
}

function MemoryUpdatedChip({ event, onView }: { event: { action: 'saved' | 'forgot'; kind?: string; content?: string; at: number } | null; onView: () => void }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!event) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 5000);
    return () => clearTimeout(t);
  }, [event?.at]);
  if (!event || !visible) return null;
  return (
    <div className="px-3 sm:px-6 pt-2 pointer-events-none">
      <div className="max-w-3xl mx-auto flex justify-center">
        <button
          onClick={onView}
          className="pointer-events-auto inline-flex items-center gap-2 px-3 py-1.5 rounded-full wsai-surface wsai-border border shadow-sm text-xs wsai-text hover:wsai-hover transition-all animate-in fade-in slide-in-from-top-2"
        >
          <Brain className="h-3.5 w-3.5 wsai-accent" />
          <span className="font-medium">
            {event.action === 'saved' ? 'Memory updated' : 'Memory removed'}
          </span>
          {event.content && (
            <span className="wsai-muted truncate max-w-[220px]">— {event.content}</span>
          )}
          <span className="wsai-accent underline underline-offset-2">View</span>
        </button>
      </div>
    </div>
  );
}

function EmptyState({ onPick }: { onPick: (t: string) => void }) {
  const prompts = [
    { icon: '📝', text: 'Show my top 5 pending todos' },
    { icon: '🎵', text: 'DistroKid accounts jinme is mahine payment aayi' },
    { icon: '✨', text: 'Create a note titled "Ideas for next release"' },
    { icon: '📸', text: 'Screenshot bhej ke release fill karo' },
  ];
  return (
    <div className="py-16 text-center space-y-8">
      <div>
        <div className="mx-auto h-16 w-16 rounded-2xl wsai-accent-bg flex items-center justify-center shadow-sm">
          <Sparkles className="h-8 w-8" />
        </div>
        <h2 className="mt-5 text-2xl font-semibold wsai-text tracking-tight">How can I help today?</h2>
        <p className="text-sm wsai-muted mt-2 max-w-md mx-auto">
          Notes, To-dos, DistroKid — sab ek jagah. Screenshots samajhta hai. Type <kbd className="px-1 py-0.5 rounded wsai-panel font-mono text-[10px]">@</kbd> to mention, <kbd className="px-1 py-0.5 rounded wsai-panel font-mono text-[10px]">⌘K</kbd> to search.
        </p>
      </div>

      <div className="max-w-lg mx-auto grid gap-2">
        {prompts.map((p) => (
          <button
            key={p.text}
            onClick={() => onPick(p.text)}
            className="flex items-center gap-3 text-left text-sm px-4 py-3 wsai-surface wsai-border border rounded-xl wsai-hover transition-colors wsai-text"
          >
            <span className="text-lg">{p.icon}</span>
            <span className="flex-1">{p.text}</span>
            <ArrowUp className="h-3.5 w-3.5 wsai-muted rotate-45" />
          </button>
        ))}
      </div>
    </div>
  );
}

function CreateProjectDialog({
  open, onOpenChange, onCreate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreate: (name: string) => Promise<void> | void;
}) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) { setName(''); setBusy(false); }
  }, [open]);

  const submit = async () => {
    const n = name.trim();
    if (!n || busy) return;
    setBusy(true);
    try {
      await onCreate(n);
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="wsai-theme wsai-surface wsai-border wsai-text sm:max-w-md rounded-2xl p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-2">
          <DialogTitle className="text-base font-semibold wsai-text">Create project</DialogTitle>
        </DialogHeader>

        <div className="px-5 pb-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium wsai-muted">Project name</label>
            <div className="relative">
              <div className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none">
                <ProjectGlyph />
              </div>
              <Input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }}
                placeholder="Copenhagen Trip"
                className="pl-11 h-12 rounded-xl wsai-panel wsai-border wsai-text"
              />
            </div>
          </div>

          <div className="flex gap-2.5 p-3 rounded-xl wsai-hover">
            <Lightbulb className="h-4 w-4 shrink-0 mt-0.5 wsai-muted" />
            <p className="text-xs wsai-muted leading-relaxed">
              Projects group related chats together. Move chats in and out anytime from the chat's ⋯ menu.
            </p>
          </div>
        </div>

        <DialogFooter className="px-5 py-4 wsai-border border-t">
          <Button
            onClick={submit}
            disabled={!name.trim() || busy}
            className="ml-auto wsai-accent-bg hover:opacity-90 rounded-full px-5"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create project'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


function RenameEntityDialog({
  open, onOpenChange, title, label, initialValue, placeholder, submitLabel, onRename,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  label: string;
  initialValue: string;
  placeholder: string;
  submitLabel: string;
  onRename: (value: string) => Promise<void> | void;
}) {
  const [value, setValue] = useState(initialValue);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setValue(initialValue);
      setBusy(false);
    }
  }, [open, initialValue]);

  const submit = async () => {
    const next = value.trim();
    if (!next || busy) return;
    setBusy(true);
    try {
      await onRename(next);
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="wsai-theme wsai-surface wsai-border wsai-text sm:max-w-md rounded-2xl p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-2">
          <DialogTitle className="text-base font-semibold wsai-text">{title}</DialogTitle>
        </DialogHeader>

        <div className="px-5 pb-5 space-y-2">
          <label className="text-xs font-medium wsai-muted">{label}</label>
          <Input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }}
            placeholder={placeholder}
            className="h-12 rounded-xl wsai-panel wsai-border wsai-text"
          />
        </div>

        <DialogFooter className="px-5 py-4 wsai-border border-t gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-full px-5">
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={!value.trim() || busy}
            className="wsai-accent-bg hover:opacity-90 rounded-full px-5"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
