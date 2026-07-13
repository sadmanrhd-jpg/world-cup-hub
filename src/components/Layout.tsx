import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import {
  CalendarDays,
  Crown,
  Gamepad2,
  Home,
  LogIn,
  MapPin,
  Menu,
  Sparkles,
  Trophy,
  Table2,
  UserPlus,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import logo from "@/assets/wc26-logo.avif";
import GuestSessionNotice from "@/components/GuestSessionNotice";
import ProfileMenu from "@/components/profile/ProfileMenu";
import UserDataSync from "@/components/UserDataSync";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { to: "/", label: "Home", end: true, icon: Home },
  { to: "/groups", label: "Table", icon: Table2 },
  { to: "/teams", label: "Teams", icon: UsersRound },
  { to: "/stadiums", label: "Stadiums", icon: MapPin },
  { to: "/fixtures", label: "Fixtures", icon: CalendarDays },
  { to: "/prediction", label: "Predict", icon: Sparkles },
  { to: "/fantasy", label: "Fantasy", icon: Trophy },
  { to: "/mini-game", label: "Mini Game", icon: Gamepad2 },
  { to: "/best-xi", label: "Best XI", icon: Crown },
];

const mobileActionItems = [
  { to: "/fantasy", label: "Fantasy Game", icon: Trophy },
  { to: "/prediction", label: "Prediction", icon: Sparkles },
  { to: "/best-xi", label: "Best XI", icon: Crown },
  { to: "/mini-game", label: "Mini Game", icon: Gamepad2 },
];

const mobileExploreItems = [
  { to: "/", label: "Home", end: true, icon: Home },
  { to: "/fixtures", label: "Fixtures", icon: CalendarDays },
  { to: "/groups", label: "Table", icon: Table2 },
  { to: "/teams", label: "Teams", icon: UsersRound },
  { to: "/stadiums", label: "Stadiums", icon: MapPin },
];

const Layout = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { loading, user } = useAuth();

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileMenuOpen(false);
    };

    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [mobileMenuOpen]);

  return (
    <div className="flex min-h-screen flex-col">
      <UserDataSync />

      <header className="sticky top-0 z-50 border-b border-border bg-background/75 backdrop-blur-xl">
        <div className="container flex h-14 items-center justify-between gap-3 sm:h-16">
          <Link
            to="/"
            className="group flex min-w-0 shrink-0 items-center gap-2 sm:gap-3"
          >
            <img
              src={logo}
              alt="FIFA World Cup 2026 logo"
              className="h-8 w-auto shrink-0 transition-transform group-hover:scale-105 sm:h-10"
            />
            <span className="min-w-0 whitespace-nowrap font-display text-[11px] font-bold leading-none gradient-gold-text sm:text-sm md:text-base">
              FIFA World Cup 2026
            </span>
          </Link>

          <div className="hidden min-w-0 items-center gap-2 lg:flex">
            <nav
              className="flex min-w-0 items-center gap-0.5"
              aria-label="Main navigation"
            >
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `whitespace-nowrap rounded-full px-2.5 py-2 text-xs font-semibold transition-all xl:px-3 xl:text-sm ${
                      isActive
                        ? "bg-primary text-primary-foreground glow"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <ProfileMenu />
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-secondary/60 text-foreground transition-colors hover:bg-secondary lg:hidden"
            aria-label="Open navigation menu"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      <GuestSessionNotice />

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/65 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close navigation menu"
          />

          <aside
            id="mobile-navigation"
            className="relative flex h-full w-[86%] max-w-xs flex-col border-r border-border bg-background shadow-2xl"
            aria-label="Mobile navigation"
          >
            <div className="flex h-14 items-center justify-between border-b border-border px-4 sm:h-16">
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className="flex min-w-0 items-center gap-2"
              >
                <img
                  src={logo}
                  alt="FIFA World Cup 2026 logo"
                  className="h-8 w-auto shrink-0"
                />
                <span className="min-w-0 whitespace-nowrap font-display text-xs font-bold gradient-gold-text">
                  FIFA World Cup 2026
                </span>
              </Link>

              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-secondary/60"
                aria-label="Close navigation menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="border-b border-border p-4">
              <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Account
              </div>

              {loading ? (
                <div className="rounded-xl border border-border bg-secondary/30 px-4 py-3 text-sm text-muted-foreground">
                  Loading account…
                </div>
              ) : user ? (
                <ProfileMenu mobile />
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      to="/profile?mode=login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-sm font-black text-primary-foreground"
                    >
                      <LogIn className="h-4 w-4" /> Log in
                    </Link>

                    <Link
                      to="/profile?mode=signup"
                      onClick={() => setMobileMenuOpen(false)}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/10 px-3 py-2.5 text-sm font-black text-primary"
                    >
                      <UserPlus className="h-4 w-4" /> Create account
                    </Link>
                  </div>

                  <Link
                    to="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    <UserRound className="h-4 w-4" /> Continue as guest
                  </Link>
                </div>
              )}
            </div>

            <nav
              className="flex-1 overflow-y-auto p-4"
              aria-label="Mobile main navigation"
            >
              <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                Play & participate
              </div>

              <div className="space-y-1.5">
                {mobileActionItems.map((item) => {
                  const Icon = item.icon;

                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-semibold transition-all ${
                          isActive
                            ? "bg-primary text-primary-foreground shadow-lg"
                            : "text-foreground hover:bg-secondary"
                        }`
                      }
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}
              </div>

              <div className="mb-2 mt-5 border-t border-border pt-5 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Explore
              </div>

              <div className="space-y-1.5">
                {mobileExploreItems.map((item) => {
                  const Icon = item.icon;

                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      onClick={() => setMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-semibold transition-all ${
                          isActive
                            ? "bg-primary text-primary-foreground shadow-lg"
                            : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                        }`
                      }
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            </nav>

            <div className="border-t border-border p-4 text-xs leading-relaxed text-muted-foreground">
              Canada · Mexico · USA
              <br />
              June 11 – July 19, 2026
            </div>
          </aside>
        </div>
      )}

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="mt-20 border-t border-border">
        <div className="container py-8 text-center text-sm text-muted-foreground">
          <p>
            Unofficial fan-built site. Data sourced from FIFA&apos;s official
            2026 World Cup schedule.
          </p>
          <p className="mt-2">
            🇨🇦 Canada · 🇲🇽 Mexico · 🇺🇸 USA — June 11 – July 19, 2026
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
