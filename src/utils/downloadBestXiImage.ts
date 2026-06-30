import type {
  FormationDefinition,
  FormationSlot,
  WorldCupManager,
  WorldCupPlayer,
} from "@/types/fanProfile";

type StarterExport = {
  slot: FormationSlot;
  player: WorldCupPlayer;
};

type DownloadBestXiInput = {
  name: string;
  formation: FormationDefinition;
  starters: StarterExport[];
  substitutes: WorldCupPlayer[];
  manager: WorldCupManager;
};

const WIDTH = 1600;
const HEIGHT = 2000;
const FONT = 'Inter, Arial, sans-serif';

const roundedRect = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) => {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.arcTo(x + width, y, x + width, y + height, safeRadius);
  context.arcTo(x + width, y + height, x, y + height, safeRadius);
  context.arcTo(x, y + height, x, y, safeRadius);
  context.arcTo(x, y, x + width, y, safeRadius);
  context.closePath();
};

const truncateText = (
  context: CanvasRenderingContext2D,
  value: string,
  maxWidth: number,
) => {
  if (context.measureText(value).width <= maxWidth) return value;

  let text = value;
  while (text.length > 1 && context.measureText(`${text}…`).width > maxWidth) {
    text = text.slice(0, -1);
  }
  return `${text}…`;
};

const initials = (value: string) => {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "XI";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
};

const countryCode = (value: string) => {
  const words = value
    .replace(/[^A-Za-z ]/g, "")
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return value.slice(0, 3).toUpperCase();
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words.map((word) => word[0]).join("").slice(0, 3).toUpperCase();
};

const drawPitch = (
  context: CanvasRenderingContext2D,
  pitch: { x: number; y: number; width: number; height: number },
) => {
  const { x, y, width, height } = pitch;
  const fieldGradient = context.createLinearGradient(x, y, x + width, y + height);
  fieldGradient.addColorStop(0, "#16714b");
  fieldGradient.addColorStop(0.5, "#0f5e3d");
  fieldGradient.addColorStop(1, "#0a462f");

  roundedRect(context, x, y, width, height, 42);
  context.fillStyle = fieldGradient;
  context.fill();

  context.save();
  roundedRect(context, x, y, width, height, 42);
  context.clip();
  for (let index = 0; index < 10; index += 1) {
    if (index % 2 === 0) {
      context.fillStyle = "rgba(255,255,255,0.025)";
      context.fillRect(x + (index * width) / 10, y, width / 10, height);
    }
  }
  context.restore();

  context.strokeStyle = "rgba(255,255,255,0.58)";
  context.lineWidth = 5;
  roundedRect(context, x + 24, y + 24, width - 48, height - 48, 26);
  context.stroke();

  const middleY = y + height / 2;
  context.beginPath();
  context.moveTo(x + 24, middleY);
  context.lineTo(x + width - 24, middleY);
  context.stroke();

  context.beginPath();
  context.arc(x + width / 2, middleY, 128, 0, Math.PI * 2);
  context.stroke();
  context.fillStyle = "rgba(255,255,255,0.7)";
  context.beginPath();
  context.arc(x + width / 2, middleY, 7, 0, Math.PI * 2);
  context.fill();

  const penaltyWidth = width * 0.46;
  const penaltyHeight = 190;
  const sixWidth = width * 0.22;
  const sixHeight = 78;

  context.strokeRect(x + (width - penaltyWidth) / 2, y + 24, penaltyWidth, penaltyHeight);
  context.strokeRect(x + (width - sixWidth) / 2, y + 24, sixWidth, sixHeight);
  context.strokeRect(
    x + (width - penaltyWidth) / 2,
    y + height - 24 - penaltyHeight,
    penaltyWidth,
    penaltyHeight,
  );
  context.strokeRect(
    x + (width - sixWidth) / 2,
    y + height - 24 - sixHeight,
    sixWidth,
    sixHeight,
  );

  context.beginPath();
  context.arc(x + width / 2, y + 144, 7, 0, Math.PI * 2);
  context.arc(x + width / 2, y + height - 144, 7, 0, Math.PI * 2);
  context.fill();
};

const drawStarter = (
  context: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  slot: FormationSlot,
  player: WorldCupPlayer,
) => {
  const width = 232;
  const height = 104;
  const x = centerX - width / 2;
  const y = centerY - height / 2;

  context.save();
  context.shadowColor = "rgba(0,0,0,0.35)";
  context.shadowBlur = 18;
  context.shadowOffsetY = 8;
  roundedRect(context, x, y, width, height, 22);
  context.fillStyle = "rgba(5,20,17,0.92)";
  context.fill();
  context.restore();

  roundedRect(context, x, y, width, height, 22);
  context.strokeStyle = "rgba(249,199,79,0.78)";
  context.lineWidth = 2;
  context.stroke();

  context.fillStyle = "#f9c74f";
  context.font = `800 18px ${FONT}`;
  context.textAlign = "left";
  context.fillText(slot.label, x + 16, y + 28);

  context.fillStyle = "rgba(255,255,255,0.62)";
  context.textAlign = "right";
  context.font = `700 15px ${FONT}`;
  context.fillText(countryCode(player.teamName), x + width - 16, y + 28);

  context.fillStyle = "#ffffff";
  context.textAlign = "center";
  context.font = `800 25px ${FONT}`;
  context.fillText(
    truncateText(context, player.name, width - 26),
    centerX,
    y + 64,
  );

  context.fillStyle = "rgba(255,255,255,0.7)";
  context.font = `600 16px ${FONT}`;
  context.fillText(
    truncateText(context, player.teamName, width - 28),
    centerX,
    y + 89,
  );
};

const drawBenchPlayer = (
  context: CanvasRenderingContext2D,
  player: WorldCupPlayer,
  index: number,
  x: number,
  y: number,
  width: number,
) => {
  const height = 88;
  roundedRect(context, x, y, width, height, 18);
  context.fillStyle = "rgba(255,255,255,0.055)";
  context.fill();
  context.strokeStyle = "rgba(255,255,255,0.1)";
  context.lineWidth = 2;
  context.stroke();

  context.fillStyle = "#f9c74f";
  context.font = `800 18px ${FONT}`;
  context.textAlign = "left";
  context.fillText(String(index + 1).padStart(2, "0"), x + 18, y + 34);

  context.fillStyle = "#ffffff";
  context.font = `800 22px ${FONT}`;
  context.fillText(
    truncateText(context, player.name, width - 145),
    x + 62,
    y + 34,
  );

  context.fillStyle = "rgba(255,255,255,0.64)";
  context.font = `600 15px ${FONT}`;
  context.fillText(
    truncateText(
      context,
      `${player.position} · ${player.teamName}`,
      width - 82,
    ),
    x + 62,
    y + 63,
  );
};

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
};

const safeFilename = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "best-xi";

export const downloadBestXiImage = async ({
  name,
  formation,
  starters,
  substitutes,
  manager,
}: DownloadBestXiInput) => {
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }

  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Image export is not supported in this browser.");

  const background = context.createLinearGradient(0, 0, WIDTH, HEIGHT);
  background.addColorStop(0, "#071613");
  background.addColorStop(0.52, "#0b211b");
  background.addColorStop(1, "#06100e");
  context.fillStyle = background;
  context.fillRect(0, 0, WIDTH, HEIGHT);

  context.fillStyle = "rgba(249,199,79,0.12)";
  context.beginPath();
  context.arc(1460, 80, 260, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "rgba(34,197,94,0.08)";
  context.beginPath();
  context.arc(90, 1920, 320, 0, Math.PI * 2);
  context.fill();

  context.textAlign = "left";
  context.fillStyle = "#f9c74f";
  context.font = `800 22px ${FONT}`;
  context.fillText("FAN26 · WORLD CUP 2026", 90, 78);

  context.fillStyle = "#ffffff";
  context.font = `900 58px ${FONT}`;
  context.fillText(
    truncateText(context, name.trim() || "My Best XI", 1100),
    90,
    150,
  );

  roundedRect(context, 1260, 86, 250, 82, 28);
  context.fillStyle = "rgba(249,199,79,0.14)";
  context.fill();
  context.strokeStyle = "rgba(249,199,79,0.55)";
  context.lineWidth = 2;
  context.stroke();
  context.fillStyle = "#f9c74f";
  context.textAlign = "center";
  context.font = `900 30px ${FONT}`;
  context.fillText(formation.name, 1385, 137);

  const pitch = { x: 90, y: 220, width: 1420, height: 1050 };
  drawPitch(context, pitch);

  for (const { slot, player } of starters) {
    const centerX = pitch.x + (slot.x / 100) * pitch.width;
    const centerY = pitch.y + (slot.y / 100) * pitch.height;
    drawStarter(context, centerX, centerY, slot, player);
  }

  context.textAlign = "left";
  context.fillStyle = "#f9c74f";
  context.font = `800 19px ${FONT}`;
  context.fillText("TEAM STAFF", 90, 1350);
  context.fillText("SUBSTITUTES", 555, 1350);

  roundedRect(context, 90, 1382, 420, 184, 28);
  context.fillStyle = "rgba(255,255,255,0.055)";
  context.fill();
  context.strokeStyle = "rgba(249,199,79,0.36)";
  context.lineWidth = 2;
  context.stroke();

  context.fillStyle = "#f9c74f";
  context.font = `900 44px ${FONT}`;
  context.textAlign = "center";
  context.fillText(initials(manager.name), 155, 1476);

  context.textAlign = "left";
  context.fillStyle = "rgba(255,255,255,0.55)";
  context.font = `700 15px ${FONT}`;
  context.fillText("MANAGER", 218, 1432);
  context.fillStyle = "#ffffff";
  context.font = `900 26px ${FONT}`;
  context.fillText(
    truncateText(context, manager.name, 260),
    218,
    1474,
  );
  context.fillStyle = "rgba(255,255,255,0.68)";
  context.font = `600 17px ${FONT}`;
  context.fillText(
    truncateText(context, manager.teamName, 260),
    218,
    1510,
  );

  roundedRect(context, 90, 1594, 420, 244, 28);
  context.fillStyle = "rgba(255,255,255,0.035)";
  context.fill();
  context.fillStyle = "#ffffff";
  context.textAlign = "left";
  context.font = `900 26px ${FONT}`;
  context.fillText("GAME PLAN", 122, 1640);
  context.fillStyle = "rgba(255,255,255,0.65)";
  context.font = `600 18px ${FONT}`;
  context.fillText(`Formation  ${formation.name}`, 122, 1690);
  context.fillText("Starting XI  11 players", 122, 1730);
  context.fillText("Bench  8 substitutes", 122, 1770);
  context.fillText(`Coach  ${manager.name}`, 122, 1810);

  const benchX = 555;
  const benchY = 1382;
  const benchGap = 18;
  const benchWidth = 458;
  const rowGap = 102;

  substitutes.forEach((player, index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    drawBenchPlayer(
      context,
      player,
      index,
      benchX + column * (benchWidth + benchGap),
      benchY + row * rowGap,
      benchWidth,
    );
  });

  context.fillStyle = "rgba(255,255,255,0.36)";
  context.textAlign = "left";
  context.font = `600 16px ${FONT}`;
  context.fillText("Built on Fan26", 90, 1935);
  context.textAlign = "right";
  context.fillText(
    new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date()),
    1510,
    1935,
  );

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => {
      if (value) resolve(value);
      else reject(new Error("Could not create the team image."));
    }, "image/png");
  });

  downloadBlob(blob, `${safeFilename(name)}-gameplan.png`);
};
