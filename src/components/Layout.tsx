import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import {
  BarChart3,
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
  { to: "/stats", label: "Stats", icon: BarChart3 },
  { to: "/prediction", label: "Predict", icon: Sparkles },
  { to: "/fantasy", label: "Fantasy", icon: Trophy },
  { to: "/mini-game", label: "Mini Game", icon: Gamepad2 },
  { to: "/best-xi", label: "Best XI", icon: Crown },
];

const desktopQuickItems = [
  { to: "/", label: "Home", end: true, icon: Home },
  { to: "/fantasy", label: "Fantasy", icon: Trophy },
  { to: "/stats", label: "Stats", icon: BarChart3 },
  { to: "/fixtures", label: "Fixtures", icon: CalendarDays },
  { to: "/best-xi", label: "Best XI", icon: Crown },
];

const actionItems = [
  { to: "/fantasy", label: "Fantasy Game", icon: Trophy },
  { to: "/prediction", label: "Prediction", icon: Sparkles },
  { to: "/best-xi", label: "Best XI", icon: Crown },
  { to: "/mini-game", label: "Mini Game", icon: Gamepad2 },
  { to: "/stats", label: "Stats", icon: BarChart3 },
];

const exploreItems = [
  { to: "/", label: "Home", end: true, icon: Home },
  { to: "/fixtures", label: "Fixtures", icon: CalendarDays },
  { to: "/groups", label: "Table", icon: Table2 },
  { to: "/teams", label: "Teams", icon: UsersRound },
  { to: "/stadiums", label: "Stadiums", icon: MapPin },
];

const NavDrawerLink = ({
  item,
  onClick,
}: {
  item: (typeof navItems)[number];
  onClick: () => void;
}) => {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
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
};

const Layout = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const { loading, user } = useAuth();

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!menuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    window.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [menuOpen]);

  return (
    <div className="flex min-h-screen flex-col">
      <UserDataSync />

      <header className="sticky top-0 z-50 border-b border-border bg-background/75 backdrop-blur-xl">
        <div className="container flex h-14 items-center justify-between gap-2 sm:h-16">
          <div className="flex min-w-0 items-center gap-2 lg:gap-3">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-primary/35 bg-primary/10 px-3 text-primary transition-colors hover:bg-primary/15 sm:px-4"
              aria-label="Open Fan26 navigation menu"
              aria-expanded={menuOpen}
              aria-controls="main-navigation-drawer"
            >
              <Menu className="h-5 w-5" />
              <span className="hidden text-xs font-black uppercase tracking-[0.12em] sm:inline">
                Fan26 Menu
              </span>
            </button>

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
          </div>

          <div className="hidden min-w-0 items-center gap-2 lg:flex">
            <nav
              className="flex min-w-0 items-center gap-1 rounded-full border border-border/70 bg-secondary/25 p-1"
              aria-label="Quick navigation"
            >
              {desktopQuickItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-2 text-xs font-bold transition-all xl:px-3.5 ${
                        isActive
                          ? "bg-primary text-primary-foreground glow"
                          : "text-muted-foreground hover:bg-background/70 hover:text-foreground"
                      }`
                    }
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {item.label}
                  </NavLink>
                );
              })}
            </nav>
            <ProfileMenu />
          </div>

          <div className="lg:hidden">
            {user ? (
              <ProfileMenu />
            ) : (
              <Link
                to="/profile?mode=login"
                className="inline-flex h-10 items-center justify-center rounded-full border border-border bg-secondary/60 px-3 text-xs font-black text-foreground"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </header>

      <GuestSessionNotice />

      {menuOpen && (
        <div className="fixed inset-0 z-[70]">
          <button
            type="button"
            className="absolute inset-0 bg-black/65 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
            aria-label="Close navigation menu"
          />

          <aside
            id="main-navigation-drawer"
            className="relative flex h-full w-[88%] max-w-sm flex-col border-r border-border bg-background shadow-2xl"
            aria-label="Fan26 navigation"
          >
            <div className="flex h-14 items-center justify-between border-b border-border px-4 sm:h-16">
              <Link
                to="/"
                onClick={() => setMenuOpen(false)}
                className="flex min-w-0 items-center gap-2"
              >
                <img
                  src={logo}
                  alt="FIFA World Cup 2026 logo"
                  className="h-8 w-auto shrink-0"
                />
                <div className="min-w-0">
                  <span className="block whitespace-nowrap font-display text-xs font-bold gradient-gold-text">
                    Fan26 Command Center
                  </span>
                  <span className="block text-[10px] font-semibold text-muted-foreground">
                    Every page, less navbar traffic
                  </span>
                </div>
              </Link>

              <button
                type="button"
                onClick={() => setMenuOpen(false)}
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
                      onClick={() => setMenuOpen(false)}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-sm font-black text-primary-foreground"
                    >
                      <LogIn className="h-4 w-4" /> Log in
                    </Link>

                    <Link
                      to="/profile?mode=signup"
                      onClick={() => setMenuOpen(false)}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/10 px-3 py-2.5 text-sm font-black text-primary"
                    >
                      <UserPlus className="h-4 w-4" /> Create
                    </Link>
                  </div>

                  <Link
                    to="/profile"
                    onClick={() => setMenuOpen(false)}
                    className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    <UserRound className="h-4 w-4" /> Continue as guest
                  </Link>
                </div>
              )}
            </div>

            <nav
              className="flex-1 overflow-y-auto p-4"
              aria-label="Main navigation menu"
            >
              <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                Play & participate
              </div>

              <div className="space-y-1.5">
                {actionItems.map((item) => (
                  <NavDrawerLink
                    key={item.to}
                    item={item}
                    onClick={() => setMenuOpen(false)}
                  />
                ))}
              </div>

              <div className="mb-2 mt-5 border-t border-border pt-5 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Explore
              </div>

              <div className="space-y-1.5">
                {exploreItems.map((item) => (
                  <NavDrawerLink
                    key={item.to}
                    item={item}
                    onClick={() => setMenuOpen(false)}
                  />
                ))}
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
