import { Link, useParams } from "react-router-dom";
import { STADIUMS } from "@/data/stadiums";
import { FIXTURES } from "@/data/wc26";
import { useWikiImage } from "@/hooks/useWikiImage";
import StadiumImage from "@/components/StadiumImage";

const StadiumPage = () => {
  const { id } = useParams();
  const stadium = STADIUMS.find((s) => s.id === id);
  const { data } = useWikiImage(stadium?.wikiTitle);

  if (!stadium) {
    return (
      <div className="container py-20 text-center">
        <h1 className="text-3xl font-bold">Stadium not found</h1>
        <Link to="/stadiums" className="text-primary mt-4 inline-block">
          ← Back to stadiums
        </Link>
      </div>
    );
  }

  const matches = FIXTURES.filter((f) => f.stadium === stadium.name);

  return (
    <div>
      <div className="relative h-[40vh] md:h-[55vh] overflow-hidden">
        <StadiumImage
          wikiTitle={stadium.wikiTitle}
          alt={stadium.realName}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="container relative h-full flex flex-col justify-end pb-8">
          <Link to="/stadiums" className="text-sm text-muted-foreground hover:text-foreground mb-3">
            ← All stadiums
          </Link>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">
            {stadium.city}, {stadium.country}
          </div>
          <h1 className="text-4xl md:text-6xl font-bold">{stadium.name}</h1>
          <p className="text-muted-foreground mt-1">Known as {stadium.realName}</p>
        </div>
      </div>

      <div className="container py-10 space-y-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { l: "Capacity", v: stadium.capacity.toLocaleString() },
            { l: "Surface", v: stadium.surface },
            { l: "Opened", v: stadium.opened.toString() },
            { l: "Matches Hosted", v: matches.length.toString() },
          ].map((s) => (
            <div key={s.l} className="card-elevated rounded-xl border border-border p-4">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">{s.l}</div>
              <div className="font-display font-bold text-2xl mt-1">{s.v}</div>
            </div>
          ))}
        </div>

        {data?.extract && (
          <section>
            <h2 className="text-2xl font-bold mb-3">About</h2>
            <p className="text-muted-foreground leading-relaxed">{data.extract}</p>
          </section>
        )}

        <section>
          <h2 className="text-2xl font-bold mb-4">Matches at this venue</h2>
          <div className="space-y-2">
            {matches.map((f) => (
              <div key={f.id} className="card-elevated rounded-xl border border-border px-5 py-3 flex items-center gap-4">
                <div className="text-xs text-muted-foreground w-24">
                  {new Date(f.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </div>
                <div className="text-xs font-mono text-muted-foreground w-14">{f.time}</div>
                <div className="flex-1 font-medium">
                  {f.label ? <span className="text-muted-foreground italic">{f.label}</span> : (
                    <>{f.home} <span className="text-muted-foreground">vs</span> {f.away}</>
                  )}
                </div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">{f.stage === "Group" ? `Group ${f.group}` : f.stage}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default StadiumPage;
