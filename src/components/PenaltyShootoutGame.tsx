import { useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { Play, RotateCcw, Target, TimerReset } from "lucide-react";
import { getTeamPalette } from "@/data/teamColors";

type Phase = "ready" | "countdown" | "playing" | "finished";
type ShotResult = "goal" | "save" | "miss" | null;

type Stats = {
  goals: number;
  shots: number;
  saves: number;
  misses: number;
};

type Point = {
  x: number;
  y: number;
};

type BallState = {
  active: boolean;
  start: Point;
  target: Point;
  startedAt: number;
  duration: number;
  holdUntil: number;
  result: ShotResult;
};

type PenaltyShootoutGameProps = {
  selectedTeam: string;
  opponent: string;
};

const GAME_SECONDS = 30;
const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

const initialStats: Stats = {
  goals: 0,
  shots: 0,
  saves: 0,
  misses: 0,
};

const PenaltyShootoutGame = ({
  selectedTeam,
  opponent,
}: PenaltyShootoutGameProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const countdownTimerRef = useRef<number | null>(null);
  const phaseRef = useRef<Phase>("ready");
  const statsRef = useRef<Stats>(initialStats);
  const gameStartedAtRef = useRef(0);
  const lastFrameRef = useRef(0);
  const displayedSecondRef = useRef(GAME_SECONDS);
  const keeperRef = useRef({ x: 0.5, direction: 1 });
  const pointerStartRef = useRef<Point | null>(null);
  const pointerCurrentRef = useRef<Point | null>(null);
  const ballRef = useRef<BallState>({
    active: false,
    start: { x: 0.5, y: 0.79 },
    target: { x: 0.5, y: 0.79 },
    startedAt: 0,
    duration: 430,
    holdUntil: 0,
    result: null,
  });

  const [phase, setPhase] = useState<Phase>("ready");
  const [countdown, setCountdown] = useState(3);
  const [timeLeft, setTimeLeft] = useState(GAME_SECONDS);
  const [stats, setStats] = useState<Stats>(initialStats);
  const [lastResult, setLastResult] = useState<ShotResult>(null);

  const selectedPalette = getTeamPalette(selectedTeam);
  const opponentPalette = getTeamPalette(opponent);

  const updatePhase = (next: Phase) => {
    phaseRef.current = next;
    setPhase(next);
  };

  const updateStats = (next: Stats) => {
    statsRef.current = next;
    setStats(next);
  };

  const finishGame = () => {
    if (phaseRef.current === "finished") return;
    updatePhase("finished");
    setTimeLeft(0);

    if (statsRef.current.goals > 0) {
      confetti({
        particleCount: 120,
        spread: 80,
        startVelocity: 34,
        origin: { x: 0.5, y: 0.55 },
      });
    }
  };

  const resetGame = () => {
    if (countdownTimerRef.current != null) {
      window.clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }

    updatePhase("ready");
    updateStats(initialStats);
    setCountdown(3);
    setTimeLeft(GAME_SECONDS);
    setLastResult(null);
    displayedSecondRef.current = GAME_SECONDS;
    keeperRef.current = { x: 0.5, direction: 1 };
    pointerStartRef.current = null;
    pointerCurrentRef.current = null;
    ballRef.current = {
      active: false,
      start: { x: 0.5, y: 0.79 },
      target: { x: 0.5, y: 0.79 },
      startedAt: 0,
      duration: 430,
      holdUntil: 0,
      result: null,
    };
  };

  const startGame = () => {
    resetGame();
    updatePhase("countdown");
    let value = 3;
    setCountdown(value);

    countdownTimerRef.current = window.setInterval(() => {
      value -= 1;
      if (value <= 0) {
        if (countdownTimerRef.current != null) {
          window.clearInterval(countdownTimerRef.current);
          countdownTimerRef.current = null;
        }
        gameStartedAtRef.current = performance.now();
        displayedSecondRef.current = GAME_SECONDS;
        setTimeLeft(GAME_SECONDS);
        updatePhase("playing");
        return;
      }
      setCountdown(value);
    }, 1000);
  };

  const resolveShot = (now: number) => {
    const ball = ballRef.current;
    const target = ball.target;
    const insideGoal =
      target.x >= 0.145 &&
      target.x <= 0.855 &&
      target.y >= 0.145 &&
      target.y <= 0.53;
    const keeperReach = 0.115;
    const saved =
      insideGoal &&
      Math.abs(target.x - keeperRef.current.x) <= keeperReach &&
      target.y >= 0.18 &&
      target.y <= 0.55;
    const result: ShotResult = !insideGoal ? "miss" : saved ? "save" : "goal";

    const previous = statsRef.current;
    const next: Stats = {
      goals: previous.goals + (result === "goal" ? 1 : 0),
      shots: previous.shots + 1,
      saves: previous.saves + (result === "save" ? 1 : 0),
      misses: previous.misses + (result === "miss" ? 1 : 0),
    };

    ball.active = false;
    ball.result = result;
    ball.holdUntil = now + 420;
    updateStats(next);
    setLastResult(result);

    window.setTimeout(() => {
      setLastResult((current) => (current === result ? null : current));
    }, 620);

    if (result === "goal") {
      confetti({
        particleCount: 34,
        spread: 52,
        startVelocity: 24,
        scalar: 0.72,
        origin: { x: target.x, y: clamp(target.y, 0.18, 0.55) },
      });
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const resizeCanvas = () => {
      const width = Math.max(320, canvas.clientWidth);
      const height = Math.max(420, canvas.clientHeight);
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const pixelWidth = Math.round(width * ratio);
      const pixelHeight = Math.round(height * ratio);

      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth;
        canvas.height = pixelHeight;
      }

      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      return { width, height };
    };

    const drawNet = (width: number, height: number) => {
      const left = width * 0.145;
      const top = height * 0.145;
      const goalWidth = width * 0.71;
      const goalHeight = height * 0.39;

      context.save();
      context.strokeStyle = "rgba(255,255,255,0.82)";
      context.lineWidth = 3;
      context.strokeRect(left, top, goalWidth, goalHeight);
      context.strokeStyle = "rgba(255,255,255,0.2)";
      context.lineWidth = 1;

      for (let column = 1; column < 10; column += 1) {
        const x = left + (goalWidth / 10) * column;
        context.beginPath();
        context.moveTo(x, top);
        context.lineTo(x, top + goalHeight);
        context.stroke();
      }

      for (let row = 1; row < 7; row += 1) {
        const y = top + (goalHeight / 7) * row;
        context.beginPath();
        context.moveTo(left, y);
        context.lineTo(left + goalWidth, y);
        context.stroke();
      }
      context.restore();
    };

    const drawKeeper = (width: number, height: number, now: number) => {
      const x = keeperRef.current.x * width;
      const groundY = height * 0.525;
      const bodyWidth = width * 0.075;
      const bodyHeight = height * 0.105;
      const ball = ballRef.current;
      const shotProgress = ball.active
        ? clamp((now - ball.startedAt) / ball.duration, 0, 1)
        : 0;
      const lean = ball.active && shotProgress > 0.55
        ? clamp((ball.target.x - keeperRef.current.x) * 1.5, -0.34, 0.34)
        : 0;

      context.save();
      context.translate(x, groundY - bodyHeight * 0.45);
      context.rotate(lean);

      context.strokeStyle = opponentPalette.secondary;
      context.lineWidth = Math.max(4, width * 0.014);
      context.lineCap = "round";
      context.beginPath();
      context.moveTo(-bodyWidth * 0.42, -bodyHeight * 0.1);
      context.lineTo(-bodyWidth * 1.15, bodyHeight * 0.12);
      context.moveTo(bodyWidth * 0.42, -bodyHeight * 0.1);
      context.lineTo(bodyWidth * 1.15, bodyHeight * 0.12);
      context.stroke();

      context.fillStyle = opponentPalette.primary;
      context.beginPath();
      context.roundRect(
        -bodyWidth * 0.48,
        -bodyHeight * 0.52,
        bodyWidth * 0.96,
        bodyHeight,
        bodyWidth * 0.18,
      );
      context.fill();

      context.fillStyle = opponentPalette.secondary;
      context.fillRect(-bodyWidth * 0.07, -bodyHeight * 0.5, bodyWidth * 0.14, bodyHeight * 0.95);

      context.fillStyle = opponentPalette.shorts;
      context.fillRect(-bodyWidth * 0.47, bodyHeight * 0.35, bodyWidth * 0.94, bodyHeight * 0.28);

      context.strokeStyle = "#d8a47f";
      context.lineWidth = Math.max(4, width * 0.012);
      context.beginPath();
      context.moveTo(-bodyWidth * 0.2, bodyHeight * 0.58);
      context.lineTo(-bodyWidth * 0.38, bodyHeight * 1.15);
      context.moveTo(bodyWidth * 0.2, bodyHeight * 0.58);
      context.lineTo(bodyWidth * 0.38, bodyHeight * 1.15);
      context.stroke();

      context.fillStyle = "#d8a47f";
      context.beginPath();
      context.arc(0, -bodyHeight * 0.72, bodyWidth * 0.25, 0, Math.PI * 2);
      context.fill();
      context.restore();
    };

    const drawPlayer = (width: number, height: number) => {
      const x = width * 0.5;
      const y = height * 0.96;
      const bodyWidth = width * 0.13;
      const bodyHeight = height * 0.12;

      context.save();
      context.fillStyle = selectedPalette.primary;
      context.beginPath();
      context.moveTo(x - bodyWidth * 0.55, y - bodyHeight * 0.65);
      context.lineTo(x + bodyWidth * 0.55, y - bodyHeight * 0.65);
      context.lineTo(x + bodyWidth * 0.42, y + bodyHeight * 0.25);
      context.lineTo(x - bodyWidth * 0.42, y + bodyHeight * 0.25);
      context.closePath();
      context.fill();

      context.fillStyle = selectedPalette.secondary;
      context.fillRect(x - bodyWidth * 0.07, y - bodyHeight * 0.62, bodyWidth * 0.14, bodyHeight * 0.8);

      context.fillStyle = selectedPalette.shorts;
      context.fillRect(x - bodyWidth * 0.4, y + bodyHeight * 0.18, bodyWidth * 0.8, bodyHeight * 0.28);

      context.strokeStyle = "#d8a47f";
      context.lineWidth = Math.max(5, width * 0.014);
      context.lineCap = "round";
      context.beginPath();
      context.moveTo(x - bodyWidth * 0.22, y + bodyHeight * 0.42);
      context.lineTo(x - bodyWidth * 0.34, y + bodyHeight * 0.95);
      context.moveTo(x + bodyWidth * 0.22, y + bodyHeight * 0.42);
      context.lineTo(x + bodyWidth * 0.34, y + bodyHeight * 0.95);
      context.stroke();

      context.fillStyle = "#d8a47f";
      context.beginPath();
      context.arc(x, y - bodyHeight * 0.86, bodyWidth * 0.23, 0, Math.PI * 2);
      context.fill();
      context.restore();
    };

    const drawBall = (width: number, height: number, now: number) => {
      const ball = ballRef.current;
      let position = ball.start;

      if (ball.active) {
        const rawProgress = clamp((now - ball.startedAt) / ball.duration, 0, 1);
        const eased = 1 - Math.pow(1 - rawProgress, 3);
        position = {
          x: ball.start.x + (ball.target.x - ball.start.x) * eased,
          y: ball.start.y + (ball.target.y - ball.start.y) * eased,
        };
        if (rawProgress >= 1) resolveShot(now);
      } else if (ball.holdUntil > now) {
        position = ball.target;
      }

      const x = position.x * width;
      const y = position.y * height;
      const radius = clamp(width * (ball.active ? 0.018 : 0.023), 7, 13);

      context.save();
      context.shadowColor = "rgba(0,0,0,0.35)";
      context.shadowBlur = 8;
      context.fillStyle = "#ffffff";
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fill();
      context.shadowBlur = 0;
      context.fillStyle = "#111827";
      context.beginPath();
      context.arc(x, y, radius * 0.34, 0, Math.PI * 2);
      context.fill();
      context.restore();
    };

    const drawSwipeGuide = (width: number, height: number) => {
      const start = pointerStartRef.current;
      const current = pointerCurrentRef.current;
      if (!start || !current) return;

      context.save();
      context.strokeStyle = "rgba(255,255,255,0.72)";
      context.lineWidth = 3;
      context.setLineDash([8, 7]);
      context.beginPath();
      context.moveTo(start.x, start.y);
      context.lineTo(current.x, current.y);
      context.stroke();
      context.setLineDash([]);
      context.fillStyle = "rgba(255,255,255,0.9)";
      context.beginPath();
      context.arc(current.x, current.y, 5, 0, Math.PI * 2);
      context.fill();
      context.restore();
    };

    const draw = (now: number) => {
      const { width, height } = resizeCanvas();
      const deltaSeconds = lastFrameRef.current
        ? Math.min((now - lastFrameRef.current) / 1000, 0.04)
        : 0;
      lastFrameRef.current = now;

      if (phaseRef.current === "playing" || phaseRef.current === "countdown") {
        const speed = 0.23 + statsRef.current.goals * 0.026;
        keeperRef.current.x += keeperRef.current.direction * speed * deltaSeconds;
        if (keeperRef.current.x >= 0.82) {
          keeperRef.current.x = 0.82;
          keeperRef.current.direction = -1;
        } else if (keeperRef.current.x <= 0.18) {
          keeperRef.current.x = 0.18;
          keeperRef.current.direction = 1;
        }
      }

      if (phaseRef.current === "playing") {
        const elapsed = (now - gameStartedAtRef.current) / 1000;
        const remaining = Math.max(0, GAME_SECONDS - elapsed);
        const display = Math.ceil(remaining);
        if (display !== displayedSecondRef.current) {
          displayedSecondRef.current = display;
          setTimeLeft(display);
        }
        if (remaining <= 0 && !ballRef.current.active) finishGame();
      }

      const stadiumGradient = context.createLinearGradient(0, 0, 0, height);
      stadiumGradient.addColorStop(0, "#07101c");
      stadiumGradient.addColorStop(0.42, "#14253a");
      stadiumGradient.addColorStop(0.43, "#244f35");
      stadiumGradient.addColorStop(1, "#0f6a3d");
      context.fillStyle = stadiumGradient;
      context.fillRect(0, 0, width, height);

      context.fillStyle = "rgba(0,0,0,0.34)";
      context.fillRect(0, height * 0.055, width, height * 0.15);
      for (let row = 0; row < 4; row += 1) {
        for (let column = 0; column < 34; column += 1) {
          const hue = (row * 60 + column * 17) % 360;
          context.fillStyle = `hsla(${hue} 75% 68% / 0.45)`;
          context.beginPath();
          context.arc(
            (column + 0.5) * (width / 34),
            height * (0.075 + row * 0.03),
            1.8,
            0,
            Math.PI * 2,
          );
          context.fill();
        }
      }

      context.strokeStyle = "rgba(255,255,255,0.28)";
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(width * 0.06, height);
      context.lineTo(width * 0.31, height * 0.53);
      context.moveTo(width * 0.94, height);
      context.lineTo(width * 0.69, height * 0.53);
      context.stroke();

      context.beginPath();
      context.ellipse(width * 0.5, height * 0.78, width * 0.18, height * 0.08, 0, 0, Math.PI * 2);
      context.stroke();

      drawNet(width, height);
      drawKeeper(width, height, now);
      drawPlayer(width, height);
      drawBall(width, height, now);
      drawSwipeGuide(width, height);

      animationFrameRef.current = window.requestAnimationFrame(draw);
    };

    animationFrameRef.current = window.requestAnimationFrame(draw);
    return () => {
      if (animationFrameRef.current != null) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [opponentPalette.primary, opponentPalette.secondary, opponentPalette.shorts, selectedPalette.primary, selectedPalette.secondary, selectedPalette.shorts]);

  useEffect(
    () => () => {
      if (countdownTimerRef.current != null) {
        window.clearInterval(countdownTimerRef.current);
      }
      if (animationFrameRef.current != null) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
    },
    [],
  );

  const canvasPoint = (event: React.PointerEvent<HTMLCanvasElement>): Point => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    };
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (phaseRef.current !== "playing") return;
    const ball = ballRef.current;
    if (ball.active || ball.holdUntil > performance.now()) return;

    const point = canvasPoint(event);
    pointerStartRef.current = point;
    pointerCurrentRef.current = point;
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!pointerStartRef.current) return;
    pointerCurrentRef.current = canvasPoint(event);
    event.preventDefault();
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const start = pointerStartRef.current;
    const end = pointerCurrentRef.current ?? canvasPoint(event);
    pointerStartRef.current = null;
    pointerCurrentRef.current = null;

    if (!start || phaseRef.current !== "playing") return;
    const verticalTravel = start.y - end.y;
    const totalTravel = Math.hypot(end.x - start.x, end.y - start.y);
    if (verticalTravel < 28 || totalTravel < 42) return;

    const bounds = event.currentTarget.getBoundingClientRect();
    ballRef.current = {
      active: true,
      start: { x: 0.5, y: 0.79 },
      target: {
        x: clamp(end.x / bounds.width, 0.04, 0.96),
        y: clamp(end.y / bounds.height, 0.1, 0.68),
      },
      startedAt: performance.now(),
      duration: clamp(520 - totalTravel * 0.45, 300, 470),
      holdUntil: 0,
      result: null,
    };
    event.preventDefault();
  };

  const accuracy = stats.shots > 0 ? Math.round((stats.goals / stats.shots) * 100) : 0;
  const resultLabel = lastResult === "goal" ? "GOAL" : lastResult === "save" ? "SAVED" : lastResult === "miss" ? "MISS" : null;

  return (
    <div className="overflow-hidden rounded-3xl border border-border card-elevated">
      <div className="grid grid-cols-3 border-b border-border bg-secondary/35 text-center">
        <div className="p-3 sm:p-4">
          <div className="text-[9px] uppercase tracking-widest text-muted-foreground">Time</div>
          <div className={`mt-1 font-mono text-2xl font-black tabular-nums ${timeLeft <= 5 && phase === "playing" ? "text-red-500" : "text-primary"}`}>
            {timeLeft}
          </div>
        </div>
        <div className="border-x border-border p-3 sm:p-4">
          <div className="text-[9px] uppercase tracking-widest text-muted-foreground">Goals</div>
          <div className="mt-1 font-mono text-2xl font-black tabular-nums">{stats.goals}</div>
        </div>
        <div className="p-3 sm:p-4">
          <div className="text-[9px] uppercase tracking-widest text-muted-foreground">Shots</div>
          <div className="mt-1 font-mono text-2xl font-black tabular-nums">{stats.shots}</div>
        </div>
      </div>

      <div className="relative h-[500px] min-h-[500px] sm:h-[620px]">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={() => {
            pointerStartRef.current = null;
            pointerCurrentRef.current = null;
          }}
          className="h-full w-full select-none touch-none"
          aria-label="Penalty shootout game. Swipe upward toward the goal to shoot."
        />

        {phase === "ready" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/45 p-6 backdrop-blur-[2px]">
            <div className="max-w-sm rounded-3xl border border-white/15 bg-background/90 p-6 text-center shadow-2xl">
              <Target className="mx-auto h-9 w-9 text-primary" />
              <h2 className="mt-3 text-2xl font-black">30 Second Challenge</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Swipe from the ball toward your target. The goalkeeper moves faster after every goal.
              </p>
              <button
                type="button"
                onClick={startGame}
                className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 font-bold text-primary-foreground transition-transform hover:scale-[1.02]"
              >
                <Play className="h-4 w-4" /> Start Game
              </button>
            </div>
          </div>
        )}

        {phase === "countdown" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <div className="font-mono text-8xl font-black text-white drop-shadow-2xl">{countdown}</div>
          </div>
        )}

        {phase === "playing" && resultLabel && (
          <div className={`pointer-events-none absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2 rounded-full px-5 py-2 font-black tracking-widest text-white shadow-2xl ${lastResult === "goal" ? "bg-emerald-500" : lastResult === "save" ? "bg-amber-500" : "bg-red-500"}`}>
            {resultLabel}
          </div>
        )}

        {phase === "playing" && (
          <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-4 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur">
            Swipe upward toward the goal
          </div>
        )}

        {phase === "finished" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 p-5 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl border border-white/15 bg-background/95 p-6 text-center shadow-2xl">
              <TimerReset className="mx-auto h-9 w-9 text-primary" />
              <div className="mt-2 text-xs uppercase tracking-[0.22em] text-primary">Time up</div>
              <div className="mt-2 text-5xl font-black">{stats.goals}</div>
              <div className="text-sm text-muted-foreground">goals in 30 seconds</div>

              <div className="mt-5 grid grid-cols-3 gap-2">
                <div className="rounded-xl border border-border bg-secondary/40 p-3">
                  <div className="font-mono text-lg font-black">{stats.saves}</div>
                  <div className="text-[9px] uppercase text-muted-foreground">Saved</div>
                </div>
                <div className="rounded-xl border border-border bg-secondary/40 p-3">
                  <div className="font-mono text-lg font-black">{stats.misses}</div>
                  <div className="text-[9px] uppercase text-muted-foreground">Missed</div>
                </div>
                <div className="rounded-xl border border-border bg-secondary/40 p-3">
                  <div className="font-mono text-lg font-black">{accuracy}%</div>
                  <div className="text-[9px] uppercase text-muted-foreground">Accuracy</div>
                </div>
              </div>

              <button
                type="button"
                onClick={startGame}
                className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 font-bold text-primary-foreground transition-transform hover:scale-[1.02]"
              >
                <RotateCcw className="h-4 w-4" /> Play Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PenaltyShootoutGame;
