import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  DEFAULT_TIMEZONE,
  FIXTURES,
  Fixture,
  TIMEZONE_OPTIONS,
  formatFixtureDateLong,
  formatFixtureTime,
  getTeamByName,
} from "@/data/wc26";
import TeamFlag from "@/components/TeamFlag";
import { teamKey, useLiveScores } from "@/hooks/useLiveScores";
import { useMatchDetails } from "@/hooks/useMatchDetails";
import { buildPlayerRatingTeams, ratingTone } from "@/utils/playerRatings";
import {
  Activity,
  Award,
  CalendarDays,
  Clock3,
  MapPin,
  RefreshCw,
  Shield,
  Users,
} from "lucide-react";

type AnyRecord = Record<string, any>;

type StatRow = {
  key: string;
  label: string;
  home: string;
  away: string;
};

type TimelineEvent = {
  id: string;
  clock: string;
  text: string;
  team: string;
};

type GoalEvent = {
  id: string;
  scorer: string;
  clock: string;
  team: string;
  qualifier: string;
};

type MatchGoals = {
  home: GoalEvent[];
  away: GoalEvent[];
};

const STAGE_LABELS: Record<Fixture["stage"], string> = {
  Group: "Group Stage",
  R32: "Round of 32",
  R16: "Round of 16",
  QF: "Quarter-finals",
  SF: "Semi-finals",
  "3rd": "Third-place match",
  Final: "Final",
};

const TZ_STORAGE_KEY = "wc26.timezone";

const asArray = <T,>(value: T[] | undefined | null): T[] =>
  Array.isArray(value) ? value : [];

const stringValue = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
};

const teamName = (value?: AnyRecord) =>
  stringValue(
    value?.displayName,
    value?.shortDisplayName,
    value?.name,
    value?.team?.displayName,
    value?.team?.shortDisplayName,
    value?.team?.name,
  );

const readScore = (value: unknown) => {
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const record = value as AnyRecord;
    return stringValue(record.displayValue, record.value);
  }
  return "";
};

const findTeamBlock = (
  blocks: AnyRecord[],
  targetName: string,
  fallbackIndex: number,
) =>
  blocks.find((block) => teamKey(teamName(block.team ?? block)) === teamKey(targetName)) ??
  blocks[fallbackIndex];

const buildStats = (
  summary: AnyRecord | undefined,
  homeName: string,
  awayName: string,
): StatRow[] => {
  const teams = asArray<AnyRecord>(summary?.boxscore?.teams);
  if (teams.length < 2) return [];

  const homeBlock = findTeamBlock(teams, homeName, 0);
  const awayBlock = findTeamBlock(teams, awayName, 1);
  const homeStats = asArray<AnyRecord>(homeBlock?.statistics);
  const awayStats = asArray<AnyRecord>(awayBlock?.statistics);

  const makeKey = (stat: AnyRecord, index: number) =>
    stringValue(stat.name, stat.abbreviation, stat.label, stat.displayName) ||
    `stat-${index}`;

  const homeMap = new Map(
    homeStats.map((stat, index) => [makeKey(stat, index), stat]),
  );
  const awayMap = new Map(
    awayStats.map((stat, index) => [makeKey(stat, index), stat]),
  );
  const keys = Array.from(new Set([...homeMap.keys(), ...awayMap.keys()]));

  return keys
    .map((key) => {
      const home = homeMap.get(key);
      const away = awayMap.get(key);
      const label = stringValue(
        home?.label,
        away?.label,
        home?.displayName,
        away?.displayName,
        home?.abbreviation,
        away?.abbreviation,
        key,
      );
      const homeValue = stringValue(home?.displayValue, home?.value, "-");
      const awayValue = stringValue(away?.displayValue, away?.value, "-");

      return {
        key,
        label,
        home: homeValue || "-",
        away: awayValue || "-",
      };
    })
    .filter((row) => row.label && (row.home !== "-" || row.away !== "-"));
};

const eventDescription = (event: AnyRecord) => {
  const participants = asArray<AnyRecord>(event.participants)
    .map((participant) =>
      teamName(participant.athlete ?? participant.player ?? participant),
    )
    .filter(Boolean)
    .join(", ");

  const type = stringValue(
    event.type?.text,
    event.type?.displayName,
    event.playType?.text,
  );

  return stringValue(
    event.text,
    event.description,
    participants && type ? `${type}: ${participants}` : "",
    participants,
    type,
  );
};

const buildTimeline = (summary: AnyRecord | undefined): TimelineEvent[] => {
  const primary = [
    ...asArray<AnyRecord>(summary?.details),
    ...asArray<AnyRecord>(summary?.keyEvents),
  ];
  const source =
    primary.length > 0
      ? primary
      : asArray<AnyRecord>(summary?.commentary).slice(-25);

  const seen = new Set<string>();

  return source
    .map((event, index) => {
      const clock = stringValue(
        event.clock?.displayValue,
        event.time?.displayValue,
        event.time,
      );
      const text = eventDescription(event);
      const team = teamName(event.team);
      const key = `${clock}|${text}|${team}`;
      return {
        id: stringValue(event.id, event.sequenceNumber, key, index),
        clock,
        text,
        team,
        key,
      };
    })
    .filter((event) => {
      if (!event.text || seen.has(event.key)) return false;
      seen.add(event.key);
      return true;
    })
    .map(({ key: _key, ...event }) => event)
    .slice(0, 40);
};

const playerName = (value?: AnyRecord) =>
  stringValue(
    value?.displayName,
    value?.fullName,
    value?.shortName,
    value?.name,
    value?.athlete?.displayName,
    value?.athlete?.fullName,
    value?.player?.displayName,
    value?.player?.fullName,
  );

const eventTypeText = (event: AnyRecord) =>
  stringValue(
    event.type?.text,
    event.type?.displayName,
    event.type?.name,
    event.playType?.text,
    event.playType?.displayName,
  );

const isGoalEvent = (event: AnyRecord) => {
  const type = eventTypeText(event).toLowerCase();
  const text = stringValue(event.text, event.description).toLowerCase();
  const combined = `${type} ${text}`;

  if (/goal kick|disallowed|ruled out|no goal/.test(combined)) return false;
  if (event.scoringPlay === true) return true;
  return /(^|\s)(own goal|penalty goal|goal)(!|\s|$)/.test(combined);
};

const goalClock = (event: AnyRecord) => {
  const raw = stringValue(
    event.clock?.displayValue,
    event.time?.displayValue,
    event.time,
    event.minute,
  );
  if (!raw) return "";
  if (/['′]/.test(raw)) return raw;
  if (/^\d+(?:\+\d+)?$/.test(raw)) return `${raw}′`;
  return raw;
};

const goalSortValue = (clock: string) => {
  const numbers = clock.match(/\d+/g)?.map(Number) ?? [];
  return (numbers[0] ?? 0) * 100 + (numbers[1] ?? 0);
};

const buildGoals = (
  summary: AnyRecord | undefined,
  homeName: string,
  awayName: string,
): MatchGoals => {
  if (!summary) return { home: [], away: [] };

  const competition = asArray<AnyRecord>(summary?.header?.competitions)[0];
  const competitors = asArray<AnyRecord>(competition?.competitors);
  const homeCompetitor =
    competitors.find((item) => item.homeAway === "home") ??
    findTeamBlock(competitors, homeName, 0);
  const awayCompetitor =
    competitors.find((item) => item.homeAway === "away") ??
    findTeamBlock(competitors, awayName, 1);
  const homeId = stringValue(homeCompetitor?.team?.id, homeCompetitor?.id);
  const awayId = stringValue(awayCompetitor?.team?.id, awayCompetitor?.id);

  const source = [
    ...asArray<AnyRecord>(summary?.details),
    ...asArray<AnyRecord>(summary?.keyEvents),
    ...asArray<AnyRecord>(summary?.commentary),
  ];

  const seen = new Set<string>();
  const result: MatchGoals = { home: [], away: [] };

  for (const event of source) {
    if (!isGoalEvent(event)) continue;

    const participants = asArray<AnyRecord>(event.participants);
    const scorerParticipant =
      participants.find((participant) => {
        const role = stringValue(
          participant.type?.text,
          participant.type?.displayName,
          participant.type?.name,
          participant.role,
        ).toLowerCase();
        return /scorer|goal/.test(role);
      }) ?? participants[0];

    const scorer =
      playerName(scorerParticipant?.athlete ?? scorerParticipant?.player ?? scorerParticipant) ||
      playerName(event.athlete ?? event.player) ||
      "Goal";
    const clock = goalClock(event);
    const eventTeam =
      teamName(event.team) ||
      teamName(scorerParticipant?.team) ||
      teamName(event.competitor);
    const eventTeamId = stringValue(
      event.team?.id,
      scorerParticipant?.team?.id,
      event.competitor?.id,
    );

    let side: "home" | "away" | null = null;
    if (eventTeamId && homeId && eventTeamId === homeId) side = "home";
    else if (eventTeamId && awayId && eventTeamId === awayId) side = "away";
    else if (eventTeam && teamKey(eventTeam) === teamKey(homeName)) side = "home";
    else if (eventTeam && teamKey(eventTeam) === teamKey(awayName)) side = "away";
    else if (event.homeAway === "home") side = "home";
    else if (event.homeAway === "away") side = "away";

    if (!side) continue;

    const combined = `${eventTypeText(event)} ${stringValue(event.text, event.description)}`.toLowerCase();
    const qualifier = /own goal/.test(combined)
      ? "OG"
      : /penalty/.test(combined)
        ? "P"
        : "";
    const id = stringValue(event.id, event.sequenceNumber, `${side}-${scorer}-${clock}`);
    const duplicateKey = `${side}|${scorer}|${clock}|${qualifier}`;
    if (seen.has(duplicateKey)) continue;
    seen.add(duplicateKey);

    result[side].push({ id, scorer, clock, team: eventTeam, qualifier });
  }

  result.home.sort((a, b) => goalSortValue(a.clock) - goalSortValue(b.clock));
  result.away.sort((a, b) => goalSortValue(a.clock) - goalSortValue(b.clock));
  return result;
};

const MatchPage = () => {
  const { fixtureId } = useParams();
  const fixture = FIXTURES.find((item) => String(item.id) === fixtureId);
  const [tz] = useState<string>(() => {
    if (typeof window === "undefined") return DEFAULT_TIMEZONE;
    return localStorage.getItem(TZ_STORAGE_KEY) || DEFAULT_TIMEZONE;
  });

  const {
    data: liveScores,
    refreshing: liveRefreshing,
    error: liveError,
    pairKey,
  } = useLiveScores(30_000);

  const liveEvent = fixture
    ? liveScores.get(pairKey(fixture.home, fixture.away))
    : undefined;

  const {
    data: details,
    loading: detailsLoading,
    refreshing: detailsRefreshing,
    lastUpdated,
    error: detailsError,
  } = useMatchDetails(
    {
      eventId: liveEvent?.id,
      date: fixture?.date,
      home: fixture?.home,
      away: fixture?.away,
    },
    30_000,
  );

  const summary = details?.summary as AnyRecord | undefined;
  const competition = asArray<AnyRecord>(summary?.header?.competitions)[0];
  const competitors = asArray<AnyRecord>(competition?.competitors);
  const summaryHome =
    competitors.find((item) => item.homeAway === "home") ??
    findTeamBlock(competitors, fixture?.home ?? "", 0);
  const summaryAway =
    competitors.find((item) => item.homeAway === "away") ??
    findTeamBlock(competitors, fixture?.away ?? "", 1);

  const sameLiveOrder =
    fixture && liveEvent
      ? teamKey(liveEvent.home) === teamKey(fixture.home)
      : true;

  const liveHomeScore = liveEvent
    ? sameLiveOrder
      ? liveEvent.homeScore
      : liveEvent.awayScore
    : null;
  const liveAwayScore = liveEvent
    ? sameLiveOrder
      ? liveEvent.awayScore
      : liveEvent.homeScore
    : null;

  const summaryHomeScore = readScore(summaryHome?.score);
  const summaryAwayScore = readScore(summaryAway?.score);
  const homeScore =
    liveHomeScore ??
    (summaryHomeScore !== ""
      ? summaryHomeScore
      : fixture?.score?.home ?? null);
  const awayScore =
    liveAwayScore ??
    (summaryAwayScore !== ""
      ? summaryAwayScore
      : fixture?.score?.away ?? null);

  const hasScore = homeScore !== null && awayScore !== null && homeScore !== "" && awayScore !== "";
  const statusText = stringValue(
    liveEvent?.live ? liveEvent.progress ?? "LIVE" : "",
    liveEvent?.finished ? "FT" : "",
    competition?.status?.type?.shortDetail,
    competition?.status?.type?.detail,
    competition?.status?.type?.description,
    hasScore ? "FT" : "Upcoming",
  );

  const stats = useMemo(
    () =>
      fixture
        ? buildStats(summary, fixture.home, fixture.away)
        : [],
    [summary, fixture],
  );
  const timeline = useMemo(() => buildTimeline(summary), [summary]);
  const goals = useMemo(
    () =>
      fixture
        ? buildGoals(summary, fixture.home, fixture.away)
        : { home: [], away: [] },
    [summary, fixture],
  );
  const competitionState = stringValue(competition?.status?.type?.state);
  const matchStarted = Boolean(
    liveEvent?.live ||
      liveEvent?.finished ||
      competitionState === "in" ||
      competitionState === "post" ||
      fixture?.score,
  );
  const lineups = useMemo(
    () =>
      buildPlayerRatingTeams(summary, {
        homeTeam: fixture?.home,
        awayTeam: fixture?.away,
        homeScore,
        awayScore,
        matchStarted,
      }),
    [summary, fixture?.home, fixture?.away, homeScore, awayScore, matchStarted],
  );
  const playerOfMatch = useMemo(() => {
    const rated = lineups
      .flatMap((lineup) =>
        lineup.players
          .filter((player) => player.rating != null)
          .map((player) => ({ ...player, team: lineup.team })),
      )
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    return rated[0] ?? null;
  }, [lineups]);

  if (!fixture) {
    return (
      <div className="container py-20 text-center">
        <h1 className="text-3xl font-bold">Match not found</h1>
        <Link to="/fixtures" className="text-primary mt-4 inline-block">
          ← Back to fixtures
        </Link>
      </div>
    );
  }

  const tzShort = TIMEZONE_OPTIONS.find((option) => option.value === tz)?.short ?? tz;
  const venue = stringValue(summary?.gameInfo?.venue?.fullName, fixture.stadium);
  const attendance = stringValue(summary?.gameInfo?.attendance);
  const weather = stringValue(
    summary?.gameInfo?.weather?.displayValue,
    summary?.gameInfo?.weather?.temperature,
  );
  const officials = asArray<AnyRecord>(summary?.gameInfo?.officials);
  const refreshActive = liveRefreshing || detailsRefreshing;
  const homeTeamSlug = getTeamByName(fixture.home)?.slug;
  const awayTeamSlug = getTeamByName(fixture.away)?.slug;
  const attendanceLabel = (() => {
    if (!attendance) return "Not available";
    const numeric = Number(attendance.replace(/,/g, ""));
    return Number.isFinite(numeric) ? numeric.toLocaleString() : attendance;
  })();

  return (
    <div className="container py-10 md:py-12 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/fixtures"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to fixtures
        </Link>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <RefreshCw className={`h-3.5 w-3.5 ${refreshActive ? "animate-spin" : ""}`} />
          <span>
            Auto-updates every 30 seconds
            {lastUpdated
              ? ` · Updated ${lastUpdated.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}`
              : ""}
          </span>
        </div>
      </div>

      <section className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/15 via-secondary/50 to-background p-5 sm:p-8 md:p-10">
        <div className="absolute inset-0 opacity-[0.06]" style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }} />
        <div className="relative">
          <div className="mb-7 flex flex-wrap items-center justify-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
            <span>Match #{fixture.id}</span>
            <span>·</span>
            <span>
              {fixture.stage === "Group"
                ? `Group ${fixture.group}`
                : STAGE_LABELS[fixture.stage]}
            </span>
          </div>

          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-8">
            <Link to={homeTeamSlug ? `/teams/${homeTeamSlug}` : "/teams"} className="text-center group min-w-0">
              <TeamFlag
                name={fixture.home}
                className="mx-auto h-16 w-16 sm:h-24 sm:w-24 rounded-2xl shadow-lg transition-transform group-hover:scale-105"
                eager
              />
              <div className="mt-3 text-base sm:text-xl md:text-2xl font-bold break-words">
                {fixture.home}
              </div>
            </Link>

            <div className="text-center">
              <div className={`text-[10px] sm:text-xs font-bold uppercase tracking-widest ${liveEvent?.live ? "text-red-500" : "text-muted-foreground"}`}>
                {statusText}
              </div>
              <div className="mt-2 min-w-[88px] sm:min-w-[130px] rounded-2xl border border-border bg-background/80 px-3 py-3 sm:px-5 sm:py-4 font-mono text-3xl sm:text-5xl font-bold tabular-nums shadow-sm">
                {hasScore ? `${homeScore}–${awayScore}` : "VS"}
              </div>
            </div>

            <Link to={awayTeamSlug ? `/teams/${awayTeamSlug}` : "/teams"} className="text-center group min-w-0">
              <TeamFlag
                name={fixture.away}
                className="mx-auto h-16 w-16 sm:h-24 sm:w-24 rounded-2xl shadow-lg transition-transform group-hover:scale-105"
                eager
              />
              <div className="mt-3 text-base sm:text-xl md:text-2xl font-bold break-words">
                {fixture.away}
              </div>
            </Link>
          </div>

          {(goals.home.length > 0 || goals.away.length > 0) && (
            <div className="mx-auto mt-5 grid max-w-2xl grid-cols-2 gap-5 sm:gap-10 text-xs sm:text-sm">
              <div className="space-y-1.5 text-right">
                {goals.home.map((goal) => (
                  <div key={goal.id} className="font-medium leading-tight">
                    <span>{goal.scorer}</span>
                    {goal.qualifier && (
                      <span className="ml-1 text-[10px] font-semibold text-muted-foreground">
                        ({goal.qualifier})
                      </span>
                    )}
                    {goal.clock && (
                      <span className="ml-2 font-mono text-muted-foreground">
                        {goal.clock}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <div className="space-y-1.5 text-left">
                {goals.away.map((goal) => (
                  <div key={goal.id} className="font-medium leading-tight">
                    {goal.clock && (
                      <span className="mr-2 font-mono text-muted-foreground">
                        {goal.clock}
                      </span>
                    )}
                    <span>{goal.scorer}</span>
                    {goal.qualifier && (
                      <span className="ml-1 text-[10px] font-semibold text-muted-foreground">
                        ({goal.qualifier})
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-elevated rounded-2xl border border-border p-5">
          <CalendarDays className="h-5 w-5 text-primary" />
          <div className="mt-3 text-xs uppercase tracking-widest text-muted-foreground">Date</div>
          <div className="mt-1 font-semibold">{formatFixtureDateLong(fixture, tz)}</div>
        </div>
        <div className="card-elevated rounded-2xl border border-border p-5">
          <Clock3 className="h-5 w-5 text-primary" />
          <div className="mt-3 text-xs uppercase tracking-widest text-muted-foreground">Kickoff</div>
          <div className="mt-1 font-semibold">
            {formatFixtureTime(fixture, tz)} {tzShort}
          </div>
        </div>
        <div className="card-elevated rounded-2xl border border-border p-5">
          <MapPin className="h-5 w-5 text-primary" />
          <div className="mt-3 text-xs uppercase tracking-widest text-muted-foreground">Venue</div>
          <div className="mt-1 font-semibold">{venue}</div>
        </div>
        <div className="card-elevated rounded-2xl border border-border p-5">
          <Users className="h-5 w-5 text-primary" />
          <div className="mt-3 text-xs uppercase tracking-widest text-muted-foreground">Attendance</div>
          <div className="mt-1 font-semibold">
            {attendanceLabel}
          </div>
          {weather && <div className="mt-1 text-xs text-muted-foreground">{weather}</div>}
        </div>
      </section>

      {(liveError || detailsError) && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-4 text-sm">
          Some live data is temporarily unavailable. Stored fixture information remains visible while the feed reconnects.
        </div>
      )}

      <section className="card-elevated rounded-3xl border border-border overflow-hidden">
        <div className="flex items-center gap-3 border-b border-border px-5 sm:px-7 py-5">
          <Activity className="h-5 w-5 text-primary" />
          <div>
            <h2 className="text-xl sm:text-2xl font-bold">Match Statistics</h2>
            <p className="text-xs text-muted-foreground">Updated automatically when the provider publishes new data.</p>
          </div>
        </div>

        {stats.length > 0 ? (
          <div className="divide-y divide-border">
            {stats.map((stat) => (
              <div key={stat.key} className="grid grid-cols-[1fr_1.6fr_1fr] items-center gap-3 px-4 sm:px-7 py-3 text-sm">
                <div className="text-center font-mono font-semibold tabular-nums">{stat.home}</div>
                <div className="text-center text-xs sm:text-sm text-muted-foreground">{stat.label}</div>
                <div className="text-center font-mono font-semibold tabular-nums">{stat.away}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">
            {detailsLoading
              ? "Loading match statistics…"
              : "Detailed statistics are not available yet. They will appear automatically when published."}
          </div>
        )}
      </section>

      {timeline.length > 0 && (
        <section className="card-elevated rounded-3xl border border-border overflow-hidden">
          <div className="border-b border-border px-5 sm:px-7 py-5">
            <h2 className="text-xl sm:text-2xl font-bold">Match Timeline</h2>
          </div>
          <div className="divide-y divide-border">
            {timeline.map((event) => (
              <div key={event.id} className="grid grid-cols-[52px_1fr] gap-3 px-5 sm:px-7 py-4">
                <div className="font-mono text-sm font-bold text-primary">{event.clock || "—"}</div>
                <div>
                  <div className="text-sm font-medium">{event.text}</div>
                  {event.team && <div className="mt-0.5 text-xs text-muted-foreground">{event.team}</div>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {playerOfMatch && (
        <section className="relative overflow-hidden rounded-2xl border border-primary/30 bg-primary/10 p-5 sm:p-6">
          <div className="absolute right-4 top-4 opacity-10">
            <Award className="h-20 w-20" />
          </div>
          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-primary">
                <Award className="h-4 w-4" />
                Player of the Match
              </div>
              <div className="mt-2 text-2xl sm:text-3xl font-bold">{playerOfMatch.name}</div>
              <div className="mt-1 text-sm text-muted-foreground">
                {playerOfMatch.team}
                {playerOfMatch.position ? ` · ${playerOfMatch.position}` : ""}
              </div>
            </div>
            <div className={`min-w-[82px] rounded-2xl border px-4 py-3 text-center ${ratingTone(playerOfMatch.rating)}`}>
              <div className="font-mono text-3xl font-bold tabular-nums">
                {playerOfMatch.rating?.toFixed(1)}
              </div>
              <div className="mt-0.5 text-[9px] uppercase tracking-widest">
                {playerOfMatch.ratingSource === "provider" ? "Provider" : playerOfMatch.ratingSource === "estimated" ? "Estimated" : "Fan26"}
              </div>
            </div>
          </div>
        </section>
      )}

      {lineups.length > 0 && (
        <section>
          <div className="mb-4 flex items-center gap-3">
            <Shield className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-2xl font-bold">Player Ratings & Lineups</h2>
              <p className="mt-1 text-xs text-muted-foreground">Provider ratings are used when available. Fan26 ratings use published player data; estimated ratings use lineups, match result and recorded events when individual statistics are missing. All values refresh automatically.</p>
            </div>
          </div>
          <div className="grid lg:grid-cols-2 gap-5">
            {lineups.map((lineup) => {
              const starters = lineup.players.filter((player) => player.starter);
              const substitutes = lineup.players.filter((player) => !player.starter);
              return (
                <div key={lineup.team} className="card-elevated rounded-2xl border border-border overflow-hidden">
                  <div className="border-b border-border bg-secondary/30 px-5 py-4 font-bold">{lineup.team}</div>
                  <div className="p-5 space-y-5">
                    {starters.length > 0 && (
                      <div>
                        <div className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">Starting XI</div>
                        <div className="space-y-2">
                          {starters.map((player) => (
                            <div key={player.id} className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm hover:bg-secondary/30">
                              <span className="w-7 font-mono text-muted-foreground">{player.jersey || "—"}</span>
                              <span className="min-w-0 flex-1 font-medium">
                                <span className="block truncate">{player.name}</span>
                                {player.ratingSource && (
                                  <span className="block text-[9px] uppercase tracking-wider text-muted-foreground">
                                    {player.ratingSource === "provider" ? "Provider rating" : player.ratingSource === "estimated" ? "Estimated Fan26 rating" : "Fan26 rating"}
                                  </span>
                                )}
                              </span>
                              <span className="hidden sm:inline text-xs text-muted-foreground">{player.position}</span>
                              <span
                                title={
                                  player.ratingSource === "provider"
                                    ? "Rating supplied by the match data provider"
                                    : player.ratingSource === "fan26"
                                      ? "Fan26 rating calculated from available individual match statistics"
                                      : player.ratingSource === "estimated"
                                        ? "Estimated Fan26 rating based on lineup status, match result and recorded match events"
                                        : player.didNotPlay || !player.played
                                          ? "Did not play"
                                          : "Rating unavailable"
                                }
                                className={`w-12 shrink-0 rounded-lg border px-2 py-1 text-center font-mono font-bold tabular-nums ${ratingTone(player.rating)}`}
                              >
                                {player.rating != null ? player.rating.toFixed(1) : player.didNotPlay || !player.played ? "DNP" : "—"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {substitutes.length > 0 && (
                      <div>
                        <div className="mb-2 text-xs uppercase tracking-widest text-muted-foreground">Substitutes</div>
                        <div className="space-y-2">
                          {substitutes.map((player) => (
                            <div key={player.id} className="flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm hover:bg-secondary/30">
                              <span className="w-7 font-mono text-muted-foreground">{player.jersey || "—"}</span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate">{player.name}</span>
                                {player.ratingSource && (
                                  <span className="block text-[9px] uppercase tracking-wider text-muted-foreground">
                                    {player.ratingSource === "provider" ? "Provider rating" : player.ratingSource === "estimated" ? "Estimated Fan26 rating" : "Fan26 rating"}
                                  </span>
                                )}
                              </span>
                              <span className="hidden sm:inline text-xs text-muted-foreground">{player.position}</span>
                              <span
                                title={
                                  player.ratingSource === "provider"
                                    ? "Rating supplied by the match data provider"
                                    : player.ratingSource === "fan26"
                                      ? "Fan26 rating calculated from available individual match statistics"
                                      : player.ratingSource === "estimated"
                                        ? "Estimated Fan26 rating based on lineup status, match result and recorded match events"
                                        : player.didNotPlay || !player.played
                                          ? "Did not play"
                                          : "Rating unavailable"
                                }
                                className={`w-12 shrink-0 rounded-lg border px-2 py-1 text-center font-mono font-bold tabular-nums ${ratingTone(player.rating)}`}
                              >
                                {player.rating != null ? player.rating.toFixed(1) : player.didNotPlay || !player.played ? "DNP" : "—"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {officials.length > 0 && (
        <section className="card-elevated rounded-2xl border border-border p-5 sm:p-7">
          <h2 className="text-xl font-bold">Match Officials</h2>
          <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {officials.map((official, index) => (
              <div key={stringValue(official.id, official.displayName, index)} className="rounded-xl bg-secondary/40 px-4 py-3">
                <div className="font-medium">{stringValue(official.displayName, official.name)}</div>
                <div className="text-xs text-muted-foreground">{stringValue(official.position?.displayName, official.position?.name, "Official")}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {!details?.available && !detailsLoading && (
        <div className="rounded-2xl border border-dashed border-border px-5 py-8 text-center text-sm text-muted-foreground">
          Advanced match data has not been published yet. This page will detect and display it automatically when it becomes available.
        </div>
      )}
    </div>
  );
};

export default MatchPage;
