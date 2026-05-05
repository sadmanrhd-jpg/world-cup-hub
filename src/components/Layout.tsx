import { Link, NavLink, Outlet } from "react-router-dom";
import logo from "@/assets/wc26-logo.avif";

const navItems = [
  { to: "/", label: "Home", end: true },
  { to: "/groups", label: "Groups" },
  { to: "/teams", label: "Teams" },
  { to: "/fixtures", label: "Fixtures" },
  { to: "/prediction", label: "Prediction" },
];

const Layout = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/70 border-b border-border">
        <div className="container flex items-center justify-between h-20">
          <Link to="/" className="flex items-center gap-3 group">
            <img src={logo} alt="FIFA World Cup 2026 logo" className="h-12 w-auto transition-transform group-hover:scale-105" />
            <div className="hidden sm:block leading-tight">
              <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">FIFA World Cup</div>
              <div className="font-display font-bold text-lg gradient-gold-text">2026</div>
            </div>
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `px-3 sm:px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                    isActive
                      ? "bg-primary text-primary-foreground glow"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-border mt-20">
        <div className="container py-8 text-center text-sm text-muted-foreground">
          <p>Unofficial fan-built site. Data sourced from FIFA's official 2026 World Cup schedule.</p>
          <p className="mt-2">🇨🇦 Canada · 🇲🇽 Mexico · 🇺🇸 USA — June 11 – July 19, 2026</p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
