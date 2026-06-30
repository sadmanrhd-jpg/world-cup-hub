import { useEffect, useMemo, useState } from "react";
import { CalendarClock, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { GUEST_EXTENSION_DAYS, useAuth } from "@/contexts/AuthContext";

const NOTICE_INTERVAL = 7 * 24 * 60 * 60 * 1000;

const GuestSessionNotice = () => {
  const {
    user,
    isGuest,
    guestDaysRemaining,
    guestExpiresAt,
    extendGuestAccess,
  } = useAuth();
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  const noticeKey = user ? `fan26.guest-notice.${user.id}` : null;

  useEffect(() => {
    if (!isGuest || !noticeKey) {
      setVisible(false);
      return;
    }

    const lastShown = Number(localStorage.getItem(noticeKey) ?? 0);
    const urgent = (guestDaysRemaining ?? 99) <= 7;
    const shouldShow = !lastShown || Date.now() - lastShown >= NOTICE_INTERVAL || urgent;

    if (shouldShow) {
      setVisible(true);
      localStorage.setItem(noticeKey, String(Date.now()));
    }
  }, [guestDaysRemaining, isGuest, noticeKey]);

  const expiryLabel = useMemo(() => {
    if (!guestExpiresAt) return null;
    return new Intl.DateTimeFormat(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(guestExpiresAt));
  }, [guestExpiresAt]);

  if (!visible || !isGuest) return null;

  const extend = async () => {
    setBusy(true);
    const error = await extendGuestAccess();
    setBusy(false);
    if (error) toast.error(error);
    else toast.success(`Guest access extended by ${GUEST_EXTENSION_DAYS} days.`);
  };

  return (
    <div className="border-b border-primary/20 bg-primary/10">
      <div className="container flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <div className="text-sm font-black">
              Guest access: {guestDaysRemaining ?? "—"} days remaining
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {expiryLabel ? `Current access ends ${expiryLabel}. ` : ""}
              This guest account works only in this browser. Signing out or clearing browser data can permanently remove access.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 pl-8 sm:pl-0">
          <button
            type="button"
            onClick={extend}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-2 text-xs font-black text-primary-foreground disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Extend {GUEST_EXTENSION_DAYS} days
          </button>
          <button
            type="button"
            onClick={() => setVisible(false)}
            className="grid h-9 w-9 place-items-center rounded-full border border-border bg-background/70"
            aria-label="Dismiss guest access reminder"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default GuestSessionNotice;
