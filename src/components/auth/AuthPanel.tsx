import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2, LockKeyhole, Mail, UserRound } from "lucide-react";
import { GUEST_INITIAL_DAYS, useAuth } from "@/contexts/AuthContext";

type Mode = "login" | "signup";

const AuthPanel = ({ compact = false }: { compact?: boolean }) => {
  const [searchParams] = useSearchParams();
  const requestedMode = searchParams.get("mode");
  const {
    configured,
    signInAsGuest,
    signInWithPassword,
    signUpWithPassword,
  } = useAuth();
  const [mode, setMode] = useState<Mode>(
    requestedMode === "signup" ? "signup" : "login",
  );
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(
    localStorage.getItem("fan26.guest-session-expired")
      ? "Your previous guest access period ended. Start a new guest session or log in."
      : null,
  );

  useEffect(() => {
    if (requestedMode !== "login" && requestedMode !== "signup") return;
    setMode(requestedMode);
    setMessage(null);
  }, [requestedMode]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    const error =
      mode === "login"
        ? await signInWithPassword(email, password)
        : await signUpWithPassword(email, password, displayName);
    setBusy(false);
    if (error) setMessage(error);
    else if (mode === "signup") {
      setMessage("Account created. Check your email if confirmation is enabled.");
    }
  };

  const guest = async () => {
    setBusy(true);
    setMessage(null);
    localStorage.removeItem("fan26.guest-session-expired");
    const error = await signInAsGuest();
    if (error) setMessage(error);
    setBusy(false);
  };

  if (!configured) {
    return (
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
        Supabase is not configured yet. Add the two public environment variables from the setup guide.
      </div>
    );
  }

  return (
    <div className={compact ? "" : "rounded-3xl border border-border p-5 card-elevated sm:p-7"}>
      <button
        type="button"
        onClick={guest}
        disabled={busy}
        className="flex min-h-14 w-full items-center justify-center gap-3 rounded-full border border-primary/40 bg-primary/10 px-4 py-3 text-sm font-black text-primary transition-colors hover:bg-primary/15 disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <UserRound className="h-5 w-5" />}
        Continue as guest
      </button>
      <p className="mt-2 text-center text-[11px] leading-relaxed text-muted-foreground">
        Guest access starts with {GUEST_INITIAL_DAYS} days and can be extended. Data stays tied to this browser.
      </p>

      <div className="my-5 flex items-center gap-3 text-[10px] uppercase tracking-widest text-muted-foreground">
        <span className="h-px flex-1 bg-border" /> or use an account <span className="h-px flex-1 bg-border" />
      </div>

      <div className="flex rounded-full border border-border bg-secondary/40 p-1">
        {(["login", "signup"] as Mode[]).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => {
              setMode(item);
              setMessage(null);
            }}
            className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition-all ${
              mode === item
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {item === "login" ? "Log in" : "Create account"}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="mt-5 space-y-3">
        {mode === "signup" && (
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">Display name</span>
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              autoComplete="name"
              className="w-full rounded-xl border border-border bg-input px-4 py-3 outline-none focus:border-primary"
              placeholder="Your name"
            />
          </label>
        )}
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">Email</span>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              className="w-full rounded-xl border border-border bg-input py-3 pl-10 pr-4 outline-none focus:border-primary"
              placeholder="you@example.com"
            />
          </div>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">Password</span>
          <div className="relative">
            <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              required
              minLength={8}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              className="w-full rounded-xl border border-border bg-input py-3 pl-10 pr-4 outline-none focus:border-primary"
              placeholder="At least 8 characters"
            />
          </div>
        </label>

        {message && (
          <div className="rounded-xl border border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
            {message}
          </div>
        )}

        <button
          disabled={busy}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 font-bold text-primary-foreground disabled:opacity-60"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {mode === "login" ? "Log in" : "Create account"}
        </button>
      </form>
    </div>
  );
};

export default AuthPanel;
