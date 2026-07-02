import type { PlayerBio } from "@/data/playerBios";

const RATING_STAGES: Array<{
  key: keyof PlayerBio["ratings"];
  label: string;
}> = [
  { key: "group", label: "Group" },
  { key: "r32", label: "32" },
  { key: "r16", label: "16" },
  { key: "qf", label: "QF" },
  { key: "sf", label: "SF" },
  { key: "final", label: "F" },
];

const Portrait = ({
  bio,
  size = "large",
}: {
  bio: PlayerBio;
  size?: "small" | "large";
}) => {
  const dimension =
    size === "large"
      ? "h-24 w-24 sm:h-28 sm:w-28"
      : "h-12 w-12";

  if (bio.portraitUrl) {
    return (
      <img
        src={bio.portraitUrl}
        alt={`${bio.name} portrait`}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        className={`${dimension} rounded-full border-2 border-primary/50 bg-secondary object-cover object-top shadow-lg`}
      />
    );
  }

  const initials = bio.name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return (
    <div
      className={`${dimension} grid place-items-center rounded-full border-2 border-primary/40 bg-primary/10 font-black text-primary`}
      aria-label={`${bio.name} portrait unavailable`}
    >
      {initials}
    </div>
  );
};

const RatingStrip = ({ bio }: { bio: PlayerBio }) => (
  <div>
    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
      Tournament rating
    </div>

    <div className="mt-2 grid grid-cols-6 gap-1.5">
      {RATING_STAGES.map((stage) => {
        const rating = bio.ratings[stage.key];

        return (
          <div key={stage.key} className="text-center">
            <div className="mb-1 text-[9px] font-semibold text-muted-foreground">
              {stage.label}
            </div>
            <div
              className={[
                "mx-auto grid h-8 w-8 place-items-center rounded-full border text-[11px] font-black",
                rating == null
                  ? "border-border bg-secondary/70 text-muted-foreground"
                  : "border-primary/45 bg-primary/12 text-primary",
              ].join(" ")}
            >
              {rating == null ? "—" : rating}
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

const PlayerBioPanel = ({
  bio,
  compact = false,
}: {
  bio: PlayerBio;
  compact?: boolean;
}) => (
  <div className={compact ? "p-5" : "p-5 sm:p-6"}>
    <div className="flex items-start gap-4">
      <Portrait bio={bio} />

      <div className="min-w-0 flex-1 pt-1">
        <div className="text-[10px] font-black uppercase tracking-[0.22em] text-primary">
          Player bio
        </div>
        <h4 className="mt-1 break-words text-xl font-black leading-tight sm:text-2xl">
          {bio.name}
        </h4>
        <div className="mt-1 text-sm font-semibold italic text-primary/90">
          {bio.label}
        </div>
      </div>
    </div>

    <div className="mt-5 grid grid-cols-2 gap-3 rounded-2xl border border-border bg-background/40 p-3">
      <div>
        <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
          Club
        </div>
        <div className="mt-1 text-xs font-semibold sm:text-sm">
          {bio.club ?? "Not listed"}
        </div>
      </div>

      <div>
        <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
          Age
        </div>
        <div className="mt-1 text-xs font-semibold sm:text-sm">
          {bio.age ?? "—"}
        </div>
      </div>

      <div>
        <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
          Position
        </div>
        <div className="mt-1 text-xs font-semibold sm:text-sm">
          {bio.position}
        </div>
      </div>

      <div>
        <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
          Number
        </div>
        <div className="mt-1 text-xs font-semibold sm:text-sm">
          {bio.shirtNumber ?? "—"}
        </div>
      </div>
    </div>

    <div className="mt-5">
      <RatingStrip bio={bio} />
    </div>

    <p className="mt-5 whitespace-pre-line text-sm leading-6 text-muted-foreground">
      {bio.summary}
    </p>
  </div>
);

export { Portrait, RatingStrip };
export default PlayerBioPanel;
