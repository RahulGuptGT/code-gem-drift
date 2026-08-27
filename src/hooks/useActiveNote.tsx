// Lightweight context so the site-wide Notion AI FAB can know the currently
// open note (used by NotepadChatPanel to scope "current note" context).
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type Ctx = {
  activeNoteId: string | null;
  setActiveNoteId: (id: string | null) => void;
};

const ActiveNoteContext = createContext<Ctx | null>(null);

export function ActiveNoteProvider({ children }: { children: ReactNode }) {
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  return (
    <ActiveNoteContext.Provider value={{ activeNoteId, setActiveNoteId }}>
      {children}
    </ActiveNoteContext.Provider>
  );
}

export function useActiveNote(): Ctx {
  const ctx = useContext(ActiveNoteContext);
  if (!ctx) return { activeNoteId: null, setActiveNoteId: () => {} };
  return ctx;
}

/** Helper for editor panes — sets activeNoteId on mount, clears on unmount. */
export function useRegisterActiveNote(noteId: string | null) {
  const { setActiveNoteId } = useActiveNote();
  useEffect(() => {
    setActiveNoteId(noteId);
    return () => setActiveNoteId(null);
  }, [noteId, setActiveNoteId]);
}
