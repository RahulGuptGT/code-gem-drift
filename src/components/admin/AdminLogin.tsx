import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle } from "lucide-react";

export const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tempLogin, setTempLogin] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, isAdmin } = useAdminAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/heena/admin";

  // Enforce temp-login: if previous session was marked temporary and tab was closed, sign out on next load
  useEffect(() => {
    const isTemp = localStorage.getItem('admin_temp_login') === '1';
    const stillActive = sessionStorage.getItem('admin_temp_active') === '1';
    if (isTemp && !stillActive) {
      supabase.auth.signOut();
      localStorage.removeItem('admin_temp_login');
    }
  }, []);

  // Redirect to the original URL (or dashboard) if already logged in
  useEffect(() => {
    if (isAdmin) {
      navigate(redirectTo, { replace: true });
    }
  }, [isAdmin, navigate, redirectTo]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const { error: signInError } = await signIn(email, password);

    if (signInError) {
      setError(signInError.message || "Failed to sign in. Please check your credentials.");
      setIsLoading(false);
    } else {
      if (tempLogin) {
        localStorage.setItem('admin_temp_login', '1');
        sessionStorage.setItem('admin_temp_active', '1');
      } else {
        localStorage.removeItem('admin_temp_login');
        sessionStorage.removeItem('admin_temp_active');
      }
      navigate(redirectTo, { replace: true });
    }
  };


  return (
    <div className="flex items-center justify-center min-h-screen bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Admin Login</CardTitle>
          <CardDescription>
            Enter your credentials to access the Bihar Election admin dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4 mt-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <div className="flex items-start gap-3 rounded-md border border-border bg-muted/40 p-3">
              <Checkbox
                id="temp-login"
                checked={tempLogin}
                onCheckedChange={(v) => setTempLogin(v === true)}
                disabled={isLoading}
                className="mt-0.5"
              />
              <div className="space-y-0.5">
                <label
                  htmlFor="temp-login"
                  className="text-sm font-medium leading-none cursor-pointer"
                >
                  Temporary login
                </label>
                <p className="text-xs text-muted-foreground">
                  Tab band hote hi auto sign-out ho jayega. Public/shared device pe use karein.
                </p>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
