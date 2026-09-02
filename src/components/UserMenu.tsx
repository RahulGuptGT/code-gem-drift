import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { TIER_LABEL, type Tier } from '@/integrations/supabase/db';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { BookOpen, LogOut, ShieldCheck, Sparkles, User as UserIcon } from 'lucide-react';

function initials(name?: string | null, email?: string | null) {
  const source = (name ?? email ?? '?').trim();
  return source.slice(0, 1).toUpperCase();
}

export default function UserMenu({ onNavigate }: { onNavigate?: () => void }) {
  const { user, profile, tier, isAdmin, isLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (isLoading) {
    return <div className="h-9 w-9 animate-pulse rounded-full bg-muted" aria-hidden />;
  }

  if (!user) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return (
      <Button size="sm" asChild onClick={onNavigate}>
        <Link to={`/auth?redirect=${redirect}`}>Sign in</Link>
      </Button>
    );
  }

  const handleSignOut = async () => {
    onNavigate?.();
    await signOut();
    navigate('/', { replace: true });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground shadow-soft transition-transform hover:scale-105"
          aria-label="Account menu"
        >
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
          ) : (
            initials(profile?.display_name, user.email)
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="font-medium">{profile?.display_name ?? user.email}</div>
          <div className="text-xs font-normal text-muted-foreground">
            {TIER_LABEL[(tier as Tier) ?? 'starter']} plan
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild onClick={onNavigate}>
          <Link to="/account"><UserIcon className="mr-2 h-4 w-4" />My account</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild onClick={onNavigate}>
          <Link to="/library"><BookOpen className="mr-2 h-4 w-4" />My library</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild onClick={onNavigate}>
          <Link to="/pricing"><Sparkles className="mr-2 h-4 w-4" />Plans</Link>
        </DropdownMenuItem>
        {isAdmin && (
          <DropdownMenuItem asChild onClick={onNavigate}>
            <Link to="/heena/admin"><ShieldCheck className="mr-2 h-4 w-4" />Admin panel</Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
