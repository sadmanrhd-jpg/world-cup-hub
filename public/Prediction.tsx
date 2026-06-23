import { useEffect, useMemo, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { GROUPS, TEAMS, teamsInGroup } from "@/data/wc26";

type Pos = "first" | "second" | "third";
type Standings = Record<string, Partial<Record<Pos, string>>>;
type Knockout = Record<string, string | undefined>;

type State = {
  predictorName: string;
  standings: Standings;
  thirdsRank: string[];
  knockout: Knockout;
  updatedAt?: string;
  completedAt?: string;
};

const STORAGE_KEY = "wc26-prediction-v6";
const LEGACY_STORAGE_KEYS = ["wc26-prediction-v5", "wc26-prediction-v4", "wc26-prediction-v3"];
const MAX_THIRDS = 8;
const LOGO_SRC = "/wc26-logo.png";
const flag = (name?: string) => (name ? TEAMS.find((t) => t.name === name)?.flag ?? "" : "");
const groupOf = (name?: string) => (name ? TEAMS.find((t) => t.name === name)?.group : undefined);

const empty: State = {
  predictorName: "",
  standings: {},
  thirdsRank: [],
  knockout: {},
};

type Slot =
  | { type: "rank"; group: string; pos: "first" | "second"; label: string }
  | { type: "third"; allowed: string[]; label: string };

const r = (g: string, pos: "first" | "second"): Slot => ({
  type: "rank",
  group: g,
  pos,
  label: `${pos === "first" ? "1" : "2"}${g}`,
});

const t3 = (allowed: string): Slot => ({
  type: "third",
  allowed: allowed.split(""),
  label: `3${allowed}`,
});

const R16: { left: Slot; right: Slot }[] = [
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

const knockoutKeys = [
  ...Array.from({ length: 16 }, (_, i) => `r16-${i}`),
  ...Array.from({ length: 8 }, (_, i) => `qf-${i}`),
  ...Array.from({ length: 4 }, (_, i) => `sf-${i}`),
  ...Array.from({ length: 2 }, (_, i) => `final-${i}`),
  "champ-0",
];

const stageOptions = (knockout: Knockout, stage: "qf" | "sf" | "final" | "champ", index: number) => {
  if (stage === "qf") return [knockout[`r16-${index * 2}`], knockout[`r16-${index * 2 + 1}`]].filter(Boolean) as string[];
  if (stage === "sf") return [knockout[`qf-${index * 2}`], knockout[`qf-${index * 2 + 1}`]].filter(Boolean) as string[];
  if (stage === "final") return [knockout[`sf-${index * 2}`], knockout[`sf-${index * 2 + 1}`]].filter(Boolean) as string[];
  return [knockout["final-0"], knockout["final-1"]].filter(Boolean) as string[];
};

const allocateThirds = (rank: string[]): Record<number, string> => {
  const thirdSlots = R16.map((m, i) => ({ i, slot: m.right })).filter(
    (x): x is { i: number; slot: Extract<Slot, { type: "third" }> } => x.slot.type === "third",
  );

  const filled: Record<number, string> = {};
  const usedSlots = new Set<number>();

  for (const team of rank) {
    const g = groupOf(team);
    if (!g) continue;
    const target = thirdSlots.find((x) => !usedSlots.has(x.i) && x.slot.allowed.includes(g));
    if (target) {
      filled[target.i] = team;
      usedSlots.add(target.i);
    }
  }

  return filled;
};

const isoNow = () => new Date().toISOString();

const formatStamp = (iso?: string) => {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
};

const isPredictionComplete = (state: State) => {
  const groupsReady = GROUPS.every((g) => !!state.standings[g]?.first && !!state.standings[g]?.second);
  const thirdsReady = state.thirdsRank.length === MAX_THIRDS;
  const knockoutReady = knockoutKeys.every((key) => !!state.knockout[key]);
  return groupsReady && thirdsReady && knockoutReady;
};

const sanitizeKnockout = (state: State): Knockout => {
  const knockout: Knockout = {};
  const thirdSlotAssignments = allocateThirds(state.thirdsRank);

  const resolveSlot = (slot: Slot, r16Index: number, side: "L" | "R") => {
    if (slot.type === "rank") return state.standings[slot.group]?.[slot.pos];
    if (side === "R") return thirdSlotAssignments[r16Index];
    return undefined;
  };

  for (let i = 0; i < 16; i += 1) {
    const key = `r16-${i}`;
    const left = resolveSlot(R16[i].left, i, "L");
    const right = resolveSlot(R16[i].right, i, "R");
    const value = state.knockout[key];
    if (value && (value === left || value === right)) knockout[key] = value;
  }

  (["qf", "sf", "final", "champ"] as const).forEach((stage) => {
    const slots = stage === "qf" ? 8 : stage === "sf" ? 4 : stage === "final" ? 2 : 1;
    const used = new Set<string>();
    for (let i = 0; i < slots; i += 1) {
      const key = `${stage}-${i}`;
      const candidates = Array.from(new Set(stageOptions(knockout, stage, i)));
      const value = state.knockout[key];
      if (value && candidates.includes(value) && !used.has(value)) {
        knockout[key] = value;
        used.add(value);
      }
    }
  });

  return knockout;
};

const buildCommittedState = (next: State): State => {
  const sanitized: State = {
    ...next,
    knockout: sanitizeKnockout(next),
  };

  const now = isoNow();
  const completed = isPredictionComplete(sanitized);
  return {
    ...sanitized,
    updatedAt: now,
    completedAt: completed ? sanitized.completedAt ?? now : undefined,
    predictorName: sanitized.predictorName.trimStart(),
  };
};

const drawRoundedRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fillStyle: string,
  strokeStyle?: string,
) => {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  ctx.fillStyle = fillStyle;
  ctx.fill();
  if (strokeStyle) {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
};

const textLine = (
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  options?: {
    color?: string;
    font?: string;
    align?: CanvasTextAlign;
    baseline?: CanvasTextBaseline;
  },
) => {
  ctx.fillStyle = options?.color ?? "#F8FAFC";
  ctx.font = options?.font ?? '500 18px "Inter", "Segoe UI Emoji", sans-serif';
  ctx.textAlign = options?.align ?? "left";
  ctx.textBaseline = options?.baseline ?? "top";
  ctx.fillText(text, x, y);
};

const wrapText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  options?: { color?: string; font?: string },
) => {
  ctx.fillStyle = options?.color ?? "#F8FAFC";
  ctx.font = options?.font ?? '500 18px "Inter", "Segoe UI Emoji", sans-serif';
  const words = text.split(" ");
  let line = "";
  let lineY = y;

  words.forEach((word, idx) => {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && line) {
      ctx.fillText(line, x, lineY);
      line = word;
      lineY += lineHeight;
    } else {
      line = candidate;
    }
    if (idx === words.length - 1 && line) {
      ctx.fillText(line, x, lineY);
    }
  });
  return lineY + lineHeight;
};

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

const Prediction = () => {
  const [state, setState] = useState<State>(empty);
  const lastChampRef = useRef<string | undefined>(undefined);
  const [exporting, setExporting] = useState(false);
  const [logoAvailable, setLogoAvailable] = useState(true);

  const commit = (updater: (prev: State) => State) => {
    setState((prev) => {
      const next = updater(prev);
      if (next === prev) return prev;
      return buildCommittedState(next);
    });
  };

  useEffect(() => {
    try {
      const storageKey = [STORAGE_KEY, ...LEGACY_STORAGE_KEYS].find((key) => localStorage.getItem(key));
      if (!storageKey) return;
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<State>;
      const hydrated: State = {
        ...empty,
        ...parsed,
        standings: parsed.standings ?? {},
        thirdsRank: parsed.thirdsRank ?? [],
        knockout: parsed.knockout ?? {},
        predictorName: parsed.predictorName ?? "",
      };
      const migrated = {
        ...hydrated,
        knockout: sanitizeKnockout(hydrated),
      };
      setState(migrated);
      if (storageKey !== STORAGE_KEY) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      }
    } catch {
      setState(empty);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    const img = new Image();
    img.onload = () => setLogoAvailable(true);
    img.onerror = () => setLogoAvailable(false);
    img.src = LOGO_SRC;
  }, []);

  const thirdTeams = useMemo(
    () => GROUPS.map((g) => state.standings[g]?.third).filter(Boolean) as string[],
    [state.standings],
  );
  const thirdsCount = thirdTeams.length;

  useEffect(() => {
    commit((prev) => {
      const set = new Set(thirdTeams);
      const cleaned = prev.thirdsRank.filter((t) => set.has(t));
      const missing = thirdTeams.filter((t) => !cleaned.includes(t));
      const next = [...cleaned, ...missing];
      if (next.length === prev.thirdsRank.length && next.every((v, i) => v === prev.thirdsRank[i])) {
        return prev;
      }
      return { ...prev, thirdsRank: next };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thirdTeams.join("|")]);

  const thirdSlotAssignments = useMemo(() => allocateThirds(state.thirdsRank), [state.thirdsRank]);

  const progress = useMemo(() => {
    const groupPicks = GROUPS.reduce((sum, g) => {
      const picks = state.standings[g] ?? {};
      return sum + (picks.first ? 1 : 0) + (picks.second ? 1 : 0);
    }, 0);
    const knockoutPicks = knockoutKeys.filter((key) => !!state.knockout[key]).length;
    const total = GROUPS.length * 2 + MAX_THIRDS + knockoutKeys.length;
    const current = groupPicks + Math.min(state.thirdsRank.length, MAX_THIRDS) + knockoutPicks;
    return {
      current,
      total,
      percent: Math.round((current / total) * 100),
    };
  }, [state]);

  const isComplete = useMemo(() => isPredictionComplete(state), [state]);

  const resolveSlot = (slot: Slot, r16Index: number, side: "L" | "R"): string | undefined => {
    if (slot.type === "rank") return state.standings[slot.group]?.[slot.pos];
    if (side === "R") return thirdSlotAssignments[r16Index];
    return undefined;
  };

  const pickPos = (group: string, pos: Pos, team: string) => {
    commit((prev) => {
      const cur = { ...(prev.standings[group] ?? {}) };
      (Object.keys(cur) as Pos[]).forEach((k) => {
        if (cur[k] === team) delete cur[k];
      });
      if (cur[pos] === team) delete cur[pos];
      else cur[pos] = team;
      return { ...prev, standings: { ...prev.standings, [group]: cur } };
    });
  };

  const setKO = (key: string, value: string) => {
    commit((prev) => ({
      ...prev,
      knockout: { ...prev.knockout, [key]: value || undefined },
    }));
  };

  const setThirdRank = (team: string, newRank: number) => {
    commit((prev) => {
      const arr = prev.thirdsRank.filter((t) => t !== team);
      const clamped = Math.max(1, Math.min(newRank, arr.length + 1));
      arr.splice(clamped - 1, 0, team);
      return { ...prev, thirdsRank: arr };
    });
  };

  const reset = () => {
    if (confirm("Clear your entire prediction?")) {
      localStorage.removeItem(STORAGE_KEY);
      setState(empty);
    }
  };

  useEffect(() => {
    const champ = state.knockout["champ-0"];
    if (champ && champ !== lastChampRef.current) {
      lastChampRef.current = champ;
      const fire = (origin: { x: number; y: number }) =>
        confetti({
          particleCount: 110,
          spread: 80,
          startVelocity: 45,
          origin,
          colors: ["#FFD700", "#EF4444", "#2563EB", "#22C55E", "#F97316"],
        });
      fire({ x: 0.2, y: 0.6 });
      fire({ x: 0.5, y: 0.5 });
      fire({ x: 0.8, y: 0.6 });
    } else if (!champ) {
      lastChampRef.current = undefined;
    }
  }, [state.knockout]);

  const champion = state.knockout["champ-0"];
  const finalists = [state.knockout["final-0"], state.knockout["final-1"]].filter(Boolean) as string[];
  const semifinalists = Array.from({ length: 4 }, (_, i) => state.knockout[`sf-${i}`]).filter(Boolean) as string[];
  const qualifiedTeams = useMemo(() => {
    const rows: { group: string; first?: string; second?: string; bestThird?: boolean }[] = [];
    GROUPS.forEach((group) => {
      rows.push({
        group,
        first: state.standings[group]?.first,
        second: state.standings[group]?.second,
        bestThird: state.thirdsRank.some((team) => groupOf(team) === group),
      });
    });
    return rows;
  }, [state.standings, state.thirdsRank]);

  const downloadPredictionPng = async () => {
    if (!isComplete || exporting) return;
    setExporting(true);
    try {
      const width = 1600;
      const height = 2200;
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas unavailable");

      const exportTime = isoNow();
      const bg = ctx.createLinearGradient(0, 0, width, height);
      bg.addColorStop(0, "#06112B");
      bg.addColorStop(0.45, "#0B1F4D");
      bg.addColorStop(1, "#5B0B2F");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);

      const glow = ctx.createRadialGradient(width * 0.8, 180, 40, width * 0.8, 180, 480);
      glow.addColorStop(0, "rgba(255, 212, 59, 0.32)");
      glow.addColorStop(1, "rgba(255, 212, 59, 0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, 500);

      ctx.fillStyle = "rgba(255,255,255,0.08)";
      for (let i = 0; i < 14; i += 1) {
        drawRoundedRect(ctx, 40 + i * 110, 1180 + (i % 2) * 16, 60, 6, 3, "rgba(255,255,255,0.08)");
      }

      let logoDrawn = false;
      if (logoAvailable) {
        try {
          const img = await loadImage(LOGO_SRC);
          ctx.drawImage(img, 70, 54, 130, 168);
          logoDrawn = true;
        } catch {
          logoDrawn = false;
        }
      }

      if (!logoDrawn) {
        drawRoundedRect(ctx, 70, 72, 118, 118, 28, "rgba(255,255,255,0.1)", "rgba(255,255,255,0.18)");
        textLine(ctx, "WC", 129, 102, { align: "center", font: '700 42px "Inter", sans-serif' });
        textLine(ctx, "2026", 129, 146, { align: "center", font: '700 28px "Inter", sans-serif', color: "#FCD34D" });
      }

      textLine(ctx, "FIFA WORLD CUP 2026™", 235, 70, {
        font: '700 28px "Inter", sans-serif',
        color: "#FCD34D",
      });
      textLine(ctx, "Tournament Prediction", 235, 112, {
        font: '800 56px "Inter", sans-serif',
      });
      wrapText(
        ctx,
        "Complete tournament prediction summary. Downloaded after the full prediction was completed in the webapp.",
        235,
        180,
        780,
        28,
        { color: "rgba(226,232,240,0.92)", font: '500 22px "Inter", sans-serif' },
      );

      drawRoundedRect(ctx, 1090, 56, 440, 184, 28, "rgba(7, 18, 44, 0.55)", "rgba(255,255,255,0.14)");
      textLine(ctx, "Predictor", 1128, 84, {
        font: '600 18px "Inter", sans-serif',
        color: "rgba(226,232,240,0.7)",
      });
      textLine(ctx, state.predictorName || "Guest Predictor", 1128, 112, {
        font: '800 34px "Inter", sans-serif',
      });
      textLine(ctx, `Updated: ${formatStamp(state.updatedAt)}`, 1128, 162, {
        font: '500 18px "Inter", sans-serif',
        color: "rgba(226,232,240,0.8)",
      });
      textLine(ctx, `Completed: ${formatStamp(state.completedAt)}`, 1128, 190, {
        font: '500 18px "Inter", sans-serif',
        color: "rgba(226,232,240,0.8)",
      });
      textLine(ctx, `Exported: ${formatStamp(exportTime)}`, 1128, 218, {
        font: '500 18px "Inter", sans-serif',
        color: "rgba(226,232,240,0.8)",
      });

      drawRoundedRect(ctx, 60, 286, 1480, 228, 34, "rgba(255,255,255,0.08)", "rgba(255,255,255,0.14)");
      textLine(ctx, "Predicted Champion", 100, 326, {
        font: '700 24px "Inter", sans-serif',
        color: "rgba(226,232,240,0.75)",
      });
      textLine(ctx, "🏆", 101, 372, { font: '700 74px "Apple Color Emoji", "Segoe UI Emoji", sans-serif' });
      textLine(ctx, `${flag(champion)} ${champion}`, 186, 380, {
        font: '800 58px "Inter", "Segoe UI Emoji", sans-serif',
        color: "#FFFFFF",
      });
      textLine(ctx, "MetLife Stadium · July 19, 2026", 188, 450, {
        font: '600 22px "Inter", sans-serif',
        color: "#FCD34D",
      });

      const summaryCard = (title: string, values: string[], x: number) => {
        drawRoundedRect(ctx, x, 332, 340, 138, 24, "rgba(7,18,44,0.58)", "rgba(255,255,255,0.12)");
        textLine(ctx, title, x + 28, 358, {
          font: '700 18px "Inter", sans-serif',
          color: "rgba(226,232,240,0.72)",
        });
        values.slice(0, 4).forEach((name, idx) => {
          textLine(ctx, `${flag(name)} ${name}`, x + 28, 390 + idx * 26, {
            font: '700 22px "Inter", "Segoe UI Emoji", sans-serif',
          });
        });
      };

      summaryCard("Finalists", finalists, 920);
      summaryCard("Semi-finalists", semifinalists, 1260);

      textLine(ctx, "Knockout Path", 72, 560, {
        font: '800 32px "Inter", sans-serif',
      });
      textLine(ctx, "Predicted winners in each knockout round", 72, 600, {
        font: '500 20px "Inter", sans-serif',
        color: "rgba(226,232,240,0.78)",
      });

      const roundDefs = [
        { title: "Round of 16", keys: Array.from({ length: 16 }, (_, i) => `r16-${i}`) },
        { title: "Quarter-finals", keys: Array.from({ length: 8 }, (_, i) => `qf-${i}`) },
        { title: "Semi-finals", keys: Array.from({ length: 4 }, (_, i) => `sf-${i}`) },
        { title: "Final", keys: Array.from({ length: 2 }, (_, i) => `final-${i}`) },
      ];

      let y = 640;
      roundDefs.forEach((round) => {
        const items = round.keys.map((key) => state.knockout[key]).filter(Boolean) as string[];
        const cols = round.title === "Round of 16" ? 2 : round.title === "Quarter-finals" ? 2 : 1;
        const cardWidth = cols === 2 ? 720 : 1480;
        const itemHeight = 36;
        const boxHeight = 72 + Math.ceil(items.length / cols) * itemHeight;
        drawRoundedRect(ctx, 60, y, 1480, boxHeight, 28, "rgba(255,255,255,0.06)", "rgba(255,255,255,0.1)");
        textLine(ctx, round.title, 88, y + 20, { font: '700 22px "Inter", sans-serif', color: "#FCD34D" });

        items.forEach((name, idx) => {
          const col = idx % cols;
          const row = Math.floor(idx / cols);
          const itemX = 88 + col * (cardWidth - 60);
          const itemY = y + 58 + row * itemHeight;
          textLine(ctx, `${idx + 1}. ${flag(name)} ${name}`, itemX, itemY, {
            font: '600 20px "Inter", "Segoe UI Emoji", sans-serif',
            color: "#F8FAFC",
          });
        });
        y += boxHeight + 20;
      });

      textLine(ctx, "Predicted Group Qualifiers", 72, y + 10, {
        font: '800 32px "Inter", sans-serif',
      });
      textLine(ctx, "Top two from each group plus marked best third-place teams", 72, y + 48, {
        font: '500 20px "Inter", sans-serif',
        color: "rgba(226,232,240,0.78)",
      });

      const gridStartY = y + 92;
      const cardW = 470;
      const cardH = 124;
      qualifiedTeams.forEach((row, idx) => {
        const col = idx % 3;
        const rowIndex = Math.floor(idx / 3);
        const x = 60 + col * 492;
        const yy = gridStartY + rowIndex * 140;
        drawRoundedRect(ctx, x, yy, cardW, cardH, 22, "rgba(7,18,44,0.52)", "rgba(255,255,255,0.1)");
        textLine(ctx, `Group ${row.group}`, x + 24, yy + 20, {
          font: '800 18px "Inter", sans-serif',
          color: "#FCD34D",
        });
        textLine(ctx, `1. ${flag(row.first)} ${row.first ?? "—"}`, x + 24, yy + 48, {
          font: '700 18px "Inter", "Segoe UI Emoji", sans-serif',
        });
        textLine(ctx, `2. ${flag(row.second)} ${row.second ?? "—"}`, x + 24, yy + 74, {
          font: '700 18px "Inter", "Segoe UI Emoji", sans-serif',
        });
        textLine(ctx, row.bestThird ? "Best 3rd-place team qualified" : "No best 3rd-place selection", x + 24, yy + 100, {
          font: '600 14px "Inter", sans-serif',
          color: row.bestThird ? "#86EFAC" : "rgba(226,232,240,0.66)",
        });
      });

      textLine(ctx, "fan26.vercel.app · Prediction exported from the World Cup Hub webapp", 800, 2148, {
        align: "center",
        font: '500 17px "Inter", sans-serif',
        color: "rgba(226,232,240,0.64)",
      });

      const link = document.createElement("a");
      const safeName = (state.predictorName || "predictor").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
      const safeChampion = (champion || "champion").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
      link.href = canvas.toDataURL("image/png");
      link.download = `wc26-prediction-${safeName || "predictor"}-${safeChampion}.png`;
      link.click();
    } catch (error) {
      console.error(error);
      alert("Unable to generate the PNG right now. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="container py-12 space-y-12">
      <div className="rounded-3xl border border-border bg-gradient-to-br from-slate-950 via-blue-950 to-rose-950 p-6 md:p-8 shadow-2xl shadow-blue-950/20">
        <div className="flex flex-col lg:flex-row gap-6 lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-4 mb-4">
              {logoAvailable ? (
                <img
                  src={LOGO_SRC}
                  alt="FIFA World Cup 2026 logo"
                  className="h-20 w-auto rounded-2xl bg-white/5 p-2"
                  onError={() => setLogoAvailable(false)}
                />
              ) : (
                <div className="h-20 w-20 rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center text-center">
                  <div>
                    <div className="text-lg font-black leading-none">WC</div>
                    <div className="text-xs font-bold text-amber-300">2026</div>
                  </div>
                </div>
              )}
              <div>
                <div className="text-xs uppercase tracking-[0.35em] text-amber-300">FIFA World Cup 2026™</div>
                <h1 className="text-4xl md:text-5xl font-bold text-white mt-2">Prediction Center</h1>
              </div>
            </div>
            <p className="text-slate-200/90 max-w-2xl">
              Build your full tournament prediction and unlock a downloadable PNG infographic.
              The image includes your predictor name, flags, predicted bracket, and timestamps once the full prediction is complete.
            </p>
          </div>

          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-black/20 p-5 backdrop-blur">
            <label className="block text-xs uppercase tracking-[0.28em] text-slate-300 mb-2">
              Predictor name
            </label>
            <input
              value={state.predictorName}
              onChange={(e) => commit((prev) => ({ ...prev, predictorName: e.target.value }))}
              placeholder="Enter predictor name"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition-colors placeholder:text-slate-400 focus:border-amber-300/60"
            />
            <div className="mt-4 space-y-2 text-sm text-slate-200/85">
              <div className="flex items-center justify-between gap-4">
                <span>Prediction progress</span>
                <span className="font-bold text-white">{progress.current}/{progress.total}</span>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-amber-300"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
              <div className="flex items-center justify-between gap-4 text-xs text-slate-300">
                <span>{progress.percent}% complete</span>
                <span>{isComplete ? "Download unlocked" : "Complete all picks to unlock PNG"}</span>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <InfoPill label="Last updated" value={formatStamp(state.updatedAt)} />
              <InfoPill label="Completed at" value={formatStamp(state.completedAt)} />
            </div>

            <button
              type="button"
              disabled={!isComplete || exporting}
              onClick={downloadPredictionPng}
              className="mt-5 w-full rounded-xl bg-amber-300 px-4 py-3 font-bold text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {exporting ? "Generating PNG..." : "Download Prediction PNG"}
            </button>
            <p className="mt-3 text-xs text-slate-300/80">
              The PNG becomes available after your full tournament prediction is completed.
            </p>
          </div>
        </div>
      </div>

      <div className="grid xl:grid-cols-[1.5fr_1fr] gap-6">
        <div className="rounded-2xl border border-border p-5 bg-card">
          <h2 className="text-2xl font-bold mb-2">Prediction Summary</h2>
          <p className="text-muted-foreground mb-5">
            A tournament-themed infographic will be downloaded when your full prediction is complete.
          </p>
          <div className="grid md:grid-cols-3 gap-4">
            <SummaryCard
              title="Champion"
              highlight
              items={champion ? [`${flag(champion)} ${champion}`] : ["Not selected yet"]}
            />
            <SummaryCard
              title="Finalists"
              items={finalists.length > 0 ? finalists.map((name) => `${flag(name)} ${name}`) : ["Pending final picks"]}
            />
            <SummaryCard
              title="Semi-finalists"
              items={semifinalists.length > 0 ? semifinalists.map((name) => `${flag(name)} ${name}`) : ["Pending semi-final picks"]}
            />
          </div>
          <div className="mt-5 rounded-2xl border border-border bg-secondary/20 p-4">
            <div className="text-xs uppercase tracking-[0.28em] text-muted-foreground mb-2">PNG contents</div>
            <ul className="grid md:grid-cols-2 gap-2 text-sm text-muted-foreground list-disc list-inside">
              <li>Predictor name and tournament timestamps</li>
              <li>World Cup themed header with logo slot</li>
              <li>Champion, finalists and semi-finalists</li>
              <li>Predicted knockout winners by round</li>
              <li>Group qualifiers with best third-place teams</li>
            </ul>
          </div>
        </div>

        <div className="rounded-2xl border border-border p-5 bg-card">
          <h2 className="text-2xl font-bold mb-2">Before you download</h2>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>Fill all 12 groups with 1st and 2nd place teams.</p>
            <p>Select and rank the 8 best third-place teams.</p>
            <p>Complete every knockout winner up to the champion.</p>
            <p>The PNG file name uses your predictor name and champion.</p>
            <p>If you place an official World Cup 2026 logo at <span className="font-semibold text-foreground">/public/wc26-logo.png</span>, it will appear in the exported image automatically.</p>
          </div>
        </div>
      </div>

      <section>
        <div className="flex items-end justify-between mb-6 flex-wrap gap-2">
          <h2 className="text-2xl md:text-3xl font-bold">Group Stage</h2>
          <div className="text-sm text-muted-foreground">
            Best third-place selections:{" "}
            <span className={`font-bold ${thirdsCount >= MAX_THIRDS ? "text-primary" : ""}`}>
              {thirdsCount}/{MAX_THIRDS}
            </span>
          </div>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {GROUPS.map((g) => {
            const teams = teamsInGroup(g);
            const picks = state.standings[g] ?? {};
            const thirdLocked = thirdsCount >= MAX_THIRDS && !picks.third;
            return (
              <div key={g} className="card-elevated rounded-2xl border border-border p-5">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs uppercase tracking-widest text-muted-foreground">Group</span>
                  <span className="font-display font-bold text-2xl gradient-text">{g}</span>
                </div>
                <div className="space-y-2">
                  {teams.map((team) => {
                    const myPos = (Object.keys(picks) as Pos[]).find((p) => picks[p] === team.name);
                    return (
                      <div key={team.slug} className="flex items-center gap-1.5 sm:gap-2">
                        <span className="text-lg sm:text-xl">{team.flag}</span>
                        <span className="flex-1 min-w-0 text-xs sm:text-sm font-medium truncate">{team.name}</span>
                        {(["first", "second", "third"] as Pos[]).map((pos) => {
                          const active = myPos === pos;
                          const taken = picks[pos] && picks[pos] !== team.name;
                          const disabled = (pos === "third" && thirdLocked && !active) || !!taken;
                          const label = pos === "first" ? "1" : pos === "second" ? "2" : "3";
                          return (
                            <button
                              key={pos}
                              type="button"
                              disabled={disabled}
                              onClick={() => pickPos(g, pos, team.name)}
                              className={[
                                "w-7 h-7 sm:w-8 sm:h-8 shrink-0 rounded-full text-[10px] sm:text-xs font-bold border transition-all",
                                active
                                  ? "bg-primary text-primary-foreground border-primary glow"
                                  : "border-border bg-secondary/40 hover:border-primary/50",
                                disabled ? "opacity-30 cursor-not-allowed" : "",
                              ].join(" ")}
                              title={
                                pos === "third" && thirdLocked && !active
                                  ? "8 third-place teams already selected"
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
          <h2 className="text-2xl md:text-3xl font-bold mb-2">Rank Your Third-Place Teams</h2>
          <p className="text-muted-foreground mb-6">
            Order them 1–8 by how strongly they finished. They auto-fill the bracket's 3rd-place slots based on the allowed groups.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {state.thirdsRank.map((name, i) => {
              const g = groupOf(name);
              const total = state.thirdsRank.length;
              return (
                <div key={name} className="card-elevated rounded-xl border border-border p-3 flex items-center gap-3">
                  <select
                    value={i + 1}
                    onChange={(e) => setThirdRank(name, Number(e.target.value))}
                    className="w-14 bg-input border border-border rounded px-2 py-1 text-sm font-bold text-primary outline-none focus:border-primary"
                    aria-label="Rank"
                  >
                    {Array.from({ length: total }, (_, k) => k + 1).map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {flag(name)} {name}
                    </div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Group {g}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-2xl md:text-3xl font-bold mb-2">Round of 16</h2>
        <p className="text-muted-foreground mb-6">
          Slots fill from your group standings and ranked third-place teams. Tap a team to pick the winner.
        </p>

        <div className="grid md:grid-cols-2 gap-4">
          {R16.map((m, i) => {
            const key = `r16-${i}`;
            const left = resolveSlot(m.left, i, "L");
            const right = resolveSlot(m.right, i, "R");
            const winner = state.knockout[key];
            return (
              <div key={key} className="card-elevated rounded-xl border border-border p-4">
                <div className="text-xs text-muted-foreground mb-2">Match {i + 1}</div>
                <SlotRow
                  slot={m.left}
                  resolved={left}
                  isWinner={winner === left && !!left}
                  onPickWinner={() => left && setKO(key, left)}
                />
                <div className="text-center text-xs text-muted-foreground my-1">vs</div>
                <SlotRow
                  slot={m.right}
                  resolved={right}
                  isWinner={winner === right && !!right}
                  onPickWinner={() => right && setKO(key, right)}
                />
              </div>
            );
          })}
        </div>

        <BracketRound
          title="Quarter-finals"
          slots={8}
          stage="qf"
          state={state}
          onPick={setKO}
          options={Array.from({ length: 16 }, (_, i) => state.knockout[`r16-${i}`]).filter(Boolean) as string[]}
          cols={4}
        />
        <BracketRound
          title="Semi-finals"
          slots={4}
          stage="sf"
          state={state}
          onPick={setKO}
          options={Array.from({ length: 8 }, (_, i) => state.knockout[`qf-${i}`]).filter(Boolean) as string[]}
          cols={4}
        />
        <BracketRound
          title="Final"
          slots={2}
          stage="final"
          state={state}
          onPick={setKO}
          options={Array.from({ length: 4 }, (_, i) => state.knockout[`sf-${i}`]).filter(Boolean) as string[]}
          cols={2}
        />
        <BracketRound
          title="Champion"
          slots={1}
          stage="champ"
          state={state}
          onPick={setKO}
          options={Array.from({ length: 2 }, (_, i) => state.knockout[`final-${i}`]).filter(Boolean) as string[]}
          cols={1}
        />

        <div className="mt-10">
          <h3 className="text-sm uppercase tracking-widest text-muted-foreground mb-3">Your Champion</h3>
          <div className="card-elevated rounded-2xl border border-primary/40 p-8 text-center glow">
            <div className={`text-6xl ${state.knockout["champ-0"] ? "animate-bounce" : ""}`}>🏆</div>
            <div className="text-3xl md:text-5xl font-bold mt-3 gradient-gold-text min-h-[1.2em]">
              {state.knockout["champ-0"]
                ? `${flag(state.knockout["champ-0"])} ${state.knockout["champ-0"]}`
                : "—"}
            </div>
            <div className="text-sm text-muted-foreground mt-3">MetLife Stadium · July 19, 2026</div>
          </div>
        </div>
      </section>
    </div>
  );
};

const InfoPill = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
    <div className="text-[10px] uppercase tracking-[0.28em] text-slate-300/80">{label}</div>
    <div className="mt-1 text-sm font-semibold text-white">{value}</div>
  </div>
);

const SummaryCard = ({ title, items, highlight = false }: { title: string; items: string[]; highlight?: boolean }) => (
  <div className={`rounded-2xl border p-4 ${highlight ? "border-primary/30 bg-primary/5" : "border-border bg-secondary/20"}`}>
    <div className="text-xs uppercase tracking-[0.28em] text-muted-foreground mb-3">{title}</div>
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item} className={`text-sm ${highlight ? "font-bold text-foreground" : "text-muted-foreground"}`}>
          {item}
        </div>
      ))}
    </div>
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
}) => {
  return (
    <button
      type="button"
      onClick={onPickWinner}
      disabled={!resolved}
      className={`w-full flex items-center gap-2 rounded-lg p-2 border text-left transition-colors ${isWinner ? "border-primary bg-primary/10" : "border-border/50 hover:border-primary/40"} disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground w-10">{slot.label}</span>
      <span className="flex-1 text-sm font-medium">
        {resolved ? `${flag(resolved)} ${resolved}` : <span className="text-muted-foreground">— pending —</span>}
      </span>
      {isWinner && <span className="text-xs text-primary">winner</span>}
    </button>
  );
};

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
}) => {
  const usedInRound = new Set(Array.from({ length: slots }, (_, i) => state.knockout[`${stage}-${i}`]).filter(Boolean) as string[]);
  const unique = Array.from(new Set(options));
  return (
    <div className="mt-8">
      <h3 className="text-sm uppercase tracking-widest text-muted-foreground mb-3">{title}</h3>
      <div
        className={`grid gap-3 ${
          cols >= 4 ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4" : cols === 2 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"
        }`}
      >
        {Array.from({ length: slots }).map((_, i) => {
          const key = `${stage}-${i}`;
          const value = state.knockout[key];
          const a = options[i * 2];
          const b = options[i * 2 + 1];
          const candidates = title === "Champion" ? unique : ([a, b].filter(Boolean) as string[]);
          return (
            <div key={key} className="card-elevated rounded-xl border border-border p-3">
              <div className="text-xs text-muted-foreground mb-2">{title === "Champion" ? "Winner" : `Match ${i + 1}`}</div>
              {candidates.length === 0 ? (
                <div className="text-xs text-muted-foreground italic px-2 py-3">— pending previous round —</div>
              ) : (
                <div className="space-y-2">
                  {candidates.map((name) => {
                    const active = value === name;
                    const taken = usedInRound.has(name) && !active;
                    return (
                      <button
                        key={name}
                        type="button"
                        disabled={taken}
                        onClick={() => onPick(key, active ? "" : name)}
                        className={[
                          "w-full flex items-center gap-2 rounded-lg p-2 border text-left transition-colors text-sm font-medium",
                          active ? "border-primary bg-primary/10 glow" : "border-border/50 hover:border-primary/40 bg-secondary/30",
                          taken ? "opacity-40 cursor-not-allowed" : "",
                        ].join(" ")}
                        title={taken ? "Already picked in this round" : undefined}
                      >
                        <span className="text-lg">{flag(name)}</span>
                        <span className="flex-1 truncate">{name}</span>
                        {active && <span className="text-[10px] text-primary uppercase tracking-widest">winner</span>}
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
};

export default Prediction;
