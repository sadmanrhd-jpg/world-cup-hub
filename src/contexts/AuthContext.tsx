import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { UserProfile } from "@/types/fanProfile";

export type AuthContextValue = {
  configured: boolean;
  loading: boolean;
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  refreshProfile: () => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<string | null>;
  signUpWithPassword: (
    email: string,
    password: string,
    displayName: string,
  ) => Promise<string | null>;
  signInWithGoogle: () => Promise<string | null>;
  signOut: () => Promise<void>;
  updateProfile: (values: {
    displayName?: string | null;
    favoriteTeamSlug?: string | null;
  }) => Promise<string | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const mapProfile = (row: Record<string, unknown>): UserProfile => ({
  id: String(row.id),
  displayName: typeof row.display_name === "string" ? row.display_name : null,
  avatarUrl: typeof row.avatar_url === "string" ? row.avatar_url : null,
  favoriteTeamSlug:
    typeof row.favorite_team_slug === "string" ? row.favorite_team_slug : null,
  createdAt: String(row.created_at ?? ""),
  updatedAt: String(row.updated_at ?? ""),
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const refreshProfile = useCallback(async () => {
    const userId = session?.user.id;
    if (!supabase || !userId) {
      setProfile(null);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url, favorite_team_slug, created_at, updated_at")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("Could not load profile", error);
      return;
    }

    setProfile(data ? mapProfile(data as Record<string, unknown>) : null);
  }, [session?.user.id]);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    void refreshProfile();
  }, [refreshProfile]);

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    if (!supabase) return "Supabase is not configured.";
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error?.message ?? null;
  }, []);

  const signUpWithPassword = useCallback(
    async (email: string, password: string, displayName: string) => {
      if (!supabase) return "Supabase is not configured.";
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName.trim() || email.split("@")[0] },
          emailRedirectTo: `${window.location.origin}/profile`,
        },
      });
      return error?.message ?? null;
    },
    [],
  );

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) return "Supabase is not configured.";
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/profile` },
    });
    return error?.message ?? null;
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  const updateProfile = useCallback(
    async (values: {
      displayName?: string | null;
      favoriteTeamSlug?: string | null;
    }) => {
      if (!supabase || !session?.user.id) return "You must be signed in.";
      const payload: Record<string, unknown> = { id: session.user.id };
      if ("displayName" in values) payload.display_name = values.displayName;
      if ("favoriteTeamSlug" in values) {
        payload.favorite_team_slug = values.favoriteTeamSlug;
      }

      const { error } = await supabase.from("profiles").upsert(payload);
      if (!error) await refreshProfile();
      return error?.message ?? null;
    },
    [refreshProfile, session?.user.id],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      configured: isSupabaseConfigured,
      loading,
      user: session?.user ?? null,
      session,
      profile,
      refreshProfile,
      signInWithPassword,
      signUpWithPassword,
      signInWithGoogle,
      signOut,
      updateProfile,
    }),
    [
      loading,
      profile,
      refreshProfile,
      session,
      signInWithGoogle,
      signInWithPassword,
      signOut,
      signUpWithPassword,
      updateProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
};
