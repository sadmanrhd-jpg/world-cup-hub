// High-quality SVG football jersey, colored from a description string
// (e.g. "Red & White stripes", "Yellow & Blue", "Sky Blue").

const COLOR_MAP: Record<string, string> = {
  red: "#D7263D",
  white: "#F2F2F2",
  black: "#1A1A1A",
  blue: "#1D3FA8",
  navy: "#0B1A4A",
  yellow: "#F4C430",
  gold: "#D4A017",
  green: "#1E8E3E",
  orange: "#F58220",
  pink: "#E94E94",
  purple: "#5B2A86",
  maroon: "#6E1423",
  "sky blue": "#7EC8E3",
  sky: "#7EC8E3",
};

const pickColors = (desc: string) => {
  const d = desc.toLowerCase();
  const found: string[] = [];
  const keys = Object.keys(COLOR_MAP).sort((a, b) => b.length - a.length);
  for (const k of keys) {
    if (d.includes(k) && !found.includes(COLOR_MAP[k])) found.push(COLOR_MAP[k]);
  }
  let pattern: "stripes" | "checks" | undefined;
  if (d.includes("stripe")) pattern = "stripes";
  if (d.includes("check")) pattern = "checks";
  return {
    primary: found[0] ?? "#3B3B3B",
    secondary: found[1] ?? null,
    pattern,
  };
};

// Brightness for adaptive contrast on numbers / collar
const isLight = (hex: string) => {
  const c = hex.replace("#", "");
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 160;
};

const Jersey = ({
  description,
  label,
  number = 10,
  teamShort,
}: {
  description: string;
  label: string;
  number?: number;
  teamShort?: string;
}) => {
  const { primary, secondary, pattern } = pickColors(description);
  const sec = secondary ?? primary;
  const numFill = pattern || isLight(primary) ? "#101010" : "#FFFFFF";
  const id = label.replace(/\s+/g, "-").toLowerCase();

  return (
    <div className="group flex flex-col items-center gap-3">
      <div className="relative w-full max-w-[200px] aspect-[4/5] flex items-center justify-center">
        <div
          className="absolute inset-x-6 bottom-2 h-3 rounded-full blur-md opacity-60"
          style={{ background: primary }}
        />
        <svg
          viewBox="0 0 240 280"
          className="relative w-full h-full transition-transform duration-300 group-hover:-translate-y-1 drop-shadow-2xl"
        >
          <defs>
            <linearGradient id={`shade-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(255,255,255,0.18)" />
              <stop offset="55%" stopColor="rgba(255,255,255,0)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0.35)" />
            </linearGradient>
            <linearGradient id={`sleeveShade-${id}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="rgba(255,255,255,0.2)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0.3)" />
            </linearGradient>
            {pattern === "stripes" && (
              <pattern id={`stripes-${id}`} width="22" height="22" patternUnits="userSpaceOnUse">
                <rect width="22" height="22" fill={primary} />
                <rect x="11" width="11" height="22" fill={sec} />
              </pattern>
            )}
            {pattern === "checks" && (
              <pattern id={`checks-${id}`} width="28" height="28" patternUnits="userSpaceOnUse">
                <rect width="28" height="28" fill={primary} />
                <rect width="14" height="14" fill={sec} />
                <rect x="14" y="14" width="14" height="14" fill={sec} />
              </pattern>
            )}
            <filter id={`fab-${id}`}>
              <feTurbulence baseFrequency="0.9" numOctaves="2" seed="3" />
              <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.05 0" />
              <feComposite in2="SourceGraphic" operator="in" />
            </filter>
          </defs>

          {/* Sleeves (behind body) */}
          <path
            d="M40 50 Q22 70 18 110 L48 122 Q56 92 70 78 Z"
            fill={sec}
          />
          <path
            d="M40 50 Q22 70 18 110 L48 122 Q56 92 70 78 Z"
            fill={`url(#sleeveShade-${id})`}
          />
          <path
            d="M200 50 Q218 70 222 110 L192 122 Q184 92 170 78 Z"
            fill={sec}
          />
          <path
            d="M200 50 Q218 70 222 110 L192 122 Q184 92 170 78 Z"
            fill={`url(#sleeveShade-${id})`}
          />

          {/* Body */}
          <path
            d="M70 78
               Q90 50 100 42
               Q120 60 140 42
               Q150 50 170 78
               L172 250
               Q120 268 68 250
               Z"
            fill={
              pattern === "stripes"
                ? `url(#stripes-${id})`
                : pattern === "checks"
                  ? `url(#checks-${id})`
                  : primary
            }
            stroke="rgba(0,0,0,0.5)"
            strokeWidth="1.2"
          />
          {/* Body shading overlay */}
          <path
            d="M70 78 Q90 50 100 42 Q120 60 140 42 Q150 50 170 78 L172 250 Q120 268 68 250 Z"
            fill={`url(#shade-${id})`}
          />
          {/* Fabric texture */}
          <path
            d="M70 78 Q90 50 100 42 Q120 60 140 42 Q150 50 170 78 L172 250 Q120 268 68 250 Z"
            filter={`url(#fab-${id})`}
            opacity="0.6"
          />

          {/* Side seams */}
          <path d="M70 78 L68 250" stroke="rgba(0,0,0,0.25)" strokeWidth="0.8" fill="none" />
          <path d="M170 78 L172 250" stroke="rgba(0,0,0,0.25)" strokeWidth="0.8" fill="none" />

          {/* Collar V */}
          <path
            d="M100 42 Q120 70 140 42 L132 52 Q120 62 108 52 Z"
            fill={sec}
            stroke="rgba(0,0,0,0.45)"
            strokeWidth="1"
          />
          <path
            d="M108 52 Q120 60 132 52"
            stroke="rgba(255,255,255,0.25)"
            strokeWidth="1"
            fill="none"
          />

          {/* Sleeve cuffs */}
          <path d="M22 108 Q33 122 50 122 L48 130 Q30 130 18 116 Z" fill={primary} opacity="0.85" />
          <path d="M218 108 Q207 122 190 122 L192 130 Q210 130 222 116 Z" fill={primary} opacity="0.85" />

          {/* Hem */}
          <path d="M68 250 Q120 268 172 250 L172 256 Q120 274 68 256 Z" fill="rgba(0,0,0,0.25)" />

          {/* Crest (left chest) */}
          <g transform="translate(82,92)">
            <path
              d="M0 0 L20 0 L20 16 Q10 26 0 16 Z"
              fill={sec}
              stroke="rgba(0,0,0,0.5)"
              strokeWidth="0.8"
            />
            {teamShort && (
              <text
                x="10"
                y="12"
                textAnchor="middle"
                fontSize="9"
                fontWeight="800"
                fill={isLight(sec) ? "#101010" : "#FFFFFF"}
                fontFamily="system-ui, sans-serif"
              >
                {teamShort}
              </text>
            )}
          </g>

          {/* Brand stripe (right chest) */}
          <g transform="translate(150,96)" opacity="0.9">
            <rect width="14" height="3" rx="1" fill={isLight(primary) ? "#101010" : "#FFFFFF"} opacity="0.6" />
            <rect y="5" width="10" height="3" rx="1" fill={isLight(primary) ? "#101010" : "#FFFFFF"} opacity="0.6" />
          </g>

          {/* Number */}
          <text
            x="120"
            y="200"
            textAnchor="middle"
            fontSize="84"
            fontWeight="900"
            fill={numFill}
            stroke="rgba(0,0,0,0.35)"
            strokeWidth="1.2"
            fontFamily="'Arial Black', system-ui, sans-serif"
            letterSpacing="-2"
          >
            {number}
          </text>
        </svg>
      </div>
      <div className="text-center">
        <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
        <div className="text-sm font-medium mt-0.5">{description}</div>
      </div>
    </div>
  );
};

export default Jersey;
