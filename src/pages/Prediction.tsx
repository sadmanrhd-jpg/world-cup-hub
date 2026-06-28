import { useEffect, useMemo, useRef, useState } from "react";
import confetti from "canvas-confetti";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Download,
  Loader2,
  LockKeyhole,
  RotateCcw,
  Trophy,
} from "lucide-react";
import { GROUPS, TEAMS, teamsInGroup } from "@/data/wc26";
import { useAnnexC } from "@/hooks/useAnnexC";

const STORAGE_KEY = "wc26-prediction-v4";
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

const emptyState: PredictionState = {
  groupOrder: {},
  thirdOrder: [],
  winners: {},
};

const team = (name?: string) => TEAMS.find((item) => item.name === name);
const teamGroup = (name?: string) => team(name)?.group;
const flag = (name?: string) => team(name)?.flag ?? "";

const uniqueComplete = (values: string[] | undefined, expected: number) =>
  Boolean(values && values.length === expected && values.every(Boolean) && new Set(values).size === expected);

const positionLabel = (index: number) => ["1st", "2nd", "3rd", "4th"][index];

const downloadCanvas = (canvas: HTMLCanvasElement, filename: string) =>
  new Promise<void>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error("Could not create the PNG."));
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

const Prediction = () => {
  const [state, setState] = useState<PredictionState>(emptyState);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const lastChampion = useRef<string | undefined>();
  const annex = useAnnexC();

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setState({ ...emptyState, ...JSON.parse(stored) });
    } catch {
      // Ignore old or malformed local data.
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const groupStageComplete = GROUPS.every((group) => uniqueComplete(state.groupOrder[group], 4));
  const thirdTeams = useMemo(
    () => groupStageComplete ? GROUPS.map((group) => state.groupOrder[group][2]) : [],
    [groupStageComplete, state.groupOrder],
  );
  const thirdSignature = thirdTeams.join("|");

  useEffect(() => {
    if (!groupStageComplete) return;
    setState((current) => {
      const allowed = new Set(thirdTeams);
      const retained = current.thirdOrder.filter((name) => allowed.has(name));
      const missing = thirdTeams.filter((name) => !retained.includes(name));
      const next = [...retained, ...missing];
      if (next.join("|") === current.thirdOrder.join("|")) return current;
      return { ...current, thirdOrder: next, winners: {} };
    });
  }, [groupStageComplete, thirdSignature]);

  const thirdRankingComplete = groupStageComplete && uniqueComplete(state.thirdOrder, 12);
  const bestThirds = thirdRankingComplete ? state.thirdOrder.slice(0, 8) : [];
  const annexKey = bestThirds.map((name) => teamGroup(name)).filter(Boolean).sort().join("");
  const annexMapping = annexKey ? annex.options[annexKey] : undefined;
  const fullAnnexReady = annex.exactCount >= 490;

  const groupAt = (group: string, position: number) => state.groupOrder[group]?.[position - 1];
  const thirdByGroup = (group: string) => state.thirdOrder.find((name) => teamGroup(name) === group);

  const r32 = useMemo<BracketMatch[]>(() => {
    if (!thirdRankingComplete || !annexMapping || annexMapping.length !== 8) return [];
    const assigned = Object.fromEntries(
      THIRD_WINNER_ORDER.map((winnerGroup, index) => [winnerGroup, thirdByGroup(annexMapping[index])]),
    );

    return [
      { id: 73, home: groupAt("A", 2), away: groupAt("B", 2), label: "2A v 2B" },
      { id: 74, home: groupAt("E", 1), away: assigned.E, label: "1E v best third" },
      { id: 75, home: groupAt("F", 1), away: groupAt("C", 2), label: "1F v 2C" },
      { id: 76, home: groupAt("C", 1), away: groupAt("F", 2), label: "1C v 2F" },
      { id: 77, home: groupAt("I", 1), away: assigned.I, label: "1I v best third" },
      { id: 78, home: groupAt("E", 2), away: groupAt("I", 2), label: "2E v 2I" },
      { id: 79, home: groupAt("A", 1), away: assigned.A, label: "1A v best third" },
      { id: 80, home: groupAt("L", 1), away: assigned.L, label: "1L v best third" },
      { id: 81, home: groupAt("D", 1), away: assigned.D, label: "1D v best third" },
      { id: 82, home: groupAt("G", 1), away: assigned.G, label: "1G v best third" },
      { id: 83, home: groupAt("K", 2), away: groupAt("L", 2), label: "2K v 2L" },
      { id: 84, home: groupAt("H", 1), away: groupAt("J", 2), label: "1H v 2J" },
      { id: 85, home: groupAt("B", 1), away: assigned.B, label: "1B v best third" },
      { id: 86, home: groupAt("J", 1), away: groupAt("H", 2), label: "1J v 2H" },
      { id: 87, home: groupAt("K", 1), away: assigned.K, label: "1K v best third" },
      { id: 88, home: groupAt("D", 2), away: groupAt("G", 2), label: "2D v 2G" },
    ];
  }, [thirdRankingComplete, annexMapping, state.groupOrder, state.thirdOrder]);

  const winner = (id: number) => state.winners[String(id)];
  const winnerMatch = (id: number) => winner(id) || undefined;

  const r16 = useMemo<BracketMatch[]>(() => [
    { id: 89, home: winnerMatch(74), away: winnerMatch(77), label: "W74 v W77" },
    { id: 90, home: winnerMatch(73), away: winnerMatch(75), label: "W73 v W75" },
    { id: 91, home: winnerMatch(76), away: winnerMatch(78), label: "W76 v W78" },
    { id: 92, home: winnerMatch(79), away: winnerMatch(80), label: "W79 v W80" },
    { id: 93, home: winnerMatch(83), away: winnerMatch(84), label: "W83 v W84" },
    { id: 94, home: winnerMatch(81), away: winnerMatch(82), label: "W81 v W82" },
    { id: 95, home: winnerMatch(86), away: winnerMatch(88), label: "W86 v W88" },
    { id: 96, home: winnerMatch(85), away: winnerMatch(87), label: "W85 v W87" },
  ], [state.winners, r32]);

  const qf = useMemo<BracketMatch[]>(() => [
    { id: 97, home: winner(89), away: winner(90), label: "W89 v W90" },
    { id: 98, home: winner(93), away: winner(94), label: "W93 v W94" },
    { id: 99, home: winner(91), away: winner(92), label: "W91 v W92" },
    { id: 100, home: winner(95), away: winner(96), label: "W95 v W96" },
  ], [state.winners]);

  const sf = useMemo<BracketMatch[]>(() => [
    { id: 101, home: winner(97), away: winner(98), label: "W97 v W98" },
    { id: 102, home: winner(99), away: winner(100), label: "W99 v W100" },
  ], [state.winners]);

  const loserOf = (match: BracketMatch) => {
    const selected = winner(match.id);
    if (!selected || !match.home || !match.away) return undefined;
    return selected === match.home ? match.away : match.home;
  };

  const medalMatches = useMemo<BracketMatch[]>(() => [
    { id: 103, home: loserOf(sf[0]), away: loserOf(sf[1]), label: "Third-place match" },
    { id: 104, home: winner(101), away: winner(102), label: "Final" },
  ], [state.winners, sf]);

  const champion = winner(104);
  const thirdPlace = winner(103);

  useEffect(() => {
    if (champion && champion !== lastChampion.current) {
      lastChampion.current = champion;
      confetti({ particleCount: 180, spread: 95, origin: { y: 0.55 } });
    } else if (!champion) {
      lastChampion.current = undefined;
    }
  }, [champion]);

  const setGroupPosition = (group: string, index: number, name: string) => {
    setState((current) => {
      const order = [...(current.groupOrder[group] ?? ["", "", "", ""])];
      while (order.length < 4) order.push("");
      if (!name) order[index] = "";
      else {
        const existing = order.indexOf(name);
        if (existing >= 0) [order[existing], order[index]] = [order[index], order[existing]];
        else order[index] = name;
      }
      return {
        ...current,
        groupOrder: { ...current.groupOrder, [group]: order },
        thirdOrder: [],
        winners: {},
      };
    });
  };

  const moveThird = (index: number, direction: -1 | 1) => {
    setState((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.thirdOrder.length) return current;
      const order = [...current.thirdOrder];
      [order[index], order[target]] = [order[target], order[index]];
      return { ...current, thirdOrder: order, winners: {} };
    });
  };

  const pickWinner = (matchId: number, name: string) => {
    setState((current) => {
      const winners = { ...current.winners, [String(matchId)]: name };
      const clear = (predicate: (id: number) => boolean) => {
        Object.keys(winners).forEach((key) => {
          if (predicate(Number(key))) delete winners[key];
        });
        winners[String(matchId)] = name;
      };
      if (matchId <= 88) clear((id) => id >= 89);
      else if (matchId <= 96) clear((id) => id >= 97);
      else if (matchId <= 100) clear((id) => id >= 101);
      else if (matchId <= 102) clear((id) => id >= 103);
      return { ...current, winners };
    });
  };

  const reset = () => {
    if (window.confirm("Clear the entire prediction?")) setState(emptyState);
  };

  const predictionComplete = Boolean(champion && thirdPlace);
  const pickedGroups = GROUPS.reduce((total, group) => total + (state.groupOrder[group]?.filter(Boolean).length ?? 0), 0);
  const pickedKnockout = Object.keys(state.winners).length;
  const progress = Math.round(((pickedGroups + state.thirdOrder.length + pickedKnockout) / (48 + 12 + 31)) * 100);

  const downloadPrediction = async () => {
    if (!predictionComplete || downloading) return;
    setDownloading(true);
    setDownloadError(null);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1400;
      canvas.height = 1800;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Canvas is not available.");
      context.fillStyle = "#07111f";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.textAlign = "center";
      context.fillStyle = "#ffffff";
      context.font = "700 66px sans-serif";
      context.fillText("WORLD CUP 2026 PREDICTION", 700, 105);
      context.fillStyle = "#f4c542";
      context.font = "800 82px sans-serif";
      context.fillText(`${flag(champion)} ${champion}`, 700, 240);
      context.fillStyle = "#ffffff";
      context.font = "600 32px sans-serif";
      context.fillText("Predicted Champion", 700, 290);
      context.font = "600 28px sans-serif";
      context.fillText(`Third place: ${flag(thirdPlace)} ${thirdPlace}`, 700, 350);
      context.textAlign = "left";
      context.font = "700 30px sans-serif";
      context.fillText("GROUP PICKS", 90, 440);
      context.font = "500 24px sans-serif";
      GROUPS.forEach((group, index) => {
        const x = index < 6 ? 90 : 730;
        const y = 500 + (index % 6) * 170;
        context.fillStyle = "#f4c542";
        context.fillText(`GROUP ${group}`, x, y);
        context.fillStyle = "#ffffff";
        (state.groupOrder[group] ?? []).forEach((name, position) => {
          context.fillText(`${position + 1}. ${flag(name)} ${name}`, x, y + 38 + position * 28);
        });
      });
      context.textAlign = "center";
      context.fillStyle = "#94a3b8";
      context.font = "400 22px sans-serif";
      context.fillText("Generated with Fan26", 700, 1740);
      await downloadCanvas(canvas, "world-cup-2026-prediction.png");
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : "Download failed");
    } finally {
      setDownloading(false);
    }
  };

  const MatchCard = ({ match }: { match: BracketMatch }) => {
    const selected = winner(match.id);
    const locked = !match.home || !match.away;
    return (
      <div className={`rounded-xl border p-3 ${locked ? "border-border bg-secondary/20 opacity-70" : "border-border card-elevated"}`}>
        <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
          <span>Match {match.id}</span><span>{match.label}</span>
        </div>
        <div className="space-y-1.5">
          {[match.home, match.away].map((name, index) => (
            <button
              key={`${match.id}-${index}`}
              disabled={!name}
              onClick={() => name && pickWinner(match.id, name)}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-all ${
                selected === name ? "bg-primary font-bold text-primary-foreground" : "bg-secondary/50 hover:bg-secondary"
              } disabled:cursor-not-allowed`}
            >
              <span className="text-lg">{flag(name)}</span>
              <span className="min-w-0 flex-1 truncate">{name || "Waiting for previous match"}</span>
              {selected === name && <CheckCircle2 className="h-4 w-4" />}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const Round = ({ title, matches }: { title: string; matches: BracketMatch[] }) => (
    <section className="mt-8">
      <h2 className="mb-4 text-2xl font-bold">{title}</h2>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {matches.map((match) => <MatchCard key={match.id} match={match} />)}
      </div>
    </section>
  );

  return (
    <div className="container py-10 md:py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold md:text-5xl">Tournament Predictor</h1>
          <p className="mt-2 max-w-3xl text-muted-foreground">
            Rank all four teams in every group, rank all twelve third-place finishers, then choose every knockout winner. The bracket follows FIFA's official match numbers and Annex C.
          </p>
        </div>
        <button onClick={reset} className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground">
          <RotateCcw className="h-4 w-4" /> Reset
        </button>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-secondary/20 p-4">
        <div className="flex items-center justify-between text-sm"><span>Prediction progress</span><b>{Math.min(progress, 100)}%</b></div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary"><div className="h-full bg-primary transition-all" style={{ width: `${Math.min(progress, 100)}%` }} /></div>
      </div>

      <section className="mt-9">
        <h2 className="text-2xl font-bold">1. Rank every group</h2>
        <p className="mt-1 text-sm text-muted-foreground">Choose 1st, 2nd, 3rd and 4th. The same team cannot occupy two positions.</p>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {GROUPS.map((group) => {
            const members = teamsInGroup(group);
            const order = state.groupOrder[group] ?? ["", "", "", ""];
            return (
              <div key={group} className="overflow-hidden rounded-2xl border border-border card-elevated">
                <div className="border-b border-border bg-secondary/30 px-4 py-3 font-bold">Group {group}</div>
                <div className="space-y-2 p-4">
                  {[0, 1, 2, 3].map((index) => (
                    <label key={index} className="grid grid-cols-[44px_1fr] items-center gap-2">
                      <span className={`text-xs font-bold ${index < 2 ? "text-emerald-500" : index === 3 ? "text-red-500" : "text-amber-500"}`}>{positionLabel(index)}</span>
                      <select
                        value={order[index] ?? ""}
                        onChange={(event) => setGroupPosition(group, index, event.target.value)}
                        className="min-w-0 rounded-lg border border-border bg-input px-3 py-2 text-sm outline-none focus:border-primary"
                      >
                        <option value="">Select team</option>
                        {members.map((member) => <option key={member.name} value={member.name}>{member.flag} {member.name}</option>)}
                      </select>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-bold">2. Rank all third-place teams</h2>
        <p className="mt-1 text-sm text-muted-foreground">FIFA compares all twelve third-place finishers. The top eight qualify; the bottom four are eliminated.</p>
        {!groupStageComplete ? (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground"><LockKeyhole className="h-4 w-4" /> Complete all group positions first.</div>
        ) : (
          <div className="mt-4 overflow-hidden rounded-2xl border border-border card-elevated">
            {state.thirdOrder.map((name, index) => (
              <div key={name} className={`grid grid-cols-[36px_minmax(0,1fr)_28px_28px_34px] items-center gap-2 border-b border-border/70 px-4 py-3 ${index === 7 ? "border-b-2 border-b-primary/50" : ""}`}>
                <span className="font-mono text-sm text-muted-foreground">{index + 1}</span>
                <span className="truncate text-sm font-semibold">{flag(name)} {name} <small className="text-muted-foreground">({teamGroup(name)})</small></span>
                <button onClick={() => moveThird(index, -1)} disabled={index === 0} className="rounded-md p-1 hover:bg-secondary disabled:opacity-20" aria-label={`Move ${name} up`}><ArrowUp className="h-4 w-4" /></button>
                <button onClick={() => moveThird(index, 1)} disabled={index === state.thirdOrder.length - 1} className="rounded-md p-1 hover:bg-secondary disabled:opacity-20" aria-label={`Move ${name} down`}><ArrowDown className="h-4 w-4" /></button>
                <span className={`rounded-full px-2 py-1 text-center text-[10px] font-black ${index < 8 ? "bg-emerald-500/15 text-emerald-500" : "bg-red-500/15 text-red-500"}`}>{index < 8 ? "Q" : "E"}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-bold">3. Pick the knockout winners</h2>
        {!thirdRankingComplete ? (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground"><LockKeyhole className="h-4 w-4" /> Complete the group and third-place rankings first.</div>
        ) : !fullAnnexReady || !annexMapping ? (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm">
            {annex.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />}
            {annex.loading ? "Loading all 495 official Annex C combinations…" : `The official Annex C matrix is unavailable: ${annex.error ?? "combination not found"}`}
          </div>
        ) : (
          <>
            <Round title="Round of 32" matches={r32} />
            <Round title="Round of 16" matches={r16} />
            <Round title="Quarter-finals" matches={qf} />
            <Round title="Semi-finals" matches={sf} />
            <Round title="Third place & Final" matches={medalMatches} />
          </>
        )}
      </section>

      {champion && (
        <section className="mt-10 overflow-hidden rounded-3xl border border-primary/40 bg-primary/10 p-7 text-center">
          <Trophy className="mx-auto h-10 w-10 text-primary" />
          <div className="mt-3 text-sm uppercase tracking-[0.25em] text-primary">Predicted champion</div>
          <div className="mt-2 text-4xl font-black">{flag(champion)} {champion}</div>
          {thirdPlace && <div className="mt-3 text-sm text-muted-foreground">Third place: {flag(thirdPlace)} {thirdPlace}</div>}
        </section>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <button
          onClick={downloadPrediction}
          disabled={!predictionComplete || downloading}
          className="flex items-center gap-2 rounded-full bg-primary px-5 py-3 font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40"
        >
          {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Download prediction PNG
        </button>
        {!predictionComplete && <span className="text-xs text-muted-foreground">Complete the final and third-place match to unlock the download.</span>}
        {downloadError && <span className="text-xs text-red-500">{downloadError}</span>}
      </div>
    </div>
  );
};

export default Prediction;
