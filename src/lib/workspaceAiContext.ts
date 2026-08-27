import type { ContextRef } from '@/hooks/useWorkspaceAI';

// Encode: ?ctx=note:abc,release:def,todo:xyz
export function encodeCtxParam(refs: ContextRef[]): string {
  return refs.map(r => `${r.type}:${r.id}`).join(',');
}

export function parseCtxParam(v: string | null): ContextRef[] {
  if (!v) return [];
  return v.split(',').map(chunk => {
    const [type, id] = chunk.split(':');
    if (!type || !id) return null;
    if (!['note', 'todo', 'dk_account', 'dk_release', 'dk_withdrawal'].includes(type)) return null;
    return { type: type as ContextRef['type'], id };
  }).filter(Boolean) as ContextRef[];
}

export function ctxLabel(type: ContextRef['type']): string {
  switch (type) {
    case 'note': return 'Note';
    case 'todo': return 'Todo';
    case 'dk_account': return 'Account';
    case 'dk_release': return 'Release';
    case 'dk_withdrawal': return 'Withdrawal';
  }
}
