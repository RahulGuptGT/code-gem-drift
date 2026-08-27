import { ReactNode, useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

const LEGAL_PAGES = [
  { path: "/legal/privacy-policy", label: "Privacy Policy" },
  { path: "/legal/terms-and-conditions", label: "Terms & Conditions" },
  { path: "/legal/disclaimer", label: "Disclaimer" },
  { path: "/legal/refund-policy", label: "Refund Policy" },
  { path: "/legal/cancellation-policy", label: "Cancellation Policy" },
];

interface LegalLayoutProps {
  title: string;
  description: string;
  lastUpdated?: string;
  children: ReactNode;
  currentPath: string;
}

const LegalLayout = ({ title, description, lastUpdated = "April 24, 2026", children, currentPath }: LegalLayoutProps) => {
  useEffect(() => {
    document.title = `${title} | Rahul Gupta`;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", description);
  }, [title, description]);

  return (
    <div className="min-h-screen bg-background">
      <div className="section-container py-10 md:py-14">
        {/* Breadcrumb */}
        <nav className="flex items-center text-sm text-muted-foreground mb-6" aria-label="Breadcrumb">
          <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
          <ChevronRight className="w-4 h-4 mx-1" />
          <span className="text-foreground">Legal</span>
          <ChevronRight className="w-4 h-4 mx-1" />
          <span className="text-foreground font-medium">{title}</span>
        </nav>

        <div className="grid lg:grid-cols-[240px_1fr] gap-8">
          {/* Sidebar */}
          <aside className="lg:sticky lg:top-20 lg:self-start">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Legal
            </h2>
            <ul className="space-y-1">
              {LEGAL_PAGES.map((page) => {
                const active = page.path === currentPath;
                return (
                  <li key={page.path}>
                    <Link
                      to={page.path}
                      className={`block px-3 py-2 rounded-md text-sm transition-colors ${
                        active
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      }`}
                    >
                      {page.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </aside>

          {/* Content */}
          <article className="max-w-3xl">
            <header className="mb-8 pb-6 border-b border-border">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{title}</h1>
              <p className="text-muted-foreground mt-2">{description}</p>
              <p className="text-xs text-muted-foreground mt-3">Last updated: {lastUpdated}</p>
            </header>

            <div className="prose-legal space-y-6 text-foreground/90 leading-relaxed">
              {children}
            </div>

            <footer className="mt-12 pt-6 border-t border-border text-sm text-muted-foreground">
              <p>
                Questions? <Link to="/contact" className="text-primary hover:underline">Contact me</Link>.
              </p>
            </footer>
          </article>
        </div>
      </div>
    </div>
  );
};

export default LegalLayout;
export { LEGAL_PAGES };
