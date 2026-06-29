import { useEffect, useMemo, useRef, useState } from "react";
import confetti from "canvas-confetti";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
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

type Pos = "first" | "second" | "third";

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

type BracketColumnProps = {
  title: string;
  matches: BracketMatch[];
  startRows: number[];
  finalColumn?: boolean;
};

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

const downloadCanvas = (canvas: HTMLCanvasElement, filename: string) =>
  new Promise<void>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
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
      },
      "image/png",
      1,
    );
  });

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

const Prediction = () => {
  const [state, setState] = useState<PredictionState>(emptyState);
  const [hydrated, setHydrated] = useState(false);
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
      // Ignore malformed browser data and seed from current standings.
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
      confetti({ particleCount: 180, spread: 95, origin: { y: 0.55 } });
    } else if (!champion) {
      lastChampion.current = undefined;
    }
  }, [champion]);

  const setGroupPosition = (group: string, position: number, name: string) => {
    setState((current) => {
      const members = teamsInGroup(group).map((item) => item.name);
      const existing = current.groupOrder[group]?.length === 4
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
    if (name !== match.home && name !== match.away) return;

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
  const totalProgressSteps = 36 + 12 + 32;
  const completedProgressSteps =
    selectedGroupPositions + state.thirdOrder.length + knockoutPickCount;
  const progress = Math.min(
    100,
    Math.round((completedProgressSteps / totalProgressSteps) * 100),
  );

  const downloadPrediction = async () => {
    if (!predictionComplete || downloading) return;

    setDownloading(true);
    setDownloadError(null);

    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1800;
      canvas.height = 2400;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas is not available.");

      const gradient = context.createLinearGradient(0, 0, 1800, 2400);
      gradient.addColorStop(0, "#07111f");
      gradient.addColorStop(1, "#10243b");
      context.fillStyle = gradient;
      context.fillRect(0, 0, canvas.width, canvas.height);

      context.textAlign = "center";
      context.fillStyle = "#ffffff";
      context.font = "800 68px Arial, sans-serif";
      context.fillText("WORLD CUP 2026 PREDICTION", 900, 110);
      context.fillStyle = "#f4c542";
      context.font = "900 90px Arial, sans-serif";
      context.fillText(`${flag(champion)} ${champion}`, 900, 245);
      context.fillStyle = "#ffffff";
      context.font = "600 30px Arial, sans-serif";
      context.fillText("Predicted Champion", 900, 295);
      context.fillText(
        `Third place: ${flag(thirdPlace)} ${thirdPlace}`,
        900,
        350,
      );

      context.textAlign = "left";
      context.font = "800 34px Arial, sans-serif";
      context.fillText("GROUP STAGE PICKS", 90, 455);

      GROUPS.forEach((group, index) => {
        const column = index % 4;
        const row = Math.floor(index / 4);
        const x = 90 + column * 415;
        const y = 510 + row * 300;
        const order = state.groupOrder[group] ?? [];

        context.fillStyle = "rgba(19, 35, 51, 0.96)";
        context.fillRect(x, y, 380, 260);
        context.fillStyle = "#f4c542";
        context.font = "800 25px Arial, sans-serif";
        context.fillText(`GROUP ${group}`, x + 22, y + 38);

        order.forEach((name, position) => {
          context.fillStyle = position < 2 ? "#3ddc84" : "#ffffff";
          context.font = "600 20px Arial, sans-serif";
          context.fillText(
            `${position + 1}. ${flag(name)} ${name}`,
            x + 22,
            y + 82 + position * 40,
          );
        });
      });

      context.fillStyle = "#ffffff";
      context.font = "800 34px Arial, sans-serif";
      context.fillText("KNOCKOUT PICKS", 90, 1460);

      const knockoutRounds = [
        ["ROUND OF 32", r32],
        ["ROUND OF 16", r16],
        ["QUARTER-FINALS", qf],
        ["SEMI-FINALS", sf],
      ] as const;

      knockoutRounds.forEach(([title, matches], roundIndex) => {
        const x = 90 + roundIndex * 415;
        context.fillStyle = "#f4c542";
        context.font = "800 22px Arial, sans-serif";
        context.fillText(title, x, 1510);

        matches.slice(0, 8).forEach((match, index) => {
          const selected = validWinner(match);
          context.fillStyle = "#ffffff";
          context.font = "600 17px Arial, sans-serif";
          context.fillText(
            `M${match.id}: ${selected ? `${flag(selected)} ${selected}` : "—"}`,
            x,
            1550 + index * 45,
          );
        });
      });

      context.fillStyle = "#f4c542";
      context.font = "800 22px Arial, sans-serif";
      context.fillText("FINAL", 90, 2050);
      context.fillStyle = "#ffffff";
      context.font = "600 20px Arial, sans-serif";
      context.fillText(
        `${flag(finalMatch.home)} ${finalMatch.home ?? "TBD"} v ${flag(finalMatch.away)} ${finalMatch.away ?? "TBD"}`,
        90,
        2095,
      );

      context.fillStyle = "#94a3b8";
      context.font = "400 20px Arial, sans-serif";
      context.fillText("Generated with Fan26", 90, 2320);

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

  const MatchCard = ({
    match,
    connector = true,
  }: {
    match: BracketMatch;
    connector?: boolean;
  }) => {
    const selected = validWinner(match);
    const locked = !match.home || !match.away;

    return (
      <div
        className={`relative flex min-h-[76px] flex-col justify-center rounded-xl border p-2.5 shadow-sm ${
          locked
            ? "border-border bg-secondary/20 opacity-65"
            : "border-border card-elevated"
        } ${connector ? "after:absolute after:-right-6 after:top-1/2 after:w-6 after:border-t after:border-border" : ""}`}
      >
        <div className="mb-1 flex items-center justify-between gap-2 text-[9px] uppercase tracking-wider text-muted-foreground">
          <span>Match {match.id}</span>
          <span className="truncate">{match.label}</span>
        </div>

        <div className="space-y-1">
          {[match.home, match.away].map((name, index) => (
            <button
              key={`${match.id}-${index}`}
              type="button"
              disabled={!name}
              onClick={() => name && pickWinner(match, name)}
              className={`flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-[11px] transition-all ${
                selected === name
                  ? "bg-primary font-bold text-primary-foreground"
                  : "bg-secondary/55 hover:bg-secondary"
              } disabled:cursor-not-allowed`}
            >
              <span className="text-sm">{flag(name)}</span>
              <span className="min-w-0 flex-1 truncate">
                {name || "Waiting for previous match"}
              </span>
              {selected === name && <CheckCircle2 className="h-3.5 w-3.5" />}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const BracketColumn = ({
    title,
    matches,
    startRows,
    finalColumn = false,
  }: BracketColumnProps) => (
    <div className="w-[230px] shrink-0 snap-start">
      <div className="sticky top-0 z-10 mb-3 rounded-full border border-border bg-background/95 px-3 py-2 text-center text-[10px] font-bold uppercase tracking-[0.18em] text-primary backdrop-blur">
        {title}
      </div>
      <div
        className="grid gap-y-1"
        style={{ gridTemplateRows: "repeat(32, 36px)" }}
      >
        {matches.map((match, index) => (
          <div
            key={match.id}
            style={{ gridRow: `${startRows[index]} / span 2` }}
          >
            <MatchCard match={match} connector={!finalColumn} />
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="container space-y-12 py-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold md:text-5xl">Your Prediction</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Current group positions are selected automatically. Adjust any group,
            rank the twelve third-place teams, then pick each winner through the
            bracket.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={syncCurrentStandings}
            disabled={standingsLoading || standingsRefreshing}
            className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors hover:bg-secondary disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${standingsRefreshing ? "animate-spin" : ""}`}
            />
            Sync standings
          </button>
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors hover:bg-secondary"
          >
            <RotateCcw className="h-4 w-4" /> Clear
          </button>
        </div>
      </div>

      <section className="overflow-hidden rounded-3xl border border-primary/25 card-elevated">
        <div className="bg-gradient-to-br from-primary/15 via-secondary/30 to-background p-5 sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-primary">
                {predictionComplete ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <LockKeyhole className="h-4 w-4" />
                )}
                Bracket prediction
              </div>
              <h2 className="mt-2 text-2xl font-bold md:text-3xl">
                {predictionComplete
                  ? "Your complete bracket is ready"
                  : "Complete the bracket to unlock your PNG"}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Your selections are saved in this browser. Group positions are
                seeded from the current live and stored results.
              </p>
            </div>

            <button
              type="button"
              disabled={!predictionComplete || downloading}
              onClick={downloadPrediction}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-45"
            >
              {downloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {downloading ? "Creating PNG…" : "Download prediction PNG"}
            </button>
          </div>

          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>Prediction progress</span>
              <span className="font-semibold text-foreground">{progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl border border-border bg-background/40 p-3">
                <div className="text-lg font-black">{selectedGroupPositions}/36</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Group positions
                </div>
              </div>
              <div className="rounded-xl border border-border bg-background/40 p-3">
                <div className="text-lg font-black">{state.thirdOrder.length}/12</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Third-place rank
                </div>
              </div>
              <div className="rounded-xl border border-border bg-background/40 p-3">
                <div className="text-lg font-black">{knockoutPickCount}/32</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Knockout picks
                </div>
              </div>
            </div>
            {downloadError && (
              <p className="mt-3 text-xs text-red-500">{downloadError}</p>
            )}
          </div>
        </div>
      </section>

      <section>
        <div className="mb-6 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-2xl font-bold md:text-3xl">Group Stage</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              The current 1st, 2nd and 3rd teams are already selected. Tap a
              number to change your prediction; 4th place is inferred automatically.
            </p>
          </div>
          <div className="text-xs text-muted-foreground">
            Final groups: {tournament.groups.filter((group) => group.complete).length}/12
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {GROUPS.map((group) => {
            const members = teamsInGroup(group);
            const order = state.groupOrder[group] ?? [];
            const groupState = tournament.groups.find((item) => item.group === group);

            return (
              <div
                key={group}
                className="rounded-2xl border border-border p-5 card-elevated"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <span className="text-xs uppercase tracking-widest text-muted-foreground">
                      Group
                    </span>
                    <span className="ml-2 font-display text-2xl font-bold gradient-text">
                      {group}
                    </span>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider ${
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
                        className="flex items-center gap-1.5 sm:gap-2"
                      >
                        <span className="text-lg sm:text-xl">{member.flag}</span>
                        <span className="min-w-0 flex-1 truncate text-xs font-medium sm:text-sm">
                          {member.name}
                        </span>

                        {([0, 1, 2] as const).map((position) => {
                          const active = currentPosition === position;
                          return (
                            <button
                              key={position}
                              type="button"
                              onClick={() =>
                                setGroupPosition(group, position, member.name)
                              }
                              className={`h-7 w-7 shrink-0 rounded-full border text-[10px] font-bold transition-all sm:h-8 sm:w-8 sm:text-xs ${
                                active
                                  ? "border-primary bg-primary text-primary-foreground glow"
                                  : "border-border bg-secondary/40 hover:border-primary/50"
                              }`}
                              title={`Place ${member.name} ${position + 1}${
                                position === 0 ? "st" : position === 1 ? "nd" : "rd"
                              }`}
                            >
                              {position + 1}
                            </button>
                          );
                        })}

                        {currentPosition === 3 && (
                          <span className="w-8 text-center text-[9px] font-bold uppercase text-muted-foreground">
                            4th
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold md:text-3xl">
          Rank the Third-place Teams
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          All twelve third-place teams are pre-ranked from the current standings.
          The top eight are marked Q; the bottom four are marked E.
        </p>

        {!groupStageComplete ? (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
            <LockKeyhole className="h-4 w-4" /> Group positions are still loading.
          </div>
        ) : (
          <div className="mt-5 overflow-hidden rounded-2xl border border-border card-elevated">
            {state.thirdOrder.map((name, index) => (
              <div
                key={name}
                className={`grid grid-cols-[36px_minmax(0,1fr)_30px_30px_38px] items-center gap-2 border-b border-border/70 px-4 py-3 ${
                  index === 7 ? "border-b-2 border-b-primary/50" : ""
                }`}
              >
                <span className="font-mono text-sm text-muted-foreground">
                  {index + 1}
                </span>
                <span className="truncate text-sm font-semibold">
                  {flag(name)} {name}{" "}
                  <small className="text-muted-foreground">
                    ({teamGroup(name)})
                  </small>
                </span>
                <button
                  type="button"
                  onClick={() => moveThird(index, -1)}
                  disabled={index === 0}
                  className="rounded-md p-1 hover:bg-secondary disabled:opacity-20"
                  aria-label={`Move ${name} up`}
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => moveThird(index, 1)}
                  disabled={index === state.thirdOrder.length - 1}
                  className="rounded-md p-1 hover:bg-secondary disabled:opacity-20"
                  aria-label={`Move ${name} down`}
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
                <span
                  className={`rounded-full px-2 py-1 text-center text-[10px] font-black ${
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
        )}
      </section>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold md:text-3xl">Knockout Bracket</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Pick a team in each match to advance it automatically through the
              bracket.
            </p>
          </div>
          <div className="text-xs text-muted-foreground sm:hidden">
            Swipe horizontally to view every round →
          </div>
        </div>

        {!thirdRankingComplete ? (
          <div className="mt-5 flex items-center gap-2 rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
            <LockKeyhole className="h-4 w-4" /> Complete the group and third-place
            rankings first.
          </div>
        ) : !fullAnnexReady || !annexMapping ? (
          <div className="mt-5 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm">
            {annex.loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LockKeyhole className="h-4 w-4" />
            )}
            {annex.loading
              ? "Loading the official third-place allocation matrix…"
              : `The third-place allocation is unavailable: ${
                  annex.error ?? "combination not found"
                }`}
          </div>
        ) : (
          <div className="mt-5 overflow-x-auto rounded-3xl border border-border bg-secondary/10 p-4 sm:p-6">
            <div className="flex min-w-max snap-x snap-mandatory gap-12 pr-8">
              <BracketColumn
                title="Round of 32"
                matches={r32}
                startRows={Array.from({ length: 16 }, (_, index) => index * 2 + 1)}
              />
              <BracketColumn
                title="Round of 16"
                matches={r16}
                startRows={Array.from({ length: 8 }, (_, index) => index * 4 + 2)}
              />
              <BracketColumn
                title="Quarter-finals"
                matches={qf}
                startRows={Array.from({ length: 4 }, (_, index) => index * 8 + 4)}
              />
              <BracketColumn
                title="Semi-finals"
                matches={sf}
                startRows={[8, 24]}
              />
              <BracketColumn
                title="Final"
                matches={[finalMatch]}
                startRows={[16]}
                finalColumn
              />
            </div>
          </div>
        )}

        {thirdRankingComplete && annexMapping && (
          <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.6fr)]">
            <div className="rounded-2xl border border-border p-4 card-elevated">
              <div className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Third-place match
              </div>
              <MatchCard match={thirdPlaceMatch} connector={false} />
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-primary/10 p-5">
              <Trophy className="absolute right-4 top-4 h-20 w-20 text-primary opacity-10" />
              <div className="relative">
                <div className="text-xs font-bold uppercase tracking-[0.22em] text-primary">
                  Predicted champion
                </div>
                <div className="mt-3 text-3xl font-black">
                  {champion ? `${flag(champion)} ${champion}` : "Complete the final"}
                </div>
                {thirdPlace && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    Third place: {flag(thirdPlace)} {thirdPlace}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default Prediction;
