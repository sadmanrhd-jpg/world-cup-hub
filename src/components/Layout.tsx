import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import {
  CalendarDays,
  Crown,
  Gamepad2,
  Home,
  MapPin,
  Menu,
  Sparkles,
  Table2,
  UsersRound,
  X,
} from "lucide-react";
import logo from "@/assets/wc26-logo.avif";
import GuestSessionNotice from "@/components/GuestSessionNotice";
import ProfileMenu from "@/components/profile/ProfileMenu";
import UserDataSync from "@/components/UserDataSync";

const navItems = [
  { to: "/", label: "Home", end: true, icon: Home },
  { to: "/groups", label: "Table", icon: Table2 },
  { to: "/teams", label: "Teams", icon: UsersRound },
  { to: "/stadiums", label: "Stadiums", icon: MapPin },
  { to: "/fixtures", label: "Fixtures", icon: CalendarDays },
  { to: "/prediction", label: "Predict", icon: Sparkles },
  { to: "/mini-game", label: "Mini Game", icon: Gamepad2 },
  { to: "/best-xi", label: "Best XI", icon: Crown },
];

const Layout = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

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
    <div className="min-h-screen flex flex-col">
      <UserDataSync />
      <header className="sticky top-0 z-50 border-b border-border bg-background/75 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between gap-3 sm:h-20">
          <Link to="/" className="group flex shrink-0 items-center gap-2 sm:gap-3">
            <img
              src={logo}
              alt="FIFA World Cup 2026 logo"
              className="h-9 w-auto transition-transform group-hover:scale-105 sm:h-12"
            />
            <div className="leading-tight">
              <div className="hidden text-xs uppercase tracking-[0.25em] text-muted-foreground sm:block">
                FIFA World Cup
              </div>
              <div className="font-display text-base font-bold gradient-gold-text sm:text-lg">2026</div>
            </div>
          </Link>

          <div className="hidden min-w-0 items-center gap-2 lg:flex">
            <nav className="flex min-w-0 items-center gap-0.5" aria-label="Main navigation">
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
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-secondary/60 text-foreground transition-colors hover:bg-secondary lg:hidden"
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
            <div className="flex h-16 items-center justify-between border-b border-border px-4">
              <Link to="/" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2">
                <img src={logo} alt="FIFA World Cup 2026 logo" className="h-9 w-auto" />
                <div className="leading-tight">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">FIFA World Cup</div>
                  <div className="font-display font-bold gradient-gold-text">2026</div>
                </div>
              </Link>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-secondary/60"
                aria-label="Close navigation menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto p-4" aria-label="Mobile main navigation">
              <div className="space-y-1.5">
                {navItems.map((item) => {
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
                <ProfileMenu mobile />
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

      <main className="flex-1"><Outlet /></main>

      <footer className="mt-20 border-t border-border">
        <div className="container py-8 text-center text-sm text-muted-foreground">
          <p>Unofficial fan-built site. Data sourced from FIFA&apos;s official 2026 World Cup schedule.</p>
          <p className="mt-2">🇨🇦 Canada · 🇲🇽 Mexico · 🇺🇸 USA — June 11 – July 19, 2026</p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
