import { useEffect, useMemo, useRef, useState } from "react";
import confetti from "canvas-confetti";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ChevronRight,
  Download,
  Loader2,
  LockKeyhole,
  RefreshCw,
  RotateCcw,
  Trophy,
} from "lucide-react";
import { GROUPS, TEAMS, teamsInGroup } from "@/data/wc26";
import { useLiveScores } from "@/hooks/useLiveScores";
import { useAnnexC } from "@/hooks/useAnnexC";
import { buildTournamentState } from "@/utils/tournament";

const STORAGE_KEY = "wc26-prediction-v5";
const THIRD_WINNER_ORDER = ["A", "B", "D", "E", "G", "I", "K", "L"] as const;

type PredictionState = {
  groupOrder: Record<string, string[]>;
  thirdOrder: string[];
  winners: Record<string, string>;
};

type BracketMatch = {
  id: number;
  home?: string;
  away?: string;
  label: string;
};

type View = "groups" | "bracket" | "summary";
type RoundKey = "R32" | "R16" | "QF" | "SF" | "Final";

const emptyState: PredictionState = {
  groupOrder: {},
  thirdOrder: [],
  winners: {},
};

const team = (name?: string) => TEAMS.find((item) => item.name === name);
const teamGroup = (name?: string) => team(name)?.group;
const flag = (name?: string) => team(name)?.flag ?? "";

const uniqueComplete = (values: string[] | undefined, expected: number) =>
  Boolean(
    values &&
      values.length === expected &&
      values.every(Boolean) &&
      new Set(values).size === expected,
  );

const NEXT_MATCHES: Record<number, number[]> = {
  73: [90],
  74: [89],
  75: [90],
  76: [91],
  77: [89],
  78: [91],
  79: [92],
  80: [92],
  81: [94],
  82: [94],
  83: [93],
  84: [93],
  85: [96],
  86: [95],
  87: [96],
  88: [95],
  89: [97],
  90: [97],
  91: [99],
  92: [99],
  93: [98],
  94: [98],
  95: [100],
  96: [100],
  97: [101],
  98: [101],
  99: [102],
  100: [102],
  101: [103, 104],
  102: [103, 104],
};

const collectDownstream = (matchId: number) => {
  const downstream = new Set<number>();
  const visit = (id: number) => {
    for (const next of NEXT_MATCHES[id] ?? []) {
      if (downstream.has(next)) continue;
      downstream.add(next);
      visit(next);
    }
  };
  visit(matchId);
  return downstream;
};

const downloadCanvas = (canvas: HTMLCanvasElement, filename: string) =>
  new Promise<void>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Could not create the PNG image."));
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      resolve();
    }, "image/png");
  });

const PredictionMobile = () => {
  const [state, setState] = useState<PredictionState>(emptyState);
  const [hydrated, setHydrated] = useState(false);
  const [view, setView] = useState<View>("bracket");
  const [round, setRound] = useState<RoundKey>("R32");
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const lastChampion = useRef<string | undefined>();

  const annex = useAnnexC();
  const {
    data: liveScores,
    loading: standingsLoading,
    refreshing: standingsRefreshing,
    pairKey,
  } = useLiveScores(60_000);

  const tournament = useMemo(
    () => buildTournamentState(liveScores, pairKey, annex.options),
    [liveScores, pairKey, annex.options],
  );

  const standingsSeed = useMemo<PredictionState>(() => {
    const groupOrder = Object.fromEntries(
      tournament.groups.map((group) => [
        group.group,
        group.rows.map((row) => row.team),
      ]),
    );
    return {
      groupOrder,
      thirdOrder: tournament.thirdPlaced.map((row) => row.team),
      winners: {},
    };
  }, [tournament.groups, tournament.thirdPlaced]);

  const standingsSignature = useMemo(
    () =>
      GROUPS.map((group) => standingsSeed.groupOrder[group]?.join(",") ?? "")
        .concat(standingsSeed.thirdOrder.join(","))
        .join("|"),
    [standingsSeed],
  );

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<PredictionState>;
        setState({
          groupOrder: parsed.groupOrder ?? {},
          thirdOrder: parsed.thirdOrder ?? [],
          winners: parsed.winners ?? {},
        });
      }
    } catch {
      // Start with current standings when saved browser data is malformed.
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated || standingsLoading) return;
    setState((current) => {
      const alreadyStarted = GROUPS.some(
        (group) => current.groupOrder[group]?.filter(Boolean).length,
      );
      return alreadyStarted ? current : standingsSeed;
    });
  }, [hydrated, standingsLoading, standingsSignature, standingsSeed]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [hydrated, state]);

  const groupStageComplete = GROUPS.every((group) =>
    uniqueComplete(state.groupOrder[group], 4),
  );
  const thirdTeams = useMemo(
    () =>
      groupStageComplete
        ? GROUPS.map((group) => state.groupOrder[group][2]).filter(Boolean)
        : [],
    [groupStageComplete, state.groupOrder],
  );
  const thirdSignature = thirdTeams.join("|");

  useEffect(() => {
    if (!hydrated || !groupStageComplete) return;
    setState((current) => {
      const allowed = new Set(thirdTeams);
      const retained = current.thirdOrder.filter((name) => allowed.has(name));
      const missing = thirdTeams.filter((name) => !retained.includes(name));
      const next = [...retained, ...missing];
      if (next.join("|") === current.thirdOrder.join("|")) return current;
      return { ...current, thirdOrder: next, winners: {} };
    });
  }, [hydrated, groupStageComplete, thirdSignature]);

  const thirdRankingComplete =
    groupStageComplete && uniqueComplete(state.thirdOrder, 12);
  const bestThirds = thirdRankingComplete ? state.thirdOrder.slice(0, 8) : [];
  const annexKey = bestThirds
    .map((name) => teamGroup(name))
    .filter(Boolean)
    .sort()
    .join("");
  const annexMapping = annexKey ? annex.options[annexKey] : undefined;
  const fullAnnexReady = annex.exactCount >= 490;

  const groupAt = (group: string, position: number) =>
    state.groupOrder[group]?.[position - 1];
  const thirdByGroup = (group: string) =>
    thirdTeams.find((name) => teamGroup(name) === group);

  const r32 = useMemo<BracketMatch[]>(() => {
    if (!thirdRankingComplete || !annexMapping || annexMapping.length !== 8) {
      return [];
    }
    const assigned = Object.fromEntries(
      THIRD_WINNER_ORDER.map((winnerGroup, index) => [
        winnerGroup,
        thirdByGroup(annexMapping[index]),
      ]),
    );
    return [
      { id: 73, home: groupAt("A", 2), away: groupAt("B", 2), label: "2A v 2B" },
      { id: 74, home: groupAt("E", 1), away: assigned.E, label: "1E v best 3rd" },
      { id: 75, home: groupAt("F", 1), away: groupAt("C", 2), label: "1F v 2C" },
      { id: 76, home: groupAt("C", 1), away: groupAt("F", 2), label: "1C v 2F" },
      { id: 77, home: groupAt("I", 1), away: assigned.I, label: "1I v best 3rd" },
      { id: 78, home: groupAt("E", 2), away: groupAt("I", 2), label: "2E v 2I" },
      { id: 79, home: groupAt("A", 1), away: assigned.A, label: "1A v best 3rd" },
      { id: 80, home: groupAt("L", 1), away: assigned.L, label: "1L v best 3rd" },
      { id: 81, home: groupAt("D", 1), away: assigned.D, label: "1D v best 3rd" },
      { id: 82, home: groupAt("G", 1), away: assigned.G, label: "1G v best 3rd" },
      { id: 83, home: groupAt("K", 2), away: groupAt("L", 2), label: "2K v 2L" },
      { id: 84, home: groupAt("H", 1), away: groupAt("J", 2), label: "1H v 2J" },
      { id: 85, home: groupAt("B", 1), away: assigned.B, label: "1B v best 3rd" },
      { id: 86, home: groupAt("J", 1), away: groupAt("H", 2), label: "1J v 2H" },
      { id: 87, home: groupAt("K", 1), away: assigned.K, label: "1K v best 3rd" },
      { id: 88, home: groupAt("D", 2), away: groupAt("G", 2), label: "2D v 2G" },
    ];
  }, [thirdRankingComplete, annexMapping, state.groupOrder, thirdSignature]);

  const validWinner = (match: BracketMatch | undefined) => {
    if (!match?.home || !match.away) return undefined;
    const selected = state.winners[String(match.id)];
    return selected === match.home || selected === match.away
      ? selected
      : undefined;
  };

  const findMatch = (matches: BracketMatch[], id: number) =>
    matches.find((match) => match.id === id);

  const r16 = useMemo<BracketMatch[]>(
    () => [
      { id: 89, home: validWinner(findMatch(r32, 74)), away: validWinner(findMatch(r32, 77)), label: "W74 v W77" },
      { id: 90, home: validWinner(findMatch(r32, 73)), away: validWinner(findMatch(r32, 75)), label: "W73 v W75" },
      { id: 91, home: validWinner(findMatch(r32, 76)), away: validWinner(findMatch(r32, 78)), label: "W76 v W78" },
      { id: 92, home: validWinner(findMatch(r32, 79)), away: validWinner(findMatch(r32, 80)), label: "W79 v W80" },
      { id: 93, home: validWinner(findMatch(r32, 83)), away: validWinner(findMatch(r32, 84)), label: "W83 v W84" },
      { id: 94, home: validWinner(findMatch(r32, 81)), away: validWinner(findMatch(r32, 82)), label: "W81 v W82" },
      { id: 95, home: validWinner(findMatch(r32, 86)), away: validWinner(findMatch(r32, 88)), label: "W86 v W88" },
      { id: 96, home: validWinner(findMatch(r32, 85)), away: validWinner(findMatch(r32, 87)), label: "W85 v W87" },
    ],
    [r32, state.winners],
  );

  const qf = useMemo<BracketMatch[]>(
    () => [
      { id: 97, home: validWinner(findMatch(r16, 89)), away: validWinner(findMatch(r16, 90)), label: "W89 v W90" },
      { id: 98, home: validWinner(findMatch(r16, 93)), away: validWinner(findMatch(r16, 94)), label: "W93 v W94" },
      { id: 99, home: validWinner(findMatch(r16, 91)), away: validWinner(findMatch(r16, 92)), label: "W91 v W92" },
      { id: 100, home: validWinner(findMatch(r16, 95)), away: validWinner(findMatch(r16, 96)), label: "W95 v W96" },
    ],
    [r16, state.winners],
  );

  const sf = useMemo<BracketMatch[]>(
    () => [
      { id: 101, home: validWinner(findMatch(qf, 97)), away: validWinner(findMatch(qf, 98)), label: "W97 v W98" },
      { id: 102, home: validWinner(findMatch(qf, 99)), away: validWinner(findMatch(qf, 100)), label: "W99 v W100" },
    ],
    [qf, state.winners],
  );

  const loserOf = (match: BracketMatch | undefined) => {
    if (!match?.home || !match.away) return undefined;
    const selected = validWinner(match);
    if (!selected) return undefined;
    return selected === match.home ? match.away : match.home;
  };

  const finalMatch = useMemo<BracketMatch>(
    () => ({
      id: 104,
      home: validWinner(findMatch(sf, 101)),
      away: validWinner(findMatch(sf, 102)),
      label: "Final",
    }),
    [sf, state.winners],
  );
  const thirdPlaceMatch = useMemo<BracketMatch>(
    () => ({
      id: 103,
      home: loserOf(findMatch(sf, 101)),
      away: loserOf(findMatch(sf, 102)),
      label: "Third place",
    }),
    [sf, state.winners],
  );

  const champion = validWinner(finalMatch);
  const thirdPlace = validWinner(thirdPlaceMatch);

  useEffect(() => {
    if (champion && champion !== lastChampion.current) {
      lastChampion.current = champion;
      confetti({ particleCount: 150, spread: 90, origin: { y: 0.55 } });
    } else if (!champion) {
      lastChampion.current = undefined;
    }
  }, [champion]);

  const setGroupPosition = (group: string, position: number, name: string) => {
    setState((current) => {
      const members = teamsInGroup(group).map((item) => item.name);
      const existing =
        current.groupOrder[group]?.length === 4
          ? [...current.groupOrder[group]]
          : [...members];
      const from = existing.indexOf(name);
      if (from < 0) return current;
      [existing[from], existing[position]] = [existing[position], existing[from]];
      return {
        ...current,
        groupOrder: { ...current.groupOrder, [group]: existing },
        winners: {},
      };
    });
  };

  const moveThird = (index: number, direction: -1 | 1) => {
    setState((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.thirdOrder.length) return current;
      const thirdOrder = [...current.thirdOrder];
      [thirdOrder[index], thirdOrder[target]] = [
        thirdOrder[target],
        thirdOrder[index],
      ];
      return { ...current, thirdOrder, winners: {} };
    });
  };

  const pickWinner = (match: BracketMatch, name: string) => {
    if (!match.home || !match.away) return;
    setState((current) => {
      const winners = { ...current.winners, [String(match.id)]: name };
      for (const downstream of collectDownstream(match.id)) {
        delete winners[String(downstream)];
      }
      return { ...current, winners };
    });
  };

  const syncCurrentStandings = () => {
    if (
      Object.keys(state.winners).length > 0 &&
      !window.confirm(
        "Syncing current standings will clear all knockout picks. Continue?",
      )
    ) {
      return;
    }
    setState(standingsSeed);
  };

  const reset = () => {
    if (window.confirm("Clear the entire prediction?")) setState(emptyState);
  };

  const selectedGroupPositions = GROUPS.reduce(
    (total, group) =>
      total + Math.min(state.groupOrder[group]?.filter(Boolean).length ?? 0, 3),
    0,
  );
  const knockoutPickCount = Object.keys(state.winners).filter((key) => {
    const id = Number(key);
    return id >= 73 && id <= 104;
  }).length;
  const predictionComplete = Boolean(champion && thirdPlace);
  const progress = Math.min(
    100,
    Math.round(
      ((selectedGroupPositions + state.thirdOrder.length + knockoutPickCount) /
        80) *
        100,
    ),
  );

  const rounds: Array<{
    key: RoundKey;
    label: string;
    short: string;
    matches: BracketMatch[];
  }> = [
    { key: "R32", label: "Round of 32", short: "R32", matches: r32 },
    { key: "R16", label: "Round of 16", short: "R16", matches: r16 },
    { key: "QF", label: "Quarter-finals", short: "QF", matches: qf },
    { key: "SF", label: "Semi-finals", short: "SF", matches: sf },
    {
      key: "Final",
      label: "Finals",
      short: "F",
      matches: [thirdPlaceMatch, finalMatch],
    },
  ];
  const activeRound = rounds.find((item) => item.key === round) ?? rounds[0];
  const activeRoundIndex = rounds.findIndex((item) => item.key === activeRound.key);
  const activeRoundComplete =
    activeRound.matches.length > 0 &&
    activeRound.matches.every((match) => Boolean(validWinner(match)));

  const downloadPrediction = async () => {
    if (!predictionComplete || downloading) return;
    setDownloading(true);
    setDownloadError(null);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1200;
      canvas.height = 1600;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas is not available.");
      const gradient = context.createLinearGradient(0, 0, 1200, 1600);
      gradient.addColorStop(0, "#07111f");
      gradient.addColorStop(1, "#10243b");
      context.fillStyle = gradient;
      context.fillRect(0, 0, 1200, 1600);
      context.textAlign = "center";
      context.fillStyle = "#f4c542";
      context.font = "800 46px Arial";
      context.fillText("WORLD CUP 2026 PREDICTION", 600, 90);
      context.fillStyle = "#ffffff";
      context.font = "900 74px Arial";
      context.fillText(`${flag(champion)} ${champion}`, 600, 205);
      context.font = "600 24px Arial";
      context.fillText("Predicted Champion", 600, 250);
      context.fillText(
        `Third place: ${flag(thirdPlace)} ${thirdPlace}`,
        600,
        300,
      );
      context.textAlign = "left";
      context.font = "800 28px Arial";
      context.fillText("KNOCKOUT WINNERS", 70, 390);
      const allMatches = [...r32, ...r16, ...qf, ...sf, thirdPlaceMatch, finalMatch];
      allMatches.forEach((match, index) => {
        const column = index >= 16 ? 1 : 0;
        const row = column === 0 ? index : index - 16;
        const x = 70 + column * 560;
        const y = 445 + row * 48;
        const winner = validWinner(match);
        context.fillStyle = winner ? "#ffffff" : "#64748b";
        context.font = "600 18px Arial";
        context.fillText(
          `M${match.id}: ${winner ? `${flag(winner)} ${winner}` : "—"}`,
          x,
          y,
        );
      });
      context.fillStyle = "#94a3b8";
      context.font = "400 18px Arial";
      context.fillText("Generated with Fan26", 70, 1530);
      await downloadCanvas(
        canvas,
        `world-cup-2026-prediction-${team(champion)?.slug ?? "champion"}.png`,
      );
    } catch (error) {
      setDownloadError(
        error instanceof Error ? error.message : "The PNG could not be generated.",
      );
    } finally {
      setDownloading(false);
    }
  };

  const MatchCard = ({ match }: { match: BracketMatch }) => {
    const selected = validWinner(match);
    const locked = !match.home || !match.away;
    const nextMatches = NEXT_MATCHES[match.id] ?? [];
    return (
      <div
        className={`rounded-2xl border p-4 ${
          locked
            ? "border-border bg-secondary/20 opacity-70"
            : "border-border card-elevated"
        }`}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
              Match {match.id}
            </div>
            <div className="mt-0.5 text-[10px] text-muted-foreground">
              {match.label}
            </div>
          </div>
          {selected && (
            <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-[9px] font-bold text-emerald-500">
              SELECTED
            </span>
          )}
        </div>
        <div className="space-y-2">
          {[match.home, match.away].map((name, index) => (
            <button
              key={`${match.id}-${index}`}
              type="button"
              disabled={!name}
              onClick={() => name && pickWinner(match, name)}
              className={`flex min-h-12 w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all ${
                selected === name
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-secondary/45 active:scale-[0.99]"
              } disabled:cursor-not-allowed`}
            >
              <span className="text-xl">{flag(name)}</span>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                {name || "Waiting for previous match"}
              </span>
              {selected === name ? (
                <CheckCircle2 className="h-5 w-5 shrink-0" />
              ) : (
                <span className="h-5 w-5 shrink-0 rounded-full border border-current opacity-40" />
              )}
            </button>
          ))}
        </div>
        {!locked && nextMatches.length > 0 && (
          <div className="mt-3 flex items-center gap-1 text-[10px] text-muted-foreground">
            Winner advances to Match {nextMatches.join(" / ")}
            <ChevronRight className="h-3 w-3" />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="container py-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Prediction</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Build your World Cup 2026 bracket
          </p>
        </div>
        <div className="rounded-full border border-border bg-secondary/40 px-3 py-1.5 text-xs font-bold text-primary">
          {progress}%
        </div>
      </div>

      <div className="sticky top-16 z-30 mb-5 grid grid-cols-3 rounded-xl border border-border bg-background/95 p-1 backdrop-blur">
        {([
          ["groups", "Groups"],
          ["bracket", "Bracket"],
          ["summary", "My Prediction"],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setView(key)}
            className={`rounded-lg px-2 py-2.5 text-[11px] font-semibold transition-all ${
              view === key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {view === "groups" && (
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">Group Positions</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Current standings are selected. Tap 1, 2 or 3 to change them.
              </p>
            </div>
            <button
              type="button"
              onClick={syncCurrentStandings}
              disabled={standingsLoading || standingsRefreshing}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-secondary/40 disabled:opacity-50"
              aria-label="Sync current standings"
            >
              <RefreshCw
                className={`h-4 w-4 ${standingsRefreshing ? "animate-spin" : ""}`}
              />
            </button>
          </div>

          <div className="space-y-3">
            {GROUPS.map((group) => {
              const members = teamsInGroup(group);
              const order = state.groupOrder[group] ?? [];
              const groupState = tournament.groups.find(
                (item) => item.group === group,
              );
              return (
                <div
                  key={group}
                  className="rounded-2xl border border-border p-4 card-elevated"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div className="font-bold">Group {group}</div>
                    <span
                      className={`rounded-full px-2 py-1 text-[9px] font-bold uppercase ${
                        groupState?.complete
                          ? "bg-emerald-500/15 text-emerald-500"
                          : "bg-amber-500/15 text-amber-500"
                      }`}
                    >
                      {groupState?.complete ? "Final" : "Provisional"}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {members.map((member) => {
                      const currentPosition = order.indexOf(member.name);
                      return (
                        <div
                          key={member.slug}
                          className="flex items-center gap-2 rounded-lg bg-secondary/25 px-2.5 py-2"
                        >
                          <span className="text-lg">{member.flag}</span>
                          <span className="min-w-0 flex-1 truncate text-xs font-semibold">
                            {member.name}
                          </span>
                          {([0, 1, 2] as const).map((position) => (
                            <button
                              key={position}
                              type="button"
                              onClick={() =>
                                setGroupPosition(group, position, member.name)
                              }
                              className={`h-8 w-8 rounded-full border text-xs font-bold ${
                                currentPosition === position
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-border bg-background/60"
                              }`}
                            >
                              {position + 1}
                            </button>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div>
            <h2 className="text-xl font-bold">Third-place Ranking</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              The first eight qualify for the Round of 32.
            </p>
            <div className="mt-3 overflow-hidden rounded-2xl border border-border card-elevated">
              {state.thirdOrder.map((name, index) => (
                <div
                  key={name}
                  className={`grid grid-cols-[28px_minmax(0,1fr)_34px_34px_34px] items-center gap-2 border-b border-border/70 px-3 py-3 ${
                    index === 7 ? "border-b-2 border-b-primary/50" : ""
                  }`}
                >
                  <span className="font-mono text-xs text-muted-foreground">
                    {index + 1}
                  </span>
                  <span className="truncate text-xs font-semibold">
                    {flag(name)} {name}
                  </span>
                  <button
                    type="button"
                    onClick={() => moveThird(index, -1)}
                    disabled={index === 0}
                    className="rounded-md p-1 disabled:opacity-20"
                    aria-label={`Move ${name} up`}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveThird(index, 1)}
                    disabled={index === state.thirdOrder.length - 1}
                    className="rounded-md p-1 disabled:opacity-20"
                    aria-label={`Move ${name} down`}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <span
                    className={`rounded-full py-1 text-center text-[9px] font-black ${
                      index < 8
                        ? "bg-emerald-500/15 text-emerald-500"
                        : "bg-red-500/15 text-red-500"
                    }`}
                  >
                    {index < 8 ? "Q" : "E"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {view === "bracket" && (
        <div className="space-y-4">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {rounds.map((item) => {
              const completed =
                item.matches.length > 0 &&
                item.matches.every((match) => Boolean(validWinner(match)));
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setRound(item.key)}
                  className={`shrink-0 rounded-full border px-4 py-2 text-[11px] font-bold ${
                    round === item.key
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-secondary/35 text-muted-foreground"
                  }`}
                >
                  {item.short}
                  {completed && " ✓"}
                </button>
              );
            })}
          </div>

          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">{activeRound.label}</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {activeRound.matches.length} match
                {activeRound.matches.length === 1 ? "" : "es"}
              </p>
            </div>
            <span className="text-xs font-semibold text-primary">
              {activeRound.matches.filter((match) => Boolean(validWinner(match))).length}/
              {activeRound.matches.length}
            </span>
          </div>

          {!thirdRankingComplete ? (
            <div className="flex items-center gap-2 rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
              <LockKeyhole className="h-4 w-4" /> Complete the group and
              third-place rankings first.
            </div>
          ) : !fullAnnexReady || !annexMapping ? (
            <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm">
              {annex.loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LockKeyhole className="h-4 w-4" />
              )}
              Loading the official third-place allocation…
            </div>
          ) : (
            <div className="space-y-3">
              {activeRound.matches.map((match) => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>
          )}

          {activeRoundComplete && activeRoundIndex < rounds.length - 1 && (
            <button
              type="button"
              onClick={() => setRound(rounds[activeRoundIndex + 1].key)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground"
            >
              Continue to {rounds[activeRoundIndex + 1].label}
              <ChevronRight className="h-4 w-4" />
            </button>
          )}

          <div className="sticky bottom-3 z-20 grid grid-cols-5 rounded-2xl border border-border bg-background/95 p-1.5 shadow-xl backdrop-blur">
            {rounds.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setRound(item.key)}
                className={`rounded-xl px-1 py-2 text-[9px] font-bold ${
                  round === item.key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground"
                }`}
              >
                {item.short}
              </button>
            ))}
          </div>
        </div>
      )}

      {view === "summary" && (
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-primary/10 p-6 text-center">
            <Trophy className="mx-auto h-12 w-12 text-primary" />
            <div className="mt-3 text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
              Predicted Champion
            </div>
            <div className="mt-3 text-3xl font-black">
              {champion ? `${flag(champion)} ${champion}` : "Not selected yet"}
            </div>
            {thirdPlace && (
              <div className="mt-2 text-sm text-muted-foreground">
                Third place: {flag(thirdPlace)} {thirdPlace}
              </div>
            )}
          </div>

          <div className="overflow-hidden rounded-2xl border border-border card-elevated">
            {[
              ["Groups", `${selectedGroupPositions}/36`],
              ["Third-place ranking", `${state.thirdOrder.length}/12`],
              ["Round of 32", `${r32.filter((match) => Boolean(validWinner(match))).length}/16`],
              ["Round of 16", `${r16.filter((match) => Boolean(validWinner(match))).length}/8`],
              ["Quarter-finals", `${qf.filter((match) => Boolean(validWinner(match))).length}/4`],
              ["Semi-finals", `${sf.filter((match) => Boolean(validWinner(match))).length}/2`],
              ["Third-place match", `${validWinner(thirdPlaceMatch) ? 1 : 0}/1`],
              ["Final", `${validWinner(finalMatch) ? 1 : 0}/1`],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex items-center justify-between border-b border-border/70 px-4 py-3 text-sm"
              >
                <span className="text-muted-foreground">{label}</span>
                <span className="font-bold text-primary">{value}</span>
              </div>
            ))}
          </div>

          <button
            type="button"
            disabled={!predictionComplete || downloading}
            onClick={downloadPrediction}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 font-semibold text-primary-foreground disabled:opacity-45"
          >
            {downloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {downloading ? "Creating PNG…" : "Download Prediction PNG"}
          </button>
          <button
            type="button"
            onClick={() => setView("bracket")}
            className="w-full rounded-xl border border-border px-5 py-3 font-semibold"
          >
            Edit Prediction
          </button>
          <button
            type="button"
            onClick={reset}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-border px-5 py-3 text-sm font-semibold text-muted-foreground"
          >
            <RotateCcw className="h-4 w-4" /> Reset Prediction
          </button>
          {downloadError && (
            <p className="text-center text-xs text-red-500">{downloadError}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default PredictionMobile;
