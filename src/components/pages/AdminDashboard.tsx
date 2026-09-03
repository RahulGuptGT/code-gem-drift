import { useState } from 'react';
import { Navigate, Link, useLocation } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { MainAdminSidebar } from '@/components/admin/MainAdminSidebar';
import { DashboardOverview } from '@/components/admin/DashboardOverview';
import { ContactManagement } from '@/components/admin/ContactManagement';
import SiteSettingsManagement from '@/components/admin/SiteSettingsManagement';
import { ReferralLinksManagement } from '@/components/admin/ReferralLinksManagement';
import AdvancedAnalyticsDashboard from '@/components/admin/AdvancedAnalyticsDashboard';
import SupportChatManagement from '@/components/admin/SupportChatManagement';
import { ChatbotSettings } from '@/components/admin/ChatbotSettings';
import PortfolioManagement from '@/components/admin/PortfolioManagement';
import UrlShortenerManagement from '@/components/admin/UrlShortenerManagement';
import AppManagement from '@/components/admin/AppManagement';
import POVManagement from '@/components/admin/POVManagement';
import VisitorProfiles from '@/components/admin/VisitorProfiles';
import UsersManagement from '@/components/admin/UsersManagement';
import { Button } from '@/components/ui/button';
import { ExternalLink, Menu } from 'lucide-react';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { UniversalLoader } from "@/components/ui/UniversalLoader";

const pathToSection: Record<string, string> = {
  '/heena/admin': 'dashboard',
  '/heena/admin/analytics': 'analytics',
  '/heena/admin/visitor-profiles': 'visitor-profiles',
  '/heena/admin/users': 'users',
  '/heena/admin/contacts': 'contacts',
  '/heena/admin/portfolio': 'portfolio',
  '/heena/admin/referrals': 'referrals',
  '/heena/admin/url-shortener': 'url-shortener',
  '/heena/admin/apps': 'app-management',
  '/heena/admin/pov': 'pov',
  '/heena/admin/support-chat': 'support-chat',
  '/heena/admin/chatbot-settings': 'chatbot-settings',
  '/heena/admin/settings': 'settings',
};

const sectionToPublicUrl: Record<string, string | null> = {
  'dashboard': null,
  'analytics': null,
  'visitor-profiles': null,
  'users': null,
  'contacts': '/contact',
  'portfolio': '/portfolio',
  'referrals': '/referrals',
  'url-shortener': null,
  'app-management': '/portfolio/apps',
  'pov': '/pov',
  'support-chat': null,
  'chatbot-settings': null,
  'settings': '/',
};

function getActiveSection(pathname: string): string {
  const normalized = pathname.replace(/\/+$/, '') || '/';
  if (pathToSection[normalized]) return pathToSection[normalized];
  // Match prefixes for nested tab routes (e.g. /heena/admin/analytics/traffic)
  const sorted = Object.keys(pathToSection).sort((a, b) => b.length - a.length);
  for (const p of sorted) {
    if (p !== '/heena/admin' && (normalized === p || normalized.startsWith(p + '/'))) {
      return pathToSection[p];
    }
  }
  return 'not-found';
}

function AdminSectionNotFound() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="max-w-md rounded-xl border bg-card p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold">Ye admin page maujood nahi</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Is URL par koi admin section nahi hai. Sidebar se koi section chuno ya dashboard par wapas jao.
        </p>
        <Button asChild className="mt-6">
          <Link to="/heena/admin">Back to Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { isAdmin, isLoading, signOut } = useAdminAuth();
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const activeSection = getActiveSection(location.pathname);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <UniversalLoader />
      </div>
    );
  }

  if (!isAdmin) {
    // Only admin paths are worth preserving; never re-encode an existing
    // ?redirect= value, otherwise the URL nests infinitely.
    const currentPath =
      typeof window !== 'undefined' ? window.location.pathname : location.pathname;
    const target = currentPath.startsWith('/heena/admin') ? currentPath : '/heena/admin';
    return <Navigate to={`/heena?redirect=${encodeURIComponent(target)}`} replace />;
  }



  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard': return <DashboardOverview />;
      case 'analytics': return <AdvancedAnalyticsDashboard />;
      case 'visitor-profiles': return <VisitorProfiles />;
      case 'users': return <UsersManagement />;
      case 'contacts': return <ContactManagement />;
      case 'portfolio': return <PortfolioManagement />;
      case 'referrals': return <ReferralLinksManagement />;
      case 'url-shortener': return <UrlShortenerManagement />;
      case 'app-management': return <AppManagement />;
      case 'pov': return <POVManagement />;
      case 'support-chat': return <SupportChatManagement />;
      case 'chatbot-settings': return <ChatbotSettings />;
      case 'settings': return <SiteSettingsManagement />;
      default: return <AdminSectionNotFound />;
    }
  };

  const publicUrl = sectionToPublicUrl[activeSection];

  return (
    <div className="min-h-screen flex w-full bg-background">
      {!sidebarCollapsed && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarCollapsed(true)}
        />
      )}
      
      <MainAdminSidebar
        onSignOut={signOut}
        isCollapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      
      <main className="flex-1 overflow-auto">
        <div className="lg:hidden fixed top-4 left-4 z-30">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="h-10 w-10 bg-background shadow-lg"
            aria-label="Toggle menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
        
        {(
          <>
            <Breadcrumbs />
            <div className="container mx-auto p-4 sm:p-6">
              {publicUrl && (
                <div className="flex justify-end mb-4">
                  <Button variant="outline" asChild>
                    <Link to={publicUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Site
                    </Link>
                  </Button>
                </div>
              )}
              {renderContent()}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
