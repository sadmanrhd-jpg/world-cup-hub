import { Link } from "react-router-dom";
import { CircleUserRound, LogIn } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const ProfileMenu = ({ mobile = false }: { mobile?: boolean }) => {
  const { loading, user, profile } = useAuth();
  const label = profile?.displayName || user?.email?.split("@")[0] || "Profile";

  return (
    <Link
      to="/profile"
      className={
        mobile
          ? "flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          : "inline-flex h-10 items-center gap-2 rounded-full border border-border bg-secondary/50 px-3 text-xs font-semibold transition-colors hover:bg-secondary"
      }
      aria-label={user ? `Open ${label} profile` : "Log in"}
    >
      {user ? <CircleUserRound className="h-5 w-5 text-primary" /> : <LogIn className="h-5 w-5" />}
      <span className={mobile ? "" : "hidden xl:inline"}>
        {loading ? "Loading" : user ? label : "Log in"}
      </span>
    </Link>
  );
};

export default ProfileMenu;
