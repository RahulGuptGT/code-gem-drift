import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { HelpCircle } from "lucide-react";
import { ThreadSidebar } from "./ThreadSidebar";
import { ChatPanel } from "./ChatPanel";
import { useSupportChat } from "./useSupportChat";

export function SupportChatDrawer() {
  const [open, setOpen] = useState(false);
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const chat = useSupportChat();

  // Ensure a thread exists when opening
  useEffect(() => {
    if (open && !chat.active) {
      chat.createNew();
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {!open && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            onClick={() => setOpen(true)}
            className="rounded-full h-14 px-5 bg-gradient-to-br from-primary via-primary to-accent shadow-xl shadow-primary/30 hover:shadow-2xl hover:shadow-primary/40 transition-all duration-300 group flex items-center gap-2 backdrop-blur"
            aria-label="Open Ramogu chat"
          >
            <span className="absolute inset-0 rounded-full bg-primary/30 animate-ping opacity-20" />
            <HelpCircle className="h-5 w-5 relative" />
            <span className="font-medium hidden sm:inline relative">Need Help?</span>
          </Button>
        </div>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="p-0 w-full sm:max-w-[680px] flex flex-row gap-0 border-l border-border/60 bg-background/40 backdrop-blur-2xl [&>button]:hidden"
        >
          <SheetTitle className="sr-only">Ramogu Support Chat</SheetTitle>

          {/* Desktop sidebar */}
          <div className="hidden md:flex">
            <ThreadSidebar
              threads={chat.threads}
              activeId={chat.activeId}
              onSelect={chat.setActiveId}
              onNew={chat.createNew}
              onDelete={chat.deleteThread}
              onRename={chat.renameThread}
            />
          </div>

          {/* Mobile sidebar overlay */}
          {mobileSidebar && (
            <div className="absolute inset-0 z-20 flex md:hidden">
              <ThreadSidebar
                threads={chat.threads}
                activeId={chat.activeId}
                onSelect={(id) => {
                  chat.setActiveId(id);
                  setMobileSidebar(false);
                }}
                onNew={() => {
                  chat.createNew();
                  setMobileSidebar(false);
                }}
                onDelete={chat.deleteThread}
                onRename={chat.renameThread}
                onClose={() => setMobileSidebar(false)}
              />
              <button
                aria-label="Close sidebar"
                className="flex-1 bg-background/40 backdrop-blur"
                onClick={() => setMobileSidebar(false)}
              />
            </div>
          )}

          <ChatPanel
            thread={chat.active}
            pageTitle={chat.pageContext.title}
            isLoading={chat.isLoading}
            isReadingPage={chat.isReadingPage}
            sessionId={chat.sessionId}
            onSend={chat.send}
            onStop={chat.stop}
            onRegenerate={chat.regenerate}
            onPersonaChange={chat.setPersona}
            onClose={() => setOpen(false)}
            onOpenSidebar={() => setMobileSidebar(true)}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
