import { Link, NavLink, Outlet } from "react-router-dom";
import logo from "@/assets/wc26-logo.avif";

const navItems = [
  { to: "/", label: "Home", end: true },
  { to: "/groups", label: "Groups" },
  { to: "/table", label: "Table" },
  { to: "/teams", label: "Teams" },
  { to: "/stadiums", label: "Stadiums" },
  { to: "/fixtures", label: "Fixtures" },
  { to: "/prediction", label: "Predict" },
];

const Layout = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/70 border-b border-border">
        <div className="container flex items-center justify-between gap-2 h-16 sm:h-20">
          <Link to="/" className="flex items-center gap-2 sm:gap-3 group shrink-0">
            <img src={logo} alt="FIFA World Cup 2026 logo" className="h-9 sm:h-12 w-auto transition-transform group-hover:scale-105" />
            <div className="hidden md:block leading-tight">
              <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground">FIFA World Cup</div>
              <div className="font-display font-bold text-lg gradient-gold-text">2026</div>
            </div>
          </Link>
          <nav className="flex items-center gap-0.5 sm:gap-2 overflow-x-auto -mr-2 sm:mr-0 pr-2 sm:pr-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
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
