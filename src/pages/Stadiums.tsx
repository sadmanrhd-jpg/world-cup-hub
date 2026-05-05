import { Link } from "react-router-dom";
import { STADIUMS } from "@/data/stadiums";
import StadiumImage from "@/components/StadiumImage";

const Stadiums = () => {
  const byCountry = {
    USA: STADIUMS.filter((s) => s.country === "USA"),
    Canada: STADIUMS.filter((s) => s.country === "Canada"),
    Mexico: STADIUMS.filter((s) => s.country === "Mexico"),
  };

  return (
    <div className="container py-12">
      <div className="mb-10">
        <h1 className="text-4xl md:text-5xl font-bold">Stadiums</h1>
        <p className="text-muted-foreground mt-2">
          16 host venues across three nations.
        </p>
      </div>

      {(["USA", "Canada", "Mexico"] as const).map((c) => (
        <section key={c} className="mb-14">
          <h2 className="text-2xl font-bold mb-5 flex items-center gap-3">
            <span>{c === "USA" ? "🇺🇸" : c === "Canada" ? "🇨🇦" : "🇲🇽"}</span>
            <span>{c}</span>
            <span className="text-sm font-normal text-muted-foreground">
              {byCountry[c].length} venues
            </span>
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {byCountry[c].map((s) => (
              <Link
                key={s.id}
                to={`/stadiums/${s.id}`}
                className="card-elevated rounded-2xl border border-border overflow-hidden hover:border-primary/50 transition-all hover:-translate-y-1 group"
              >
                <div className="aspect-[16/10] overflow-hidden bg-secondary/40">
                  <StadiumImage
                    wikiTitle={s.wikiTitle}
                    alt={s.realName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-5">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">
                    {s.city}
                  </div>
                  <div className="font-display font-bold text-xl mt-1">
                    {s.name}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {s.realName}
                  </div>
                  <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                    <span>👥 {s.capacity.toLocaleString()}</span>
                    <span>🌱 {s.surface}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
};

export default Stadiums;
