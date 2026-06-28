import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { RefreshCw, Search, ShieldCheck, ShieldX } from "lucide-react";
import TeamFlag from "@/components/TeamFlag";
import { getTeamByName } from "@/data/wc26";
import { useAnnexC } from "@/hooks/useAnnexC";
import { useLiveScores } from "@/hooks/useLiveScores";
import { buildTournamentState, StandingRow } from "@/utils/tournament";

const StatusBadge = ({ status }: { status: StandingRow["qualificationStatus"] }) => {
  if (!status) return null;
  const qualified = status === "Q";
  return (
    <span
      title={qualified ? "Qualified" : "Eliminated"}
      className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-black ${
        qualified
          ? "bg-emerald-500/15 text-emerald-500 ring-1 ring-emerald-500/30"
          : "bg-red-500/15 text-red-500 ring-1 ring-red-500/30"
      }`}
    >
      {status}
    </span>
  );
};


const TieBreakBadge = ({ third = false }: { third?: boolean }) => (
  <span
    title={third ? "Team conduct or FIFA ranking is still needed to order these third-place teams" : "Team conduct or FIFA ranking is still needed to separate these teams"}
    className="inline-flex h-5 items-center justify-center rounded-full bg-amber-500/15 px-1.5 text-[9px] font-black text-amber-500 ring-1 ring-amber-500/30"
  >
    TB
  </span>
);

const MobileRow = ({ row, position }: { row: StandingRow; position: number }) => {
  const team = getTeamByName(row.team);
  return (
    <div className="grid grid-cols-[26px_minmax(0,1fr)_42px_34px_42px] items-center gap-1 border-t border-border/70 px-3 py-3 text-xs md:hidden">
      <div className="text-center font-mono text-muted-foreground">{position}</div>
      <Link to={team ? `/teams/${team.slug}` : "/teams"} className="flex min-w-0 items-center gap-2 font-semibold hover:text-primary">
        <TeamFlag name={row.team} slug={team?.slug} className="h-6 w-6 shrink-0 rounded-md" />
        <span className="truncate">{row.team}</span>
        <StatusBadge status={row.qualificationStatus} />
        {row.tieBreakPending && <TieBreakBadge />}
      </Link>
      <div className="text-center font-mono text-sm font-black tabular-nums text-primary">{row.points}</div>
      <div className="text-center font-mono tabular-nums text-muted-foreground">{row.played}</div>
      <div className="text-center font-mono font-semibold tabular-nums">
        {row.goalDifference > 0 ? "+" : ""}{row.goalDifference}
      </div>
    </div>
  );
};

const DesktopRow = ({ row, position }: { row: StandingRow; position: number }) => {
  const team = getTeamByName(row.team);
  const values = [row.played, row.won, row.drawn, row.lost, row.goalsFor, row.goalsAgainst];
  return (
    <div className="hidden grid-cols-[34px_minmax(150px,1fr)_52px_repeat(6,42px)_52px] items-center gap-1 border-t border-border/70 px-4 py-3 text-sm md:grid">
      <div className="text-center font-mono text-muted-foreground">{position}</div>
      <Link to={team ? `/teams/${team.slug}` : "/teams"} className="flex min-w-0 items-center gap-2.5 font-semibold hover:text-primary">
        <TeamFlag name={row.team} slug={team?.slug} className="h-7 w-7 shrink-0 rounded-md" />
        <span className="truncate">{row.team}</span>
        <StatusBadge status={row.qualificationStatus} />
        {row.tieBreakPending && <TieBreakBadge />}
      </Link>
      <div className="text-center font-mono text-base font-black tabular-nums text-primary">{row.points}</div>
      {values.map((value, index) => (
        <div key={index} className="text-center font-mono tabular-nums text-muted-foreground">{value}</div>
      ))}
      <div className="text-center font-mono font-semibold tabular-nums">
        {row.goalDifference > 0 ? "+" : ""}{row.goalDifference}
      </div>
    </div>
  );
};

const GroupHeader = () => (
  <>
    <div className="grid grid-cols-[26px_minmax(0,1fr)_42px_34px_42px] items-center gap-1 px-3 pb-2 text-[9px] font-semibold uppercase tracking-widest text-muted-foreground md:hidden">
      <span className="text-center">#</span><span>Team</span><span className="text-center text-primary">Pts</span><span className="text-center">P</span><span className="text-center">GD</span>
    </div>
    <div className="hidden grid-cols-[34px_minmax(150px,1fr)_52px_repeat(6,42px)_52px] items-center gap-1 px-4 pb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground md:grid">
      <span className="text-center">#</span><span>Team</span><span className="text-center text-primary">Pts</span>
      {['P','W','D','L','GF','GA','GD'].map((label) => <span key={label} className="text-center">{label}</span>)}
    </div>
  </>
);

const Groups = () => {
  const [query, setQuery] = useState("");
  const { data, refreshing, error, lastUpdated, pairKey } = useLiveScores(60_000);
  const annex = useAnnexC();
  const tournament = useMemo(
    () => buildTournamentState(data, pairKey, annex.options),
    [data, pairKey, annex.options],
  );
  const term = query.trim().toLowerCase();
  const visibleGroups = tournament.groups.filter(
    (group) => !term || group.group.toLowerCase() === term || group.rows.some((row) => row.team.toLowerCase().includes(term)),
  );

  return (
    <div className="container py-10 md:py-12">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-4xl font-bold md:text-5xl">Groups & Standings</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Points are shown immediately after the team name. The top two in every group and the eight best third-placed teams qualify for the Round of 32.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {refreshing && <RefreshCw className="h-4 w-4 animate-spin" />}
          {lastUpdated && <span>Updated {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}
        </div>
      </div>

      <div className="mt-6 grid gap-3 rounded-2xl border border-border bg-secondary/20 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex items-center gap-2 text-sm"><ShieldCheck className="h-4 w-4 text-emerald-500" /><b>Q</b><span className="text-muted-foreground">Qualified</span></div>
        <div className="flex items-center gap-2 text-sm"><ShieldX className="h-4 w-4 text-red-500" /><b>E</b><span className="text-muted-foreground">Eliminated</span></div>
        <div className="flex items-center gap-2 text-sm"><TieBreakBadge /><span className="text-muted-foreground">Tie-break pending</span></div>
        <div className="text-sm text-muted-foreground">Blank means qualification is not yet mathematically confirmed.</div>
      </div>

      {(error || annex.error) && (
        <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
          Stored scores remain visible while one of the live data services reconnects.
        </div>
      )}

      <div className="relative mt-7 max-w-xl">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search a team or group…"
          className="w-full rounded-full border border-border bg-input py-3 pl-11 pr-5 outline-none transition-colors focus:border-primary"
        />
      </div>

      <div className="mt-8 grid gap-5 xl:grid-cols-2">
        {visibleGroups.map((group) => (
          <section key={group.group} className="card-elevated overflow-hidden rounded-2xl border border-border">
            <div className="flex items-center justify-between px-4 py-4">
              <div>
                <h2 className="text-xl font-bold">Group {group.group}</h2>
                <p className="text-xs text-muted-foreground">{group.complete ? "Final standings" : group.live ? "Live provisional standings" : "Provisional standings"}</p>
              </div>
              {group.live && <span className="rounded-full bg-red-500/15 px-2.5 py-1 text-[10px] font-bold text-red-500">LIVE</span>}
            </div>
            <GroupHeader />
            {group.rows.map((row, index) => (
              <div key={row.team}>
                <MobileRow row={row} position={index + 1} />
                <DesktopRow row={row} position={index + 1} />
              </div>
            ))}
          </section>
        ))}
      </div>

      <section className="mt-10 overflow-hidden rounded-3xl border border-border card-elevated">
        <div className="border-b border-border px-5 py-5 sm:px-7">
          <h2 className="text-2xl font-bold">Third-place ranking</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            The first eight qualify. Before all groups finish, this list is provisional; Q and E appear only when confirmed.
          </p>
        </div>
        <div className="grid gap-0 md:grid-cols-2">
          {tournament.thirdPlaced.map((row) => {
            const team = getTeamByName(row.team);
            return (
              <div key={row.team} className={`grid grid-cols-[28px_minmax(0,1fr)_44px_44px_44px] items-center gap-2 border-b border-border/70 px-4 py-3 text-sm md:odd:border-r ${row.thirdRank === 8 ? "md:border-b-2 md:border-b-primary/40" : ""}`}>
                <span className="text-center font-mono text-muted-foreground">{row.thirdRank}</span>
                <Link to={team ? `/teams/${team.slug}` : "/teams"} className="flex min-w-0 items-center gap-2 font-semibold hover:text-primary">
                  <TeamFlag name={row.team} slug={team?.slug} className="h-6 w-6 rounded-md" />
                  <span className="truncate">{row.team}</span>
                  <span className="text-[10px] text-muted-foreground">{row.group}</span>
                  <StatusBadge status={row.qualificationStatus} />
                  {row.thirdTieBreakPending && <TieBreakBadge third />}
                </Link>
                <span className="text-center font-mono font-black text-primary">{row.points}</span>
                <span className="text-center font-mono text-muted-foreground">{row.played}</span>
                <span className="text-center font-mono">{row.goalDifference > 0 ? "+" : ""}{row.goalDifference}</span>
              </div>
            );
          })}
        </div>
      </section>

      <div className="mt-5 text-xs leading-relaxed text-muted-foreground">
        Group ties use head-to-head points, head-to-head goal difference and head-to-head goals before overall goal difference and goals scored. Team-conduct and FIFA-ranking data are used by FIFA only if teams remain tied after those criteria.
      </div>
    </div>
  );
};

export default Groups;
