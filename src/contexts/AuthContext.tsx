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

export const GUEST_INITIAL_DAYS = 60;
export const GUEST_EXTENSION_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

const addDaysIso = (value: number, days: number) =>
  new Date(value + days * DAY_MS).toISOString();

type AnonymousAwareUser = User & { is_anonymous?: boolean };

export const isGuestUser = (user: User | null | undefined) =>
  Boolean(
    (user as AnonymousAwareUser | null | undefined)?.is_anonymous === true ||
      user?.app_metadata?.provider === "anonymous",
  );

const guestExpiryFromUser = (user: User | null | undefined) => {
  const value = user?.user_metadata?.guest_expires_at;
  return typeof value === "string" && Number.isFinite(Date.parse(value))
    ? value
    : null;
};

export type AuthContextValue = {
  configured: boolean;
  loading: boolean;
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isGuest: boolean;
  guestExpiresAt: string | null;
  guestDaysRemaining: number | null;
  refreshProfile: () => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<string | null>;
  signUpWithPassword: (
    email: string,
    password: string,
    displayName: string,
  ) => Promise<string | null>;
  signInAsGuest: () => Promise<string | null>;
  extendGuestAccess: () => Promise<string | null>;
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
  const [clock, setClock] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 60 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

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

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        setSession(nextSession);
        setLoading(false);
      },
    );

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    void refreshProfile();
  }, [refreshProfile]);

  useEffect(() => {
    if (!supabase || !session?.user || !isGuestUser(session.user)) return;

    const expiry = guestExpiryFromUser(session.user);

    if (!expiry) {
      const startedAt = new Date().toISOString();
      void supabase.auth.updateUser({
        data: {
          ...session.user.user_metadata,
          display_name:
            session.user.user_metadata?.display_name || "Guest Fan",
          guest_started_at: startedAt,
          guest_expires_at: addDaysIso(Date.now(), GUEST_INITIAL_DAYS),
        },
      });
      return;
    }

    if (Date.parse(expiry) <= clock) {
      localStorage.setItem("fan26.guest-session-expired", "1");
      void supabase.auth.signOut().then(() => setProfile(null));
    }
  }, [clock, session?.user]);

  const signInWithPassword = useCallback(
    async (email: string, password: string) => {
      if (!supabase) return "Supabase is not configured.";
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return error?.message ?? null;
    },
    [],
  );

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

  const signInAsGuest = useCallback(async () => {
    if (!supabase) return "Supabase is not configured.";

    const now = Date.now();
    const { error } = await supabase.auth.signInAnonymously({
      options: {
        data: {
          display_name: "Guest Fan",
          guest_started_at: new Date(now).toISOString(),
          guest_expires_at: addDaysIso(now, GUEST_INITIAL_DAYS),
        },
      },
    });

    return error?.message ?? null;
  }, []);

  const extendGuestAccess = useCallback(async () => {
    if (!supabase || !session?.user || !isGuestUser(session.user)) {
      return "No guest session is active.";
    }

    const currentExpiry = guestExpiryFromUser(session.user);
    const base = Math.max(Date.now(), currentExpiry ? Date.parse(currentExpiry) : 0);
    const { error } = await supabase.auth.updateUser({
      data: {
        ...session.user.user_metadata,
        guest_expires_at: addDaysIso(base, GUEST_EXTENSION_DAYS),
      },
    });

    return error?.message ?? null;
  }, [session?.user]);

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

  const user = session?.user ?? null;
  const isGuest = isGuestUser(user);
  const guestExpiresAt = isGuest ? guestExpiryFromUser(user) : null;
  const guestDaysRemaining = guestExpiresAt
    ? Math.max(0, Math.ceil((Date.parse(guestExpiresAt) - clock) / DAY_MS))
    : null;

  const value = useMemo<AuthContextValue>(
    () => ({
      configured: isSupabaseConfigured,
      loading,
      user,
      session,
      profile,
      isGuest,
      guestExpiresAt,
      guestDaysRemaining,
      refreshProfile,
      signInWithPassword,
      signUpWithPassword,
      signInAsGuest,
      extendGuestAccess,
      signOut,
      updateProfile,
    }),
    [
      extendGuestAccess,
      guestDaysRemaining,
      guestExpiresAt,
      isGuest,
      loading,
      profile,
      refreshProfile,
      session,
      signInAsGuest,
      signInWithPassword,
      signOut,
      signUpWithPassword,
      updateProfile,
      user,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
};
