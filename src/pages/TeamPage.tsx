import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Building2,
  CalendarDays,
  ExternalLink,
  Heart,
  Loader2,
  Medal,
  Search,
  Shirt,
  Star,
  Trophy,
  UserRoundCog,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { FIXTURES, getTeam } from "@/data/wc26";
import { STADIUMS } from "@/data/stadiums";
import StadiumImage from "@/components/StadiumImage";
import TeamFlag from "@/components/TeamFlag";
import PersonCutoutImage from "@/components/PersonCutoutImage";
import { getTeamInfo } from "@/data/teamInfo";
import { getPersonWikipediaTitle } from "@/data/personMedia";
import { getManager } from "@/data/managers";
import { useFavoriteTeam } from "@/hooks/useFavoriteTeam";
import {
  fetchWorldCupManagers,
  fetchWorldCupPlayers,
} from "@/services/playerService";
import type {
  PlayerPosition,
  WorldCupManager,
  WorldCupPlayer,
} from "@/types/fanProfile";
import noTitleSticker from "@/assets/8844319.png";

const KIT_TYPES = [
  { key: "home", label: "Home" },
  { key: "away", label: "Away" },
] as const;

const POSITION_GROUPS: Array<{
  key: PlayerPosition;
  label: string;
  short: string;
}> = [
  { key: "GK", label: "Goalkeepers", short: "GK" },
  { key: "DEF", label: "Defenders", short: "DEF" },
  { key: "MID", label: "Midfielders", short: "MID" },
  { key: "FWD", label: "Forwards", short: "FWD" },
];

type SquadApiPayload = {
  players?: WorldCupPlayer[];
  managers?: WorldCupManager[];
};

const googleSearchUrl = (name: string, hint: string) =>
  `https://www.google.com/search?q=${encodeURIComponent(`${name} ${hint}`)}`;

const normalizePersonName = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");

const positionLabel = (player: WorldCupPlayer) =>
  player.detailedPosition ||
  ({ GK: "Goalkeeper", DEF: "Defender", MID: "Midfielder", FWD: "Forward" } as const)[
    player.position
  ];

const pickCurrentHighlight = (
  preferredName: string,
  teamPlayers: WorldCupPlayer[],
) => {
  const preferredKey = normalizePersonName(preferredName);
  const preferred = teamPlayers.find(
    (player) => normalizePersonName(player.name) === preferredKey,
  );
  if (preferred) return preferred;

  return [...teamPlayers].sort((a, b) => {
    const score = (player: WorldCupPlayer) =>
      (player.stats?.goals ?? 0) * 30 +
      (player.stats?.assists ?? 0) * 20 +
      (player.stats?.starts ?? 0) * 5 +
      (player.stats?.appearances ?? 0) * 3 +
      Math.round((player.stats?.minutes ?? 0) / 90);
    return score(b) - score(a) || a.name.localeCompare(b.name);
  })[0];
};

const InfoCard = ({
  icon: Icon,
  label,
  accent,
  className = "",
  children,
}: {
  icon: LucideIcon;
  label: string;
  accent: string;
  className?: string;
  children: ReactNode;
}) => (
  <div
    className={`card-elevated relative aspect-square min-w-0 overflow-hidden rounded-2xl border border-border p-3 sm:rounded-3xl sm:p-5 ${className}`}
  >
    <div className={`absolute -right-8 -top-8 h-24 w-24 rounded-full blur-3xl sm:-right-10 sm:-top-10 sm:h-28 sm:w-28 ${accent}`} />
    <div className="relative flex h-full min-w-0 flex-col">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl sm:h-10 sm:w-10 sm:rounded-2xl ${accent}`}>
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
        <div className="min-w-0 text-[9px] font-semibold uppercase leading-tight tracking-[0.14em] text-muted-foreground sm:text-[11px] sm:font-bold sm:tracking-[0.18em]">
          {label}
        </div>
      </div>
      <div className="mt-3 min-w-0 flex-1 sm:mt-4">{children}</div>
    </div>
  </div>
);

const SearchableName = ({
  name,
  hint,
  className = "",
}: {
  name: string;
  hint: string;
  className?: string;
}) => {
  const searchable = Boolean(name && name !== "TBA" && name !== "—");

  if (!searchable) {
    return <span className={className}>{name}</span>;
  }

  return (
    <a
      href={googleSearchUrl(name, hint)}
      target="_blank"
      rel="noopener noreferrer"
      className={`group inline-flex items-center gap-2 hover:text-primary ${className}`}
      aria-label={`Search Google for ${name}`}
    >
      <span>{name}</span>
      <ExternalLink className="h-4 w-4 shrink-0 opacity-55 transition-opacity group-hover:opacity-100" />
    </a>
  );
};

const PersonFeatureCard = ({
  label,
  name,
  detail,
  searchHint,
  icon: Icon,
  gradient,
}: {
  label: string;
  name: string;
  detail: string;
  searchHint: string;
  icon: LucideIcon;
  gradient: string;
}) => (
  <article
    className={`card-elevated relative min-h-[220px] overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br sm:min-h-[260px] sm:rounded-3xl ${gradient}`}
  >
    <div className="relative z-10 max-w-[62%] p-4 sm:max-w-[68%] sm:p-7">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-primary sm:text-xs">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary/15">
          <Icon className="h-4 w-4" />
        </span>
        {label}
      </div>

      <SearchableName
        name={name}
        hint={searchHint}
        className="mt-4 text-xl font-black leading-tight sm:mt-5 sm:text-4xl"
      />

      <p className="mt-2 text-xs text-muted-foreground sm:text-sm">{detail}</p>
      <p className="mt-5 hidden items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-primary/80 sm:inline-flex">
        <Search className="h-3.5 w-3.5" /> Click the name to search
      </p>
    </div>

    <div className="absolute inset-y-0 right-0 w-[42%] sm:w-[48%]">
      <PersonCutoutImage
        pageTitle={getPersonWikipediaTitle(name)}
        alt={`${name} portrait`}
      />
    </div>
  </article>
);

const TeamPage = () => {
  const { slug } = useParams();
  const team = slug ? getTeam(slug) : undefined;
  const { slug: favSlug, set: setFav } = useFavoriteTeam();

  const [players, setPlayers] = useState<WorldCupPlayer[]>([]);
  const [manager, setManager] = useState<WorldCupManager | null>(null);
  const [squadLoading, setSquadLoading] = useState(true);
  const [squadError, setSquadError] = useState<string | null>(null);

  useEffect(() => {
    if (!team) {
      setPlayers([]);
      setManager(null);
      setSquadLoading(false);
      return;
    }

    let cancelled = false;
    setSquadLoading(true);
    setSquadError(null);

    const loadTeamData = async () => {
      try {
        let allPlayers: WorldCupPlayer[];
        let allManagers: WorldCupManager[];

        try {
          const response = await fetch("/api/world-cup-squads?team-profile=v2", {
            cache: "no-store",
            headers: { Accept: "application/json" },
          });
          if (!response.ok) throw new Error(`Squad API returned ${response.status}`);
          const payload = (await response.json()) as SquadApiPayload;
          if (!payload.players?.length || !payload.managers?.length) {
            throw new Error("Squad API returned incomplete data");
          }
          allPlayers = payload.players;
          allManagers = payload.managers;
        } catch {
          [allPlayers, allManagers] = await Promise.all([
            fetchWorldCupPlayers(),
            fetchWorldCupManagers(),
          ]);
        }

        if (cancelled) return;

        setPlayers(
          allPlayers
            .filter((player) => player.teamSlug === team.slug && player.active)
            .sort((a, b) => {
              const numberA = a.shirtNumber ?? 999;
              const numberB = b.shirtNumber ?? 999;
              return numberA - numberB || a.name.localeCompare(b.name);
            }),
        );
        setManager(
          allManagers.find((item) => item.teamSlug === team.slug) ?? null,
        );
      } catch (error) {
        if (cancelled) return;
        console.error(error);
        setSquadError(
          error instanceof Error
            ? error.message
            : "The squad list could not be loaded.",
        );
      } finally {
        if (!cancelled) setSquadLoading(false);
      }
    };

    void loadTeamData();

    return () => {
      cancelled = true;
    };
  }, [team?.slug]);

  const groupedPlayers = useMemo(
    () =>
      POSITION_GROUPS.map((group) => ({
        ...group,
        players: players.filter((player) => player.position === group.key),
      })),
    [players],
  );

  if (!team) {
    return (
      <div className="container py-20 text-center">
        <h1 className="text-3xl font-bold">Team not found</h1>
        <Link to="/teams" className="mt-4 inline-block text-primary">
          ← Back to teams
        </Link>
      </div>
    );
  }

  const teamFixtures = FIXTURES.filter(
    (fixture) => fixture.home === team.name || fixture.away === team.name,
  );
  const info = getTeamInfo(team.name);
  const isFav = favSlug === team.slug;
  const managerName = manager?.name || getManager(team.name);
  const currentHighlight = pickCurrentHighlight(info.highlightPlayer.name, players);
  const highlightName = currentHighlight?.name || info.highlightPlayer.name;
  const highlightRole = currentHighlight
    ? positionLabel(currentHighlight)
    : info.highlightPlayer.role;

  return (
    <div className="container space-y-8 py-6 sm:space-y-12 sm:py-12">
      <section className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/12 via-background to-secondary/20 p-4 sm:rounded-[2rem] sm:p-8">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <Link
          to="/teams"
          className="relative text-sm text-muted-foreground hover:text-foreground"
        >
          ← All teams
        </Link>

        <div className="relative mt-5 flex flex-wrap items-start gap-3 sm:items-center sm:gap-6">
          <TeamFlag
            name={team.name}
            slug={team.slug}
            className="h-16 w-16 shrink-0 rounded-xl shadow-lg sm:h-24 sm:w-24 sm:rounded-2xl md:h-28 md:w-28"
            eager
          />

          <div className="min-w-0 flex-1">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">
              Group {team.group}
            </div>
            <h1 className="max-w-full break-words text-3xl font-black leading-[1.05] sm:text-5xl md:text-7xl">
              {team.name}
            </h1>
            <p className="mt-2 max-w-3xl text-xs leading-relaxed text-muted-foreground sm:mt-3 sm:text-base">
              {info.blurb}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setFav(isFav ? null : team.slug)}
            className={[
              "inline-flex w-full items-center justify-center gap-2 rounded-full border px-4 py-2.5 text-xs font-semibold transition-all sm:w-auto sm:px-5 sm:text-sm",
              isFav
                ? "border-primary bg-primary text-primary-foreground glow"
                : "border-border bg-secondary/50 hover:border-primary/50",
            ].join(" ")}
          >
            <Heart className={`h-4 w-4 ${isFav ? "fill-current" : ""}`} />
            {isFav ? "Favourite team" : "Set as favourite"}
          </button>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-3xl grid-cols-2 gap-3 sm:gap-4">
        <InfoCard
          icon={Trophy}
          label="World Cup titles"
          accent="bg-amber-400/15 text-amber-300"
        >
          {info.titles > 0 ? (
            <div className="flex h-full flex-wrap content-center items-center justify-center gap-1.5 sm:gap-2">
              {Array.from({ length: info.titles }).map((_, index) => (
                <span
                  key={index}
                  className="grid h-8 w-8 place-items-center rounded-lg border border-amber-300/25 bg-amber-300/10 sm:h-10 sm:w-10 sm:rounded-xl"
                  title={`World Cup title ${index + 1}`}
                >
                  <Trophy className="h-4 w-4 text-amber-300 sm:h-5 sm:w-5" />
                </span>
              ))}
            </div>
          ) : (
            <div className="flex h-full items-center gap-2 sm:gap-3">
              <img
                src={noTitleSticker}
                alt="Yet to win their first World Cup title"
                className="h-12 w-12 shrink-0 object-contain sm:h-16 sm:w-16"
              />
              <p className="min-w-0 text-[10px] font-semibold leading-snug text-muted-foreground sm:text-sm">
                Yet to win their first title
              </p>
            </div>
          )}
        </InfoCard>

        <InfoCard
          icon={CalendarDays}
          label="Appearances"
          accent="bg-sky-400/15 text-sky-300"
        >
          <div className="flex h-full flex-col justify-center">
            <div className="font-display text-3xl font-extrabold leading-none sm:text-5xl">
              {info.appearances}
            </div>
            <p className="mt-2 text-[10px] font-medium leading-snug text-muted-foreground sm:text-xs">
              World Cup appearances
            </p>
          </div>
        </InfoCard>

        <InfoCard
          icon={Medal}
          label="Best finish"
          accent="bg-violet-400/15 text-violet-300"
        >
          <div className="flex h-full items-center">
            <div className="break-words text-sm font-bold leading-snug sm:text-xl sm:font-extrabold">
              {info.bestFinish}
            </div>
          </div>
        </InfoCard>

        <InfoCard
          icon={Building2}
          label="Home stadium"
          accent="bg-fuchsia-400/15 text-fuchsia-300"
        >
          <div className="flex h-full flex-col justify-center">
            <div className="break-words text-sm font-bold leading-snug sm:text-xl sm:font-extrabold">
              {team.homeStadium}
            </div>
            <p className="mt-2 text-[10px] font-medium leading-snug text-muted-foreground sm:text-xs">
              National team home venue
            </p>
          </div>
        </InfoCard>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <PersonFeatureCard
          label="Head coach"
          name={managerName}
          detail={`Manager · ${team.name}`}
          searchHint="football manager"
          icon={UserRoundCog}
          gradient="from-rose-500/15 via-background to-background"
        />

        <PersonFeatureCard
          label="Highlight player"
          name={highlightName}
          detail={highlightRole}
          searchHint="footballer"
          icon={Star}
          gradient="from-cyan-500/15 via-background to-background"
        />
      </section>

      <section id="squad" className="scroll-mt-28">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-primary">
              <UsersRound className="h-4 w-4" /> Team roster
            </div>
            <h2 className="mt-2 text-2xl font-black sm:text-3xl md:text-4xl">Full Squad</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Select any player or coach name to open an automatic Google search.
            </p>
          </div>

          {!squadLoading && players.length > 0 && (
            <span className="rounded-full border border-border bg-secondary/40 px-4 py-2 text-xs font-bold">
              {players.length} players
            </span>
          )}
        </div>

        {squadLoading ? (
          <div className="flex min-h-52 items-center justify-center gap-2 rounded-3xl border border-border card-elevated text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            Loading the latest squad list
          </div>
        ) : squadError ? (
          <div className="rounded-3xl border border-amber-500/25 bg-amber-500/10 p-8 text-center">
            <UsersRound className="mx-auto h-9 w-9 text-amber-300" />
            <h3 className="mt-3 text-xl font-black">Squad feed unavailable</h3>
            <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
              {squadError}
            </p>
          </div>
        ) : players.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border p-10 text-center card-elevated">
            <Shirt className="mx-auto h-9 w-9 text-primary" />
            <h3 className="mt-3 text-xl font-black">Squad not published yet</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              This page will populate automatically when the squad feed publishes
              the players.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {groupedPlayers.map((group) => (
              <article
                key={group.key}
                className="overflow-hidden rounded-3xl border border-border card-elevated"
              >
                <div className="flex items-center justify-between border-b border-border bg-secondary/35 px-5 py-4">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
                      {group.short}
                    </div>
                    <h3 className="text-xl font-black">{group.label}</h3>
                  </div>
                  <span className="grid h-9 min-w-9 place-items-center rounded-full bg-primary/10 px-2 text-xs font-black text-primary">
                    {group.players.length}
                  </span>
                </div>

                <div className="divide-y divide-border">
                  {group.players.map((player) => (
                    <a
                      key={player.id}
                      href={googleSearchUrl(player.name, "footballer")}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-secondary/45 sm:px-5"
                    >
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border bg-secondary/60 font-mono text-xs font-black text-primary">
                        {player.shirtNumber != null
                          ? String(player.shirtNumber).padStart(2, "0")
                          : group.short}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-bold transition-colors group-hover:text-primary">
                            {player.name}
                          </span>
                          <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-40 transition-opacity group-hover:opacity-100" />
                        </div>
                        <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                          {player.detailedPosition || group.label.slice(0, -1)}
                          {player.club ? ` · ${player.club}` : ""}
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="mt-4 rounded-2xl border border-border bg-secondary/20 p-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-rose-400/15 text-rose-300">
              <UserRoundCog className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Head coach
              </div>
              <SearchableName
                name={managerName}
                hint="football manager"
                className="font-black"
              />
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-5">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-primary">
            <Building2 className="h-4 w-4" /> Host venues
          </div>
          <h2 className="mt-2 text-2xl font-black sm:text-3xl">Venues at WC 2026</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from(new Set(teamFixtures.map((fixture) => fixture.stadium)))
            .map((venueName) =>
              STADIUMS.find((stadium) => stadium.name === venueName),
            )
            .filter(
              (stadium): stadium is NonNullable<typeof stadium> => Boolean(stadium),
            )
            .map((stadium) => (
              <Link
                key={stadium.id}
                to={`/stadiums/${stadium.id}`}
                className="card-elevated overflow-hidden rounded-2xl border border-border transition-all hover:-translate-y-0.5 hover:border-primary/50"
              >
                <div className="aspect-[16/10] overflow-hidden bg-secondary/40">
                  <StadiumImage
                    wikiTitle={stadium.wikiTitle}
                    alt={stadium.realName}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="p-4">
                  <div className="font-semibold">{stadium.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {stadium.city}
                  </div>
                </div>
              </Link>
            ))}
        </div>
      </section>

      <section>
        <div className="mb-5">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-primary">
            <Shirt className="h-4 w-4" /> Match day
          </div>
          <h2 className="mt-2 text-2xl font-black sm:text-3xl md:text-4xl">2026 Kits</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Home and away jerseys.
          </p>
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-border">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-secondary/40 to-background" />
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />

          <div className="relative p-3 sm:p-6 md:p-10">
            <div className="mx-auto grid max-w-3xl grid-cols-2 gap-3 sm:gap-5">
              {KIT_TYPES.map((kit) => (
                <figure
                  key={kit.key}
                  className="rounded-2xl border border-border/70 bg-background/70 p-2 shadow-sm backdrop-blur-sm sm:p-3"
                >
                  <div className="aspect-square overflow-hidden rounded-xl bg-white sm:rounded-2xl">
                    <img
                      src={`/kits/${team.slug}-${kit.key}.webp`}
                      alt={`${team.name} 2026 ${kit.label.toLowerCase()} jersey`}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                  <figcaption className="px-1 pb-1 pt-2 text-center">
                    <div className="text-xs font-semibold sm:text-sm">
                      {kit.label}
                    </div>
                    <div className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground sm:text-[10px]">
                      Jersey
                    </div>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-5">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-primary">
            <CalendarDays className="h-4 w-4" /> Tournament schedule
          </div>
          <h2 className="mt-2 text-2xl font-black sm:text-3xl">Group Stage Fixtures</h2>
        </div>

        <div className="space-y-2">
          {teamFixtures.map((fixture) => (
            <Link
              key={fixture.id}
              to={`/matches/${fixture.id}`}
              className="card-elevated grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 rounded-xl border border-border px-4 py-3 transition-colors hover:border-primary/50 sm:flex sm:flex-wrap sm:items-center sm:gap-4 sm:px-5"
            >
              <div className="text-xs text-muted-foreground sm:w-24">
                {new Date(fixture.date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </div>
              <div className="text-right font-mono text-xs text-muted-foreground sm:w-14 sm:text-left">
                {fixture.time}
              </div>
              <div className="col-span-2 min-w-0 flex-1 text-sm font-medium sm:min-w-[180px] sm:text-base">
                {fixture.home}{" "}
                <span className="text-muted-foreground">vs</span>{" "}
                {fixture.away}
              </div>
              <div className="hidden text-sm text-muted-foreground sm:block">
                {fixture.stadium}
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
};

export default TeamPage;
