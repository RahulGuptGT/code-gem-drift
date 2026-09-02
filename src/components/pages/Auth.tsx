import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

function safeRedirect(value: string | null): string {
  if (!value) return '/account';
  if (!value.startsWith('/') || value.startsWith('//')) return '/account';
  return value;
}

export default function Auth() {
  const { user, isLoading, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = safeRedirect(searchParams.get('redirect'));

  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [confirmSent, setConfirmSent] = useState(false);

  useEffect(() => {
    if (!isLoading && user) navigate(redirectTo, { replace: true });
  }, [user, isLoading, navigate, redirectTo]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await signIn(email.trim(), password);
    setBusy(false);
    if (error) {
      toast.error(error.message ?? 'Sign in nahi ho paya');
      return;
    }
    toast.success('Welcome back!');
    navigate(redirectTo, { replace: true });
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('Password kam se kam 6 characters ka rakho');
      return;
    }
    setBusy(true);
    const { error } = await signUp(email.trim(), password, displayName.trim() || undefined);
    setBusy(false);
    if (error) {
      toast.error(error.message ?? 'Account nahi ban paya');
      return;
    }
    setConfirmSent(true);
    toast.success('Account ban gaya — email confirm karo');
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      toast.error('Pehle apna email daalo');
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success('Password reset link email par bhej diya');
  };

  return (
    <div className="section-container py-16">
      <div className="mx-auto max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">Welcome</h1>
          <p className="mt-2 text-muted-foreground">
            Account banao ya sign in karo — members-only posts aur book chapters unlock karne ke liye.
          </p>
        </div>

        {confirmSent ? (
          <Card className="card-modern">
            <CardHeader>
              <CardTitle>Email confirm karo</CardTitle>
              <CardDescription>
                Humne {email} par ek confirmation link bheja hai. Link click karne ke baad tum
                automatically sign in ho jaoge.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" onClick={() => setConfirmSent(false)}>
                Wapas jao
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="card-modern">
            <CardContent className="pt-6">
              <Tabs value={mode} onValueChange={v => setMode(v as 'signin' | 'signup')}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="signin">Sign in</TabsTrigger>
                  <TabsTrigger value="signup">Create account</TabsTrigger>
                </TabsList>

                <TabsContent value="signin">
                  <form onSubmit={handleSignIn} className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="signin-email">Email</Label>
                      <Input
                        id="signin-email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signin-password">Password</Label>
                      <Input
                        id="signin-password"
                        type="password"
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={busy}>
                      {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Sign in
                    </Button>
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="w-full text-sm text-muted-foreground hover:text-foreground"
                    >
                      Password bhool gaye?
                    </button>
                  </form>
                </TabsContent>

                <TabsContent value="signup">
                  <form onSubmit={handleSignUp} className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name">Name</Label>
                      <Input
                        id="signup-name"
                        autoComplete="name"
                        value={displayName}
                        onChange={e => setDisplayName(e.target.value)}
                        placeholder="Tumhara naam"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <Input
                        id="signup-password"
                        type="password"
                        autoComplete="new-password"
                        required
                        minLength={6}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={busy}>
                      {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Create account
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Account banane ka matlab hai ki tum{' '}
          <Link to="/legal/terms-and-conditions" className="underline">Terms</Link> aur{' '}
          <Link to="/legal/privacy-policy" className="underline">Privacy Policy</Link> se agree karte ho.
        </p>
      </div>
    </div>
  );
}
