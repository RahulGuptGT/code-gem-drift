import { 
  LayoutDashboard, 
  MessageSquare, 
  Link2, 
  Settings, 
  LogOut,
  Menu,
  BarChart3,
  MessageCircle,
  Bot,
  Briefcase,
  LinkIcon,
  Smartphone,
  Brain,
  Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Link, useLocation } from 'react-router-dom';

interface MainAdminSidebarProps {
  onSignOut: () => void;
  isCollapsed: boolean;
  onToggle: () => void;
}

interface NavGroup {
  label: string;
  items: { id: string; label: string; icon: any; path: string }[];
}

const navigationGroups: NavGroup[] = [
  {
    label: 'OVERVIEW',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/heena/admin' },
      { id: 'heena', label: 'Heena ✨ (DK)', icon: Sparkles, path: '/heena/admin/heena' },
      { id: 'binod', label: 'Binod 🤖 (Admin)', icon: Bot, path: '/heena/admin/binod' },
      { id: 'analytics', label: 'Website Reach', icon: BarChart3, path: '/heena/admin/analytics' },
      { id: 'visitor-profiles', label: 'Visitor Profiles', icon: Eye, path: '/heena/admin/visitor-profiles' },
    ],
  },
  {
    label: 'CONTENT',
    items: [
      { id: 'portfolio', label: 'Portfolio', icon: Briefcase, path: '/heena/admin/portfolio' },
      { id: 'pov', label: 'Rahul POV', icon: Brain, path: '/heena/admin/pov' },
    ],
  },
  {
    label: 'PERSONAL',
    items: [
      { id: 'personal', label: 'Personal Hub', icon: Lock, path: '/heena/admin/personal' },
      { id: 'personal-clock', label: 'Clock', icon: Clock, path: '/heena/admin/personal/clock' },
      { id: 'personal-biography', label: 'Biography', icon: BookOpen, path: '/heena/admin/personal/biography' },
      { id: 'personal-notepad', label: 'Notepad', icon: NotebookPen, path: '/heena/admin/personal/notepad' },
      { id: 'personal-profile', label: 'People', icon: Users, path: '/heena/admin/personal/profile' },
    ],
  },
  {
    label: 'TOOLS',
    items: [
      { id: 'referrals', label: 'Referral Links', icon: Link2, path: '/heena/admin/referrals' },
      { id: 'url-shortener', label: 'URL Shortener', icon: LinkIcon, path: '/heena/admin/url-shortener' },
      { id: 'app-management', label: 'My Apps', icon: Smartphone, path: '/heena/admin/apps' },
    ],
  },
  {
    label: 'COMMUNICATION',
    items: [
      { id: 'contacts', label: 'Contact Messages', icon: MessageSquare, path: '/heena/admin/contacts' },
      { id: 'support-chat', label: 'Support Chat', icon: MessageCircle, path: '/heena/admin/support-chat' },
      { id: 'chatbot-settings', label: 'Chatbot Settings', icon: Bot, path: '/heena/admin/chatbot-settings' },
    ],
  },
  {
    label: 'SETTINGS',
    items: [
      { id: 'settings', label: 'Site Settings', icon: Settings, path: '/heena/admin/settings' },
    ],
  },
];

export const MainAdminSidebar = ({ 
  onSignOut, 
  isCollapsed, 
  onToggle 
}: MainAdminSidebarProps) => {
  const location = useLocation();
  
  const isActive = (path: string) => {
    if (path === '/heena/admin') return location.pathname === '/heena/admin';
    return location.pathname === path;
  };

  return (
    <aside className={cn(
      "bg-card border-r flex flex-col h-screen transition-all duration-300 z-50",
      isCollapsed ? "w-16 -translate-x-full lg:translate-x-0" : "w-64",
      "fixed lg:sticky top-0"
    )}>
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="h-8 w-8"
          aria-label="Toggle sidebar"
        >
          <Menu className="h-5 w-5" />
        </Button>
        {!isCollapsed && (
          <div className="flex-1 ml-2">
            <h2 className="font-bold text-lg">Admin Studio</h2>
            <p className="text-xs text-muted-foreground">Content Manager</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto">
        {navigationGroups.map((group, groupIndex) => (
          <div key={group.label}>
            {groupIndex > 0 && <div className="mx-3 border-t border-border" />}
            
            {!isCollapsed && (
              <div className="px-4 pt-4 pb-1">
                <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                  {group.label}
                </span>
              </div>
            )}
            
            <div className="px-2 py-1 space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.id}
                    to={item.path}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors relative",
                      active
                        ? "bg-primary/10 text-primary font-medium"
                        : "hover:bg-muted text-muted-foreground",
                      isCollapsed && "justify-center"
                    )}
                    title={isCollapsed ? item.label : undefined}
                    onClick={() => {
                      if (window.innerWidth < 1024) onToggle();
                    }}
                  >
                    {active && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-primary rounded-r-full" />
                    )}
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    {!isCollapsed && <span>{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Sign Out - pinned bottom */}
      <div className="p-2 border-t">
        <Button
          variant="ghost"
          className={cn(
            "w-full gap-3",
            isCollapsed ? "justify-center px-0" : "justify-start"
          )}
          onClick={onSignOut}
          title={isCollapsed ? "Sign Out" : undefined}
        >
          <LogOut className="h-5 w-5" />
          {!isCollapsed && <span>Sign Out</span>}
        </Button>
      </div>
    </aside>
  );
};
