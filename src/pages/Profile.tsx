import { FormEvent, useEffect, useState } from "react";
import {
  CircleUserRound,
  Crown,
  Gamepad2,
  Loader2,
  LogOut,
  Save,
  Sparkles,
  Trophy,
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import AuthPanel from "@/components/auth/AuthPanel";
import { useAuth } from "@/contexts/AuthContext";
import { TEAMS } from "@/data/wc26";
import { fetchSavedBestXi } from "@/services/bestXiService";
import { fetchMiniGameSummary } from "@/services/progressService";
import type { MiniGameSummary } from "@/types/fanProfile";

const emptySummary: MiniGameSummary = {
  gamesPlayed: 0,
  totalGoals: 0,
  totalShots: 0,
  totalSavesFaced: 0,
  totalMisses: 0,
  bestScore: 0,
  bestAccuracy: 0,
  mostUsedTeam: null,
};

const Profile = () => {
  const {
    configured,
    loading,
    user,
    profile,
    signOut,
    updateProfile,
  } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [favoriteTeamSlug, setFavoriteTeamSlug] = useState("");
  const [summary, setSummary] = useState<MiniGameSummary>(emptySummary);
  const [savedCount, setSavedCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [dashboardLoading, setDashboardLoading] = useState(false);

  useEffect(() => {
    setDisplayName(profile?.displayName ?? "");
    setFavoriteTeamSlug(profile?.favoriteTeamSlug ?? "");
  }, [profile]);

  useEffect(() => {
    if (!user) {
      setSummary(emptySummary);
      setSavedCount(0);
      return;
    }

    let cancelled = false;
    setDashboardLoading(true);
    Promise.all([fetchMiniGameSummary(user.id), fetchSavedBestXi(user.id)])
      .then(([nextSummary, squads]) => {
        if (cancelled) return;
        setSummary(nextSummary);
        setSavedCount(squads.length);
      })
      .catch((error) => console.error(error))
      .finally(() => {
        if (!cancelled) setDashboardLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  const submitProfile = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const error = await updateProfile({
      displayName: displayName.trim() || null,
      favoriteTeamSlug: favoriteTeamSlug || null,
    });
    setSaving(false);
    if (error) toast.error(error);
    else toast.success("Profile updated.");
  };

  if (loading) {
    return (
      <div className="container flex min-h-[60vh] items-center justify-center gap-2 py-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin text-primary" /> Loading profile
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container grid gap-8 py-10 md:py-14 lg:grid-cols-[1fr_460px] lg:items-center">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-primary">
            <CircleUserRound className="h-4 w-4" /> Fan profile
          </div>
          <h1 className="mt-3 text-4xl font-black md:text-6xl">Keep your World Cup choices.</h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
            Log in to save predictions, Best XI teams and penalty challenge results across devices.
          </p>
          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            {[
              { icon: Sparkles, title: "Predictions", text: "Keep the full tournament bracket synced." },
              { icon: Crown, title: "Best XI", text: "Save up to five named squads." },
              { icon: Gamepad2, title: "Mini Game", text: "Track scores and accuracy." },
            ].map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-2xl border border-border p-4 card-elevated">
                <Icon className="h-5 w-5 text-primary" />
                <h2 className="mt-3 font-black">{title}</h2>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </div>
        <AuthPanel />
      </div>
    );
  }

  return (
    <div className="container py-10 md:py-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-primary text-2xl font-black text-primary-foreground">
            {(profile?.displayName || user.email || "F").charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="text-xs uppercase tracking-widest text-primary">Fan profile</div>
            <h1 className="text-3xl font-black md:text-4xl">
              {profile?.displayName || user.email?.split("@")[0] || "World Cup fan"}
            </h1>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void signOut()}
          className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2.5 text-sm font-bold hover:bg-secondary"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>

      {!configured && (
        <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          Supabase environment variables are missing from this deployment.
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <form onSubmit={submitProfile} className="rounded-3xl border border-border p-5 card-elevated sm:p-6">
          <h2 className="text-xl font-black">Profile details</h2>
          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">Display name</span>
              <input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                maxLength={50}
                className="w-full rounded-xl border border-border bg-input px-4 py-3 outline-none focus:border-primary"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">Favourite team</span>
              <select
                value={favoriteTeamSlug}
                onChange={(event) => setFavoriteTeamSlug(event.target.value)}
                className="w-full rounded-xl border border-border bg-input px-4 py-3 outline-none focus:border-primary"
              >
                <option value="">No favourite selected</option>
                {TEAMS.map((team) => (
                  <option key={team.slug} value={team.slug}>{team.name}</option>
                ))}
              </select>
            </label>
          </div>
          <button
            disabled={saving}
            className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 font-bold text-primary-foreground disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save profile
          </button>
        </form>

        <div className="space-y-5">
          <section className="rounded-3xl border border-border p-5 card-elevated sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-widest text-primary">Penalty challenge</div>
                <h2 className="text-xl font-black">Mini Game progress</h2>
              </div>
              {dashboardLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ["Games", summary.gamesPlayed],
                ["Best score", summary.bestScore],
                ["Goals", summary.totalGoals],
                ["Best accuracy", `${Math.round(summary.bestAccuracy)}%`],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl bg-secondary/50 p-4 text-center">
                  <div className="font-mono text-2xl font-black">{value}</div>
                  <div className="mt-1 text-[9px] uppercase text-muted-foreground">{label}</div>
                </div>
              ))}
            </div>
            <Link to="/mini-game" className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline">
              <Gamepad2 className="h-4 w-4" /> Play Penalty Challenge
            </Link>
          </section>

          <section className="grid gap-3 sm:grid-cols-2">
            <Link to="/best-xi" className="rounded-3xl border border-border p-5 card-elevated transition-all hover:border-primary/50">
              <Crown className="h-6 w-6 text-primary" />
              <div className="mt-3 text-3xl font-black">{savedCount}/5</div>
              <div className="font-bold">Best XI teams saved</div>
              <p className="mt-1 text-xs text-muted-foreground">Create, edit and compare your squads.</p>
            </Link>
            <Link to="/prediction" className="rounded-3xl border border-border p-5 card-elevated transition-all hover:border-primary/50">
              <Trophy className="h-6 w-6 text-primary" />
              <div className="mt-3 text-xl font-black">Cloud sync active</div>
              <div className="font-bold">Tournament prediction</div>
              <p className="mt-1 text-xs text-muted-foreground">Your latest local bracket is saved automatically.</p>
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Profile;
