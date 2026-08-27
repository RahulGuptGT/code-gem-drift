import { Link, useLocation, useParams } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { useMemo } from 'react';

// Static label table for known segments. Dynamic params (like :id) get resolved separately.
const LABELS: Record<string, string> = {
  '': 'Home',
  about: 'About',
  portfolio: 'Portfolio',
  contact: 'Contact',
  referrals: 'Referrals',
  'site-map': 'Site Map',
  app: 'Apps',
  pov: 'POV',
  'fund-rahul': 'Support',
  legal: 'Legal',
  'privacy-policy': 'Privacy Policy',
  'terms-and-conditions': 'Terms & Conditions',
  disclaimer: 'Disclaimer',
  'refund-policy': 'Refund Policy',
  'cancellation-policy': 'Cancellation Policy',
  heena: 'Dashboard',
  analytics: 'Analytics',
  contacts: 'Contacts',
  'url-shortener': 'URL Shortener',
  apps: 'Apps',
  'support-chat': 'Support Chat',
  'chatbot-settings': 'Chatbot',
  settings: 'Settings',
  personal: 'Personal',
  clock: 'Clock',
  biography: 'Biography',
  notepad: 'Notepad',
  notes: 'Notes',
  'to-dos': 'To-dos',
  database: 'Database',
  distrokid: 'Distrokid',
  accounts: 'Accounts',
  account: 'Account',
  earn: 'Earn',
  overview: 'Overview',
  releases: 'Releases',
  earnings: 'Earnings',
  withdrawals: 'Withdrawals',
  traffic: 'Traffic',
  behavior: 'Behavior',
  errors: 'Errors',
  philosophy: 'Philosophy',
  society: 'Society',
  politics: 'Politics',
  short_pov: 'Short POVs',
  websites: 'Websites',
  tools: 'Tools',
  upi: 'UPI',
  shopping: 'Shopping',
  food: 'Food',
};

const labelFor = (seg: string) =>
  LABELS[seg] || seg.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

interface BreadcrumbsProps {
  className?: string;
  /** Override label for the last segment (e.g. an account email) */
  lastLabel?: string;
}

export function Breadcrumbs({ className = '', lastLabel }: BreadcrumbsProps) {
  const { pathname } = useLocation();

  const crumbs = useMemo(() => {
    const segs = pathname.split('/').filter(Boolean);
    if (segs.length === 0) return [];
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return segs.map((seg, i) => {
      let label = labelFor(seg);
      if (UUID_RE.test(seg)) {
        const parent = segs[i - 1];
        if (parent === 'releases') label = 'Release';
        else if (parent === 'withdrawals') label = 'Withdrawal';
        else if (parent === 'artists') label = 'Artist';
        else label = 'Item';
      }
      return {
        seg,
        label,
        to: '/' + segs.slice(0, i + 1).join('/'),
        last: i === segs.length - 1,
      };
    });
  }, [pathname]);

  if (crumbs.length === 0) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className={`flex items-center gap-1 text-xs text-muted-foreground overflow-x-auto whitespace-nowrap py-2 px-3 sm:px-4 ${className}`}
    >
      <Link to="/" className="flex items-center gap-1 hover:text-foreground shrink-0">
        <Home className="h-3.5 w-3.5" />
        <span className="sr-only">Home</span>
      </Link>
      {crumbs.map(c => (
        <span key={c.to} className="flex items-center gap-1 shrink-0">
          <ChevronRight className="h-3 w-3 opacity-60" />
          {c.last ? (
            <span className="text-foreground font-medium truncate max-w-[12rem]">
              {lastLabel || c.label}
            </span>
          ) : (
            <Link to={c.to} className="hover:text-foreground truncate max-w-[10rem]">
              {c.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
