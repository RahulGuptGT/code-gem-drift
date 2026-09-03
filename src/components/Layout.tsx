import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import SocialIcons from "@/components/SocialIcons";
import SupportChatBot from "@/components/SupportChatBot";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import UserMenu from "@/components/UserMenu";
import { cn } from "@/lib/utils";

const Layout = ({ children }: { children: React.ReactNode }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  const navigation = [
    { name: "Home", href: "/" },
    { name: "Portfolio", href: "/portfolio" },
    { name: "My POVs", href: "/pov", highlight: true },
    { name: "Referrals", href: "/referrals" },
    { name: "Plans", href: "/pricing" },
  ];

  const isActiveRoute = (href: string) => {
    if (href === "/" && location.pathname === "/") return true;
    if (href !== "/" && location.pathname.startsWith(href)) return true;
    return false;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border shadow-soft">
        <div className="section-container">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-3">
              <span className="font-signature text-3xl text-primary">
                Rahul Gupta
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-6">
              {navigation.map(item => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "nav-link transition-all duration-200",
                    isActiveRoute(item.href) && "nav-link-active",
                    item.highlight && !isActiveRoute(item.href) && "text-secondary font-semibold"
                  )}
                >
                  {item.name}
                </Link>
              ))}
              <UserMenu />
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center gap-2">
              <UserMenu />
              <Button variant="ghost" size="sm" onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-foreground">
                {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {isMenuOpen && (
            <div className="md:hidden py-4 border-t border-border animate-in slide-in-from-top-2">
              <div className="flex flex-col space-y-3">
                {navigation.map(item => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      "nav-link block py-2",
                      isActiveRoute(item.href) && "nav-link-active",
                      item.highlight && !isActiveRoute(item.href) && "text-secondary font-semibold"
                    )}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Breadcrumbs (hidden on root) */}
      {location.pathname !== '/' && (
        <div className="border-b bg-muted/30">
          <div className="section-container">
            <Breadcrumbs />
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="bg-card border-t border-border mt-16">
        <div className="section-container py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="font-semibold text-lg mb-4">Legal</h3>
              <ul className="space-y-2">
                <li><Link to="/legal/privacy-policy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</Link></li>
                <li><Link to="/legal/terms-and-conditions" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Terms & Conditions</Link></li>
                <li><Link to="/legal/disclaimer" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Disclaimer</Link></li>
                <li><Link to="/legal/refund-policy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Refund Policy</Link></li>
                <li><Link to="/legal/cancellation-policy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Cancellation Policy</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-4">Quick Links</h3>
              <ul className="space-y-2">
                {navigation.map(item => (
                  <li key={item.name}>
                    <Link to={item.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {item.name}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link to="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    About Me
                  </Link>
                </li>
                <li>
                  <Link to="/contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-4">Resources</h3>
              <ul className="space-y-2">
                <li>
                  <Link to="/referrals" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Referral Links
                  </Link>
                </li>
                <li>
                  <Link to="/portfolio/apps" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    My Apps
                  </Link>
                </li>
                <li>
                  <Link to="/fund-rahul" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Support My Work
                  </Link>
                </li>
                <li>
                  <Link to="/site-map" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Site Map
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="mb-4 font-semibold text-lg">Connect With Me</h3>
              <SocialIcons size="sm" variant="ghost" />
            </div>
          </div>

          <div className="pt-6 border-t border-border text-center">
            <p className="text-sm text-muted-foreground">© 2026 Rahul Gupta. All rights reserved.</p>
          </div>
        </div>
      </footer>

      <SupportChatBot />
    </div>
  );
};

export default Layout;
