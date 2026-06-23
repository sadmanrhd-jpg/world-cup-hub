import { useEffect, useMemo, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { CheckCircle2, Download, Loader2, LockKeyhole } from "lucide-react";
import { GROUPS, TEAMS, teamsInGroup } from "@/data/wc26";

// 2026 format: 12 groups of 4. Top 2 plus the best 8 third placed teams
// advance to the 32 team knockout stage.
type Pos = "first" | "second" | "third";
type Standings = Record<string, Partial<Record<Pos, string>>>;
type Knockout = Record<string, string | undefined>;

type State = {
  standings: Standings;
  thirdsRank: string[];
  knockout: Knockout;
};

type Slot =
  | { type: "rank"; group: string; pos: "first" | "second"; label: string }
  | { type: "third"; allowed: string[]; label: string };

type RoundValidation = {
  validR32: string[];
  validR16: string[];
  validQF: string[];
  validSF: string[];
  champion?: string;
};

const STORAGE_KEY = "wc26-prediction-v3";
const MAX_THIRDS = 8;
const TOTAL_GROUP_PICKS = GROUPS.length * 2 + MAX_THIRDS;
const TOTAL_KNOCKOUT_PICKS = 16 + 8 + 4 + 2 + 1;
const TOTAL_PROGRESS_STEPS = TOTAL_GROUP_PICKS + MAX_THIRDS + TOTAL_KNOCKOUT_PICKS;

const empty: State = { standings: {}, thirdsRank: [], knockout: {} };

const flag = (name?: string) =>
  name ? TEAMS.find((team) => team.name === name)?.flag ?? "" : "";

const groupOf = (name?: string) =>
  name ? TEAMS.find((team) => team.name === name)?.group : undefined;

const teamSlug = (name?: string) =>
  name ? TEAMS.find((team) => team.name === name)?.slug ?? "prediction" : "prediction";

const r = (group: string, pos: "first" | "second"): Slot => ({
  type: "rank",
  group,
  pos,
  label: `${pos === "first" ? "1" : "2"}${group}`,
});

const t3 = (allowed: string): Slot => ({
  type: "third",
  allowed: allowed.split(""),
  label: `3${allowed}`,
});

// The key names are kept for compatibility with existing browser saves.
// These 16 matches are the Round of 32.
const ROUND_OF_32: { left: Slot; right: Slot }[] = [
  { left: r("E", "first"), right: t3("ABCDF") },
  { left: r("I", "first"), right: t3("CDFGH") },
  { left: r("A", "second"), right: r("B", "second") },
  { left: r("F", "first"), right: r("C", "second") },
  { left: r("K", "second"), right: r("L", "second") },
  { left: r("H", "first"), right: r("J", "second") },
  { left: r("D", "first"), right: t3("BEFIJ") },
  { left: r("G", "first"), right: t3("AEHIJ") },
  { left: r("C", "first"), right: r("F", "second") },
  { left: r("E", "second"), right: r("I", "second") },
  { left: r("A", "first"), right: t3("CEFHI") },
  { left: r("L", "first"), right: t3("EHIJK") },
  { left: r("J", "first"), right: r("H", "second") },
  { left: r("D", "second"), right: r("G", "second") },
  { left: r("B", "first"), right: t3("EFGIJ") },
  { left: r("K", "first"), right: t3("DEIJL") },
];

const allocateThirds = (rank: string[]): Record<number, string> => {
  const thirdSlots = ROUND_OF_32
    .map((match, index) => ({ index, slot: match.right }))
    .filter((item) => item.slot.type === "third") as {
    index: number;
    slot: Extract<Slot, { type: "third" }>;
  }[];

  const filled: Record<number, string> = {};
  const usedSlots = new Set<number>();

  for (const team of rank) {
    const group = groupOf(team);
    if (!group) continue;

    const target = thirdSlots.find(
      (item) => !usedSlots.has(item.index) && item.slot.allowed.includes(group),
    );

    if (target) {
      filled[target.index] = team;
      usedSlots.add(target.index);
    }
  }

  return filled;
};

const keysForStage = (stage: string, count: number) =>
  Array.from({ length: count }, (_, index) => `${stage}-${index}`);

const downstreamStages = (key: string) => {
  if (key.startsWith("r16-")) return ["qf-", "sf-", "final-", "champ-"];
  if (key.startsWith("qf-")) return ["sf-", "final-", "champ-"];
  if (key.startsWith("sf-")) return ["final-", "champ-"];
  if (key.startsWith("final-")) return ["champ-"];
  return [];
};

const clearKnockoutByPrefixes = (knockout: Knockout, prefixes: string[]) => {
  const next = { ...knockout };
  Object.keys(next).forEach((key) => {
    if (prefixes.some((prefix) => key.startsWith(prefix))) delete next[key];
  });
  return next;
};

const fitText = (
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
) => {
  if (context.measureText(text).width <= maxWidth) return text;
  let shortened = text;
  while (shortened.length > 3 && context.measureText(`${shortened}…`).width > maxWidth) {
    shortened = shortened.slice(0, -1);
  }
  return `${shortened}…`;
};

const roundedRect = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) => {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
};

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

const Prediction = () => {
  const [state, setState] = useState<State>(empty);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const lastChampRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setState({ ...empty, ...JSON.parse(raw) });
    } catch {
      // Ignore malformed local data and start fresh.
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const thirdTeams = useMemo(
    () =>
      GROUPS.map((group) => state.standings[group]?.third).filter(Boolean) as string[],
    [state.standings],
  );

  const thirdsCount = thirdTeams.length;

  useEffect(() => {
    setState((current) => {
      const selected = new Set(thirdTeams);
      const cleaned = current.thirdsRank.filter((team) => selected.has(team));
      const missing = thirdTeams.filter((team) => !cleaned.includes(team));
      const next = [...cleaned, ...missing];

      if (
        next.length === current.thirdsRank.length &&
        next.every((value, index) => value === current.thirdsRank[index])
      ) {
        return current;
      }

      return { ...current, thirdsRank: next };
    });
  }, [thirdTeams]);

  const thirdSlotAssignments = useMemo(
    () => allocateThirds(state.thirdsRank),
    [state.thirdsRank],
  );

  const resolveSlot = (
    slot: Slot,
    roundOf32Index: number,
    side: "L" | "R",
  ): string | undefined => {
    if (slot.type === "rank") return state.standings[slot.group]?.[slot.pos];
    if (side === "R") return thirdSlotAssignments[roundOf32Index];
    return undefined;
  };

  const validation = useMemo<RoundValidation>(() => {
    const validR32 = ROUND_OF_32.map((match, index) => {
      const left = resolveSlot(match.left, index, "L");
      const right = resolveSlot(match.right, index, "R");
      const winner = state.knockout[`r16-${index}`];
      return winner && (winner === left || winner === right) ? winner : "";
    });

    const validateRound = (
      source: string[],
      targetStage: string,
      targetCount: number,
    ) =>
      Array.from({ length: targetCount }, (_, index) => {
        const first = source[index * 2];
        const second = source[index * 2 + 1];
        const winner = state.knockout[`${targetStage}-${index}`];
        return winner && (winner === first || winner === second) ? winner : "";
      });

    const validR16 = validateRound(validR32, "qf", 8);
    const validQF = validateRound(validR16, "sf", 4);
    const validSF = validateRound(validQF, "final", 2);
    const finalWinner = state.knockout["champ-0"];
    const champion =
      finalWinner && (finalWinner === validSF[0] || finalWinner === validSF[1])
        ? finalWinner
        : undefined;

    return { validR32, validR16, validQF, validSF, champion };
  }, [state.knockout, state.standings, thirdSlotAssignments]);

  const groupPickCount = useMemo(
    () =>
      GROUPS.reduce((total, group) => {
        const picks = state.standings[group] ?? {};
        return total + ([picks.first, picks.second, picks.third].filter(Boolean).length ?? 0);
      }, 0),
    [state.standings],
  );

  const validKnockoutCount =
    validation.validR32.filter(Boolean).length +
    validation.validR16.filter(Boolean).length +
    validation.validQF.filter(Boolean).length +
    validation.validSF.filter(Boolean).length +
    (validation.champion ? 1 : 0);

  const groupStageComplete = groupPickCount === TOTAL_GROUP_PICKS;
  const thirdsComplete = thirdsCount === MAX_THIRDS && state.thirdsRank.length === MAX_THIRDS;
  const knockoutComplete = validKnockoutCount === TOTAL_KNOCKOUT_PICKS;
  const predictionComplete = groupStageComplete && thirdsComplete && knockoutComplete;
  const completedSteps = groupPickCount + Math.min(state.thirdsRank.length, MAX_THIRDS) + validKnockoutCount;
  const progress = Math.min(100, Math.round((completedSteps / TOTAL_PROGRESS_STEPS) * 100));

  const pickPos = (group: string, pos: Pos, team: string) => {
    setState((current) => {
      const groupPicks = { ...(current.standings[group] ?? {}) };
      const wasActive = groupPicks[pos] === team;

      (Object.keys(groupPicks) as Pos[]).forEach((key) => {
        if (groupPicks[key] === team) delete groupPicks[key];
      });

      if (!wasActive) groupPicks[pos] = team;

      return {
        ...current,
        standings: { ...current.standings, [group]: groupPicks },
        knockout: {},
      };
    });
  };

  const setThirdRank = (team: string, newRank: number) => {
    setState((current) => {
      const rank = current.thirdsRank.filter((item) => item !== team);
      const clamped = Math.max(1, Math.min(newRank, rank.length + 1));
      rank.splice(clamped - 1, 0, team);

      return {
        ...current,
        thirdsRank: rank,
        knockout: {},
      };
    });
  };

  const setKO = (key: string, value: string) => {
    setState((current) => {
      const prefixes = downstreamStages(key);
      const knockout = clearKnockoutByPrefixes(current.knockout, prefixes);

      if (value) knockout[key] = value;
      else delete knockout[key];

      return { ...current, knockout };
    });
  };

  const reset = () => {
    if (confirm("Clear your entire prediction?")) setState(empty);
  };

  useEffect(() => {
    const champion = validation.champion;

    if (champion && champion !== lastChampRef.current) {
      lastChampRef.current = champion;
      const fire = (origin: { x: number; y: number }) =>
        confetti({
          particleCount: 120,
          spread: 80,
          startVelocity: 45,
          origin,
          colors: ["#FFD700", "#FF4D4D", "#3DDC84", "#1E90FF", "#FF8C00"],
        });

      fire({ x: 0.2, y: 0.6 });
      fire({ x: 0.5, y: 0.5 });
      fire({ x: 0.8, y: 0.6 });
      setTimeout(() => fire({ x: 0.5, y: 0.4 }), 250);
      setTimeout(() => fire({ x: 0.3, y: 0.5 }), 500);
      setTimeout(() => fire({ x: 0.7, y: 0.5 }), 500);
    } else if (!champion) {
      lastChampRef.current = undefined;
    }
  }, [validation.champion]);

  const downloadPrediction = async () => {
    if (!predictionComplete || !validation.champion || isDownloading) return;

    setIsDownloading(true);
    setDownloadError(null);

    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1800;
      canvas.height = 2400;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Your browser could not prepare the image.");

      const width = canvas.width;
      const height = canvas.height;
      const background = context.createLinearGradient(0, 0, width, height);
      background.addColorStop(0, "#07111f");
      background.addColorStop(0.5, "#0e1b2d");
      background.addColorStop(1, "#071019");
      context.fillStyle = background;
      context.fillRect(0, 0, width, height);

      context.fillStyle = "rgba(255, 193, 7, 0.08)";
      context.beginPath();
      context.arc(1550, 180, 420, 0, Math.PI * 2);
      context.fill();

      context.fillStyle = "rgba(64, 196, 255, 0.06)";
      context.beginPath();
      context.arc(180, 2180, 480, 0, Math.PI * 2);
      context.fill();

      context.fillStyle = "#f7c948";
      context.font = "700 28px Arial, sans-serif";
      context.fillText("FAN26", 90, 95);

      context.fillStyle = "#ffffff";
      context.font = "800 68px Arial, sans-serif";
      context.fillText("MY WORLD CUP 2026 PREDICTION", 90, 175);

      context.fillStyle = "#9fb0c3";
      context.font = "400 27px Arial, sans-serif";
      context.fillText("Complete tournament infographic", 92, 225);

      roundedRect(context, 90, 285, 1620, 230, 36);
      const championGradient = context.createLinearGradient(90, 285, 1710, 515);
      championGradient.addColorStop(0, "#18283b");
      championGradient.addColorStop(0.55, "#243a50");
      championGradient.addColorStop(1, "#7a5712");
      context.fillStyle = championGradient;
      context.fill();
      context.strokeStyle = "rgba(247, 201, 72, 0.72)";
      context.lineWidth = 3;
      context.stroke();

      context.fillStyle = "#f7c948";
      context.font = "700 24px Arial, sans-serif";
      context.fillText("PREDICTED CHAMPION", 145, 350);

      context.fillStyle = "#ffffff";
      context.font = "800 76px Arial, sans-serif";
      context.fillText(validation.champion.toUpperCase(), 145, 445);

      const finalists = validation.validSF.filter(Boolean);
      const semifinalists = validation.validQF.filter(Boolean);
      context.textAlign = "right";
      context.fillStyle = "#f7c948";
      context.font = "700 22px Arial, sans-serif";
      context.fillText("FINALISTS", 1640, 345);
      context.fillStyle = "#ffffff";
      context.font = "600 29px Arial, sans-serif";
      context.fillText(fitText(context, finalists.join("  •  "), 760), 1640, 390);
      context.fillStyle = "#9fb0c3";
      context.font = "600 20px Arial, sans-serif";
      context.fillText("SEMI FINALISTS", 1640, 435);
      context.fillStyle = "#dce5ee";
      context.font = "500 21px Arial, sans-serif";
      context.fillText(fitText(context, semifinalists.join("  •  "), 760), 1640, 472);
      context.textAlign = "left";

      const bracketTop = 610;
      const bracketHeight = 900;
      roundedRect(context, 70, bracketTop - 55, 1660, bracketHeight + 110, 34);
      context.fillStyle = "rgba(8, 20, 33, 0.86)";
      context.fill();
      context.strokeStyle = "rgba(255,255,255,0.08)";
      context.lineWidth = 2;
      context.stroke();

      context.fillStyle = "#ffffff";
      context.font = "800 34px Arial, sans-serif";
      context.fillText("KNOCKOUT PATH", 110, bracketTop);

      const columns = [
        { title: "R32", teams: validation.validR32.filter(Boolean) },
        { title: "R16", teams: validation.validR16.filter(Boolean) },
        { title: "QF", teams: validation.validQF.filter(Boolean) },
        { title: "SF", teams: validation.validSF.filter(Boolean) },
        { title: "WINNER", teams: [validation.champion] },
      ];

      const columnX = [100, 430, 760, 1090, 1420];
      const cardWidth = 250;
      const cardHeight = 42;
      const stageTop = bracketTop + 80;
      const stageBottom = bracketTop + bracketHeight - 40;
      const centers: number[][] = [];

      columns.forEach((column, columnIndex) => {
        context.fillStyle = columnIndex === columns.length - 1 ? "#f7c948" : "#8fa4b8";
        context.font = "700 22px Arial, sans-serif";
        context.fillText(column.title, columnX[columnIndex], bracketTop + 47);

        const count = column.teams.length;
        const spacing = count > 1 ? (stageBottom - stageTop) / (count - 1) : 0;
        const positions = column.teams.map((_, index) =>
          count === 1 ? (stageTop + stageBottom) / 2 : stageTop + spacing * index,
        );
        centers.push(positions);
      });

      context.strokeStyle = "rgba(247, 201, 72, 0.2)";
      context.lineWidth = 2;
      for (let columnIndex = 0; columnIndex < centers.length - 1; columnIndex += 1) {
        centers[columnIndex + 1].forEach((targetY, targetIndex) => {
          const sourceA = centers[columnIndex][targetIndex * 2];
          const sourceB = centers[columnIndex][targetIndex * 2 + 1];
          const targetX = columnX[columnIndex + 1];
          const sourceX = columnX[columnIndex] + cardWidth;
          const middleX = (sourceX + targetX) / 2;

          [sourceA, sourceB].filter((value) => value != null).forEach((sourceY) => {
            context.beginPath();
            context.moveTo(sourceX, sourceY);
            context.lineTo(middleX, sourceY);
            context.lineTo(middleX, targetY);
            context.lineTo(targetX, targetY);
            context.stroke();
          });
        });
      }

      columns.forEach((column, columnIndex) => {
        column.teams.forEach((team, index) => {
          const centerY = centers[columnIndex][index];
          const x = columnX[columnIndex];
          const y = centerY - cardHeight / 2;
          roundedRect(context, x, y, cardWidth, cardHeight, 10);
          context.fillStyle =
            columnIndex === columns.length - 1
              ? "#f7c948"
              : "rgba(25, 43, 61, 0.96)";
          context.fill();
          context.strokeStyle =
            columnIndex === columns.length - 1
              ? "#ffe17a"
              : "rgba(255,255,255,0.12)";
          context.lineWidth = 1.5;
          context.stroke();

          context.fillStyle = columnIndex === columns.length - 1 ? "#101820" : "#ffffff";
          context.font = `${columnIndex === columns.length - 1 ? "700" : "600"} 19px Arial, sans-serif`;
          context.fillText(fitText(context, team ?? "", cardWidth - 24), x + 12, y + 27);
        });
      });

      const groupsTop = 1645;
      context.fillStyle = "#ffffff";
      context.font = "800 34px Arial, sans-serif";
      context.fillText("GROUP STAGE PICKS", 90, groupsTop);

      const groupCardWidth = 385;
      const groupCardHeight = 175;
      const groupGapX = 26;
      const groupGapY = 24;

      GROUPS.forEach((group, index) => {
        const column = index % 4;
        const row = Math.floor(index / 4);
        const x = 90 + column * (groupCardWidth + groupGapX);
        const y = groupsTop + 40 + row * (groupCardHeight + groupGapY);
        const picks = state.standings[group] ?? {};

        roundedRect(context, x, y, groupCardWidth, groupCardHeight, 20);
        context.fillStyle = "rgba(19, 35, 51, 0.94)";
        context.fill();
        context.strokeStyle = "rgba(255,255,255,0.1)";
        context.lineWidth = 1.5;
        context.stroke();

        context.fillStyle = "#f7c948";
        context.font = "800 26px Arial, sans-serif";
        context.fillText(`GROUP ${group}`, x + 22, y + 38);

        const rows: [string, string | undefined][] = [
          ["1ST", picks.first],
          ["2ND", picks.second],
          ["3RD", picks.third],
        ];

        rows.forEach(([label, team], rowIndex) => {
          const rowY = y + 76 + rowIndex * 35;
          context.fillStyle = "#8194a7";
          context.font = "700 17px Arial, sans-serif";
          context.fillText(label, x + 22, rowY);
          context.fillStyle = "#ffffff";
          context.font = "600 20px Arial, sans-serif";
          context.fillText(fitText(context, team ?? "", groupCardWidth - 100), x + 90, rowY);
        });
      });

      context.fillStyle = "#8092a5";
      context.font = "400 20px Arial, sans-serif";
      context.fillText(
        `Generated ${new Date().toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })}`,
        90,
        2345,
      );

      context.textAlign = "right";
      context.fillStyle = "#f7c948";
      context.font = "700 20px Arial, sans-serif";
      context.fillText("FAN26 • WORLD CUP 2026", 1710, 2345);
      context.textAlign = "left";

      await downloadCanvas(
        canvas,
        `world-cup-2026-prediction-${teamSlug(validation.champion)}.png`,
      );
    } catch (error) {
      setDownloadError(
        error instanceof Error ? error.message : "The PNG could not be generated.",
      );
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="container py-12 space-y-12">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-4xl md:text-5xl font-bold">Your Prediction</h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            48 teams · 12 groups · top 2 plus the best 8 third placed teams advance
            to a 32 team knockout. Pick 1st and 2nd in every group, choose the eight
            third place qualifiers, then complete the bracket. Your progress is saved
            in this browser.
          </p>
        </div>
        <button
          onClick={reset}
          className="text-xs uppercase tracking-widest px-4 py-2 rounded-full border border-border hover:bg-secondary transition-colors"
        >
          Reset
        </button>
      </div>

      <section className="card-elevated rounded-3xl border border-primary/25 overflow-hidden">
        <div className="p-5 sm:p-7 bg-gradient-to-br from-primary/15 via-secondary/30 to-background">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-primary">
                {predictionComplete ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <LockKeyhole className="h-4 w-4" />
                )}
                Downloadable prediction
              </div>
              <h2 className="text-2xl md:text-3xl font-bold mt-2">
                {predictionComplete
                  ? "Your tournament infographic is ready"
                  : "Complete the full prediction to unlock your PNG"}
              </h2>
              <p className="text-sm text-muted-foreground mt-2">
                After completing every group and knockout pick, your full prediction
                can be downloaded as a high resolution PNG infographic.
              </p>
            </div>

            <button
              type="button"
              disabled={!predictionComplete || isDownloading}
              onClick={downloadPrediction}
              className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 font-semibold bg-primary text-primary-foreground disabled:opacity-45 disabled:cursor-not-allowed hover:scale-[1.02] transition-transform"
            >
              {isDownloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {isDownloading
                ? "Creating PNG..."
                : predictionComplete
                  ? "Download prediction PNG"
                  : "Complete prediction to download"}
            </button>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
              <span>Prediction progress</span>
              <span className="font-semibold text-foreground">{progress}%</span>
            </div>
            <div className="h-2 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="grid grid-cols-3 gap-3 mt-4 text-center">
              <ProgressStat
                label="Group qualifiers"
                value={`${groupPickCount}/${TOTAL_GROUP_PICKS}`}
                complete={groupStageComplete}
              />
              <ProgressStat
                label="Third place"
                value={`${Math.min(state.thirdsRank.length, MAX_THIRDS)}/${MAX_THIRDS}`}
                complete={thirdsComplete}
              />
              <ProgressStat
                label="Knockout"
                value={`${validKnockoutCount}/${TOTAL_KNOCKOUT_PICKS}`}
                complete={knockoutComplete}
              />
            </div>
            {downloadError && (
              <p className="text-xs text-red-500 mt-3">{downloadError}</p>
            )}
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-end justify-between mb-6 flex-wrap gap-2">
          <h2 className="text-2xl md:text-3xl font-bold">Group Stage</h2>
          <div className="text-sm text-muted-foreground">
            Third place picks:{" "}
            <span className={`font-bold ${thirdsCount >= MAX_THIRDS ? "text-primary" : ""}`}>
              {thirdsCount}/{MAX_THIRDS}
            </span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {GROUPS.map((group) => {
            const teams = teamsInGroup(group);
            const picks = state.standings[group] ?? {};
            const thirdLocked = thirdsCount >= MAX_THIRDS && !picks.third;

            return (
              <div key={group} className="card-elevated rounded-2xl border border-border p-5">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs uppercase tracking-widest text-muted-foreground">
                    Group
                  </span>
                  <span className="font-display font-bold text-2xl gradient-text">
                    {group}
                  </span>
                </div>

                <div className="space-y-2">
                  {teams.map((team) => {
                    const myPos = (Object.keys(picks) as Pos[]).find(
                      (pos) => picks[pos] === team.name,
                    );

                    return (
                      <div key={team.slug} className="flex items-center gap-1.5 sm:gap-2">
                        <span className="text-lg sm:text-xl">{team.flag}</span>
                        <span className="flex-1 min-w-0 text-xs sm:text-sm font-medium truncate">
                          {team.name}
                        </span>

                        {(["first", "second", "third"] as Pos[]).map((pos) => {
                          const active = myPos === pos;
                          const taken = picks[pos] && picks[pos] !== team.name;
                          const disabled =
                            (pos === "third" && thirdLocked && !active) || !!taken;
                          const label = pos === "first" ? "1" : pos === "second" ? "2" : "3";

                          return (
                            <button
                              key={pos}
                              type="button"
                              disabled={disabled}
                              onClick={() => pickPos(group, pos, team.name)}
                              className={[
                                "w-7 h-7 sm:w-8 sm:h-8 shrink-0 rounded-full text-[10px] sm:text-xs font-bold border transition-all",
                                active
                                  ? "bg-primary text-primary-foreground border-primary glow"
                                  : "border-border bg-secondary/40 hover:border-primary/50",
                                disabled ? "opacity-30 cursor-not-allowed" : "",
                              ].join(" ")}
                              title={
                                pos === "third" && thirdLocked && !active
                                  ? "8 third place teams already selected"
                                  : `Pick as ${pos}`
                              }
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {thirdsCount > 0 && (
        <section>
          <h2 className="text-2xl md:text-3xl font-bold mb-2">
            Rank Your Advancing Third Place Teams
          </h2>
          <p className="text-muted-foreground mb-6">
            Choose third place qualifiers in eight groups, then order those eight teams
            by how strongly you expect them to finish. They automatically fill the
            eligible knockout slots.
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {state.thirdsRank.map((name, index) => {
              const group = groupOf(name);
              const total = state.thirdsRank.length;

              return (
                <div
                  key={name}
                  className="card-elevated rounded-xl border border-border p-3 flex items-center gap-3"
                >
                  <select
                    value={index + 1}
                    onChange={(event: { target: { value: string } }) => setThirdRank(name, Number(event.target.value))}
                    className="w-14 bg-input border border-border rounded px-2 py-1 text-sm font-bold text-primary outline-none focus:border-primary"
                    aria-label="Rank"
                  >
                    {Array.from({ length: total }, (_, item) => item + 1).map((rank) => (
                      <option key={rank} value={rank}>
                        {rank}
                      </option>
                    ))}
                  </select>

                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {flag(name)} {name}
                    </div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-widest">
                      Group {group}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-2xl md:text-3xl font-bold mb-2">Round of 32</h2>
        <p className="text-muted-foreground mb-6">
          Slots fill from your group standings and ranked third place teams. Select
          the winner of every match to advance through the tournament.
        </p>

        <div className="grid md:grid-cols-2 gap-4">
          {ROUND_OF_32.map((match, index) => {
            const key = `r16-${index}`;
            const left = resolveSlot(match.left, index, "L");
            const right = resolveSlot(match.right, index, "R");
            const winner = state.knockout[key];

            return (
              <div key={key} className="card-elevated rounded-xl border border-border p-4">
                <div className="text-xs text-muted-foreground mb-2">Match {index + 1}</div>
                <SlotRow
                  slot={match.left}
                  resolved={left}
                  isWinner={winner === left && !!left}
                  onPickWinner={() => left && setKO(key, winner === left ? "" : left)}
                />
                <div className="text-center text-xs text-muted-foreground my-1">vs</div>
                <SlotRow
                  slot={match.right}
                  resolved={right}
                  isWinner={winner === right && !!right}
                  onPickWinner={() => right && setKO(key, winner === right ? "" : right)}
                />
              </div>
            );
          })}
        </div>

        <BracketRound
          title="Round of 16"
          slots={8}
          stage="qf"
          state={state}
          onPick={setKO}
          options={validation.validR32}
          cols={4}
        />
        <BracketRound
          title="Quarter finals"
          slots={4}
          stage="sf"
          state={state}
          onPick={setKO}
          options={validation.validR16}
          cols={4}
        />
        <BracketRound
          title="Semi finals"
          slots={2}
          stage="final"
          state={state}
          onPick={setKO}
          options={validation.validQF}
          cols={2}
        />
        <BracketRound
          title="Final"
          slots={1}
          stage="champ"
          state={state}
          onPick={setKO}
          options={validation.validSF}
          cols={1}
        />

        <div className="mt-10">
          <h3 className="text-sm uppercase tracking-widest text-muted-foreground mb-3">
            Your Champion
          </h3>
          <div className="card-elevated rounded-2xl border border-primary/40 p-8 text-center glow">
            <div className={`text-6xl ${validation.champion ? "animate-bounce" : ""}`}>
              🏆
            </div>
            <div className="text-3xl md:text-5xl font-bold mt-3 gradient-gold-text min-h-[1.2em]">
              {validation.champion
                ? `${flag(validation.champion)} ${validation.champion}`
                : "—"}
            </div>
            <div className="text-sm text-muted-foreground mt-3">
              MetLife Stadium · July 19, 2026
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

const ProgressStat = ({
  label,
  value,
  complete,
}: {
  label: string;
  value: string;
  complete: boolean;
}) => (
  <div className="rounded-xl border border-border/70 bg-background/55 px-3 py-3">
    <div className={`text-base sm:text-lg font-bold ${complete ? "text-primary" : ""}`}>
      {value}
    </div>
    <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">{label}</div>
  </div>
);

const SlotRow = ({
  slot,
  resolved,
  isWinner,
  onPickWinner,
}: {
  slot: Slot;
  resolved?: string;
  isWinner: boolean;
  onPickWinner: () => void;
}) => (
  <button
    type="button"
    onClick={onPickWinner}
    disabled={!resolved}
    className={`w-full flex items-center gap-2 rounded-lg p-2 border text-left transition-colors ${
      isWinner
        ? "border-primary bg-primary/10"
        : "border-border/50 hover:border-primary/40"
    } disabled:opacity-50 disabled:cursor-not-allowed`}
  >
    <span className="text-[10px] uppercase tracking-widest text-muted-foreground w-10">
      {slot.label}
    </span>
    <span className="flex-1 text-sm font-medium">
      {resolved ? (
        `${flag(resolved)} ${resolved}`
      ) : (
        <span className="text-muted-foreground">— pending —</span>
      )}
    </span>
    {isWinner && <span className="text-xs text-primary">winner</span>}
  </button>
);

const BracketRound = ({
  title,
  slots,
  stage,
  state,
  onPick,
  options,
  cols,
}: {
  title: string;
  slots: number;
  stage: string;
  state: State;
  onPick: (key: string, value: string) => void;
  options: string[];
  cols: number;
}) => (
  <div className="mt-8">
    <h3 className="text-sm uppercase tracking-widest text-muted-foreground mb-3">
      {title}
    </h3>
    <div
      className={`grid gap-3 ${
        cols >= 4
          ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
          : cols === 2
            ? "grid-cols-1 sm:grid-cols-2"
            : "grid-cols-1"
      }`}
    >
      {Array.from({ length: slots }).map((_, index) => {
        const key = `${stage}-${index}`;
        const value = state.knockout[key];
        const first = options[index * 2];
        const second = options[index * 2 + 1];
        const candidates = [first, second].filter(Boolean) as string[];

        return (
          <div key={key} className="card-elevated rounded-xl border border-border p-3">
            <div className="text-xs text-muted-foreground mb-2">
              {title === "Final" ? "Championship match" : `Match ${index + 1}`}
            </div>

            {candidates.length === 0 ? (
              <div className="text-xs text-muted-foreground italic px-2 py-3">
                — pending previous round —
              </div>
            ) : (
              <div className="space-y-2">
                {candidates.map((name) => {
                  const active = value === name;

                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => onPick(key, active ? "" : name)}
                      className={[
                        "w-full flex items-center gap-2 rounded-lg p-2 border text-left transition-colors text-sm font-medium",
                        active
                          ? "border-primary bg-primary/10 glow"
                          : "border-border/50 hover:border-primary/40 bg-secondary/30",
                      ].join(" ")}
                    >
                      <span className="text-lg">{flag(name)}</span>
                      <span className="flex-1 truncate">{name}</span>
                      {active && (
                        <span className="text-[10px] text-primary uppercase tracking-widest">
                          winner
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  </div>
);

export default Prediction;
