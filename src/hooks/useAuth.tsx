import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { db, type Tier } from '@/integrations/supabase/db';
import { User, Session } from '@supabase/supabase-js';
import { useAuthEventLogger } from '@/hooks/useAuthEventLogger';

interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
}

export interface Membership {
  id: string;
  plan_slug: Tier;
  status: string;
  started_at: string;
  expires_at: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  membership: Membership | null;
  tier: Tier;
  isAdmin: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: any }>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useAuthEventLogger();

  const loadUserData = useCallback(async (userId: string) => {
    const [profileRes, membershipRes, roleRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
      db
        .from('memberships')
        .select('id, plan_slug, status, started_at, expires_at')
        .eq('user_id', userId)
        .eq('status', 'active')
        .maybeSingle(),
      supabase.from('user_roles').select('role').eq('user_id', userId).eq('role', 'admin').maybeSingle(),
    ]);

    setProfile((profileRes.data as Profile) ?? null);
    setMembership((membershipRes.data as Membership) ?? null);
    setIsAdmin(!!roleRes.data);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      if (nextSession?.user) {
        setTimeout(() => { void loadUserData(nextSession.user.id); }, 0);
      } else {
        setProfile(null);
        setMembership(null);
        setIsAdmin(false);
        setIsLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session: current } }) => {
      setSession(current);
      setUser(current?.user ?? null);
      if (current?.user) {
        void loadUserData(current.user.id);
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadUserData]);

  const refresh = useCallback(async () => {
    if (user) await loadUserData(user.id);
  }, [user, loadUserData]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string, displayName?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: displayName },
        emailRedirectTo: `${window.location.origin}/account`,
      },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setMembership(null);
    setIsAdmin(false);
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: new Error('Not logged in') };
    const { error } = await supabase.from('profiles').update(updates).eq('user_id', user.id);
    if (!error) await loadUserData(user.id);
    return { error };
  };

  const tier: Tier = (membership?.plan_slug as Tier) ?? (user ? 'starter' : 'public');

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        membership,
        tier,
        isAdmin,
        isLoading,
        signIn,
        signUp,
        signOut,
        updateProfile,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
