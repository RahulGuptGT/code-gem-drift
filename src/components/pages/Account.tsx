import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { TIER_LABEL, type Tier } from '@/integrations/supabase/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UniversalLoader } from '@/components/ui/UniversalLoader';
import { toast } from 'sonner';
import { Loader2, LogOut, ShieldCheck } from 'lucide-react';

function formatDate(value?: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function Account() {
  const { user, profile, membership, tier, isAdmin, isLoading, updateProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDisplayName(profile?.display_name ?? '');
    setBio(profile?.bio ?? '');
  }, [profile?.display_name, profile?.bio]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <UniversalLoader />
      </div>
    );
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await updateProfile({ display_name: displayName.trim() || null, bio: bio.trim() || null });
    setSaving(false);
    if (error) toast.error(error.message ?? 'Save nahi hua');
    else toast.success('Profile update ho gayi');
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/', { replace: true });
  };

  const planLabel = TIER_LABEL[(tier as Tier) ?? 'starter'] ?? 'Starter';
  const expires = formatDate(membership?.expires_at);

  return (
    <div className="section-container py-12">
      <div className="mx-auto max-w-3xl space-y-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">My account</h1>
            <p className="mt-1 text-muted-foreground">{user?.email}</p>
          </div>
          <div className="flex gap-2">
            {isAdmin && (
              <Button variant="outline" asChild>
                <Link to="/heena/admin">
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  Admin
                </Link>
              </Button>
            )}
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          </div>
        </div>

        <Card className="card-modern">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Your plan</CardTitle>
              <CardDescription>
                {expires ? `Renews / expires on ${expires}` : 'Lifetime access — koi expiry nahi'}
              </CardDescription>
            </div>
            <Badge variant="secondary" className="text-sm">{planLabel}</Badge>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button asChild>
              <Link to="/pricing">{tier === 'sovereign' ? 'View plans' : 'Upgrade plan'}</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/library">My library</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="card-modern">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Ye details site par tumhare naam ke saath dikh sakti hain.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="display-name">Display name</Label>
                <Input id="display-name" value={displayName} onChange={e => setDisplayName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea id="bio" rows={4} value={bio} onChange={e => setBio(e.target.value)} />
              </div>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save changes
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
