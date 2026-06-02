// Modern, premium SVG football jersey rendered from a description string.

const COLOR_MAP: Record<string, string> = {
  red: "#D7263D",
  white: "#F5F5F5",
  black: "#141414",
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
  let pattern: "stripes" | "checks" | "hoops" | "sash" | undefined;
  if (d.includes("stripe")) pattern = "stripes";
  else if (d.includes("check")) pattern = "checks";
  else if (d.includes("hoop")) pattern = "hoops";
  else if (d.includes("sash")) pattern = "sash";
  return {
    primary: found[0] ?? "#2E2E2E",
    secondary: found[1] ?? null,
    pattern,
  };
};

const isLight = (hex: string) => {
  const c = hex.replace("#", "");
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 160;
};

const shade = (hex: string, amt: number) => {
  const c = hex.replace("#", "");
  const r = Math.max(0, Math.min(255, parseInt(c.slice(0, 2), 16) + amt));
  const g = Math.max(0, Math.min(255, parseInt(c.slice(2, 4), 16) + amt));
  const b = Math.max(0, Math.min(255, parseInt(c.slice(4, 6), 16) + amt));
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
};

const Jersey = ({
  description,
  label,
  number = 10,
  teamShort,
  playerName,
  imageUrl,
  imageAlt,
}: {
  description: string;
  label: string;
  number?: number;
  teamShort?: string;
  playerName?: string;
  imageUrl?: string;
  imageAlt?: string;
}) => {
  if (imageUrl) {
    return (
      <div className="group flex flex-col items-center gap-3 sm:gap-4 w-full">
        <div className="relative w-full aspect-square overflow-hidden rounded-2xl border border-border/60 bg-secondary/40">
          <img
            src={imageUrl}
            alt={imageAlt ?? `${label} kit`}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        </div>
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">{label} Kit</div>
          <div className="text-sm font-medium mt-1">{description}</div>
        </div>
      </div>
    );
  }
  const { primary, secondary, pattern } = pickColors(description);
  const sec = secondary ?? shade(primary, -40);
  const numFill = isLight(primary) ? "#0A0A0A" : "#FFFFFF";
  const id = label.replace(/\s+/g, "-").toLowerCase();
  const bodyFill = pattern
    ? `url(#pat-${id})`
    : `url(#bodyGrad-${id})`;

  return (
    <div className="group flex flex-col items-center gap-4">
      <div className="relative w-full aspect-[4/5] flex items-center justify-center">
        {/* Soft floor shadow */}
        <div
          className="absolute inset-x-10 bottom-3 h-4 rounded-full blur-xl opacity-50"
          style={{ background: shade(primary, -60) }}
        />
        <svg
          viewBox="0 0 240 280"
          className="relative w-full h-full transition-transform duration-500 group-hover:-translate-y-2 group-hover:rotate-[-1deg] drop-shadow-[0_25px_25px_rgba(0,0,0,0.45)]"
        >
          <defs>
            <linearGradient id={`bodyGrad-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={shade(primary, 30)} />
              <stop offset="50%" stopColor={primary} />
              <stop offset="100%" stopColor={shade(primary, -45)} />
            </linearGradient>
            <linearGradient id={`sleeveGrad-${id}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={shade(sec, 20)} />
              <stop offset="100%" stopColor={shade(sec, -40)} />
            </linearGradient>
            <linearGradient id={`gloss-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(255,255,255,0.35)" />
              <stop offset="40%" stopColor="rgba(255,255,255,0)" />
            </linearGradient>
            <linearGradient id={`shade-${id}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="rgba(0,0,0,0)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0.45)" />
            </linearGradient>

            {pattern === "stripes" && (
              <pattern id={`pat-${id}`} width="20" height="20" patternUnits="userSpaceOnUse">
                <rect width="20" height="20" fill={primary} />
                <rect x="10" width="10" height="20" fill={sec} />
              </pattern>
            )}
            {pattern === "checks" && (
              <pattern id={`pat-${id}`} width="26" height="26" patternUnits="userSpaceOnUse">
                <rect width="26" height="26" fill={primary} />
                <rect width="13" height="13" fill={sec} />
                <rect x="13" y="13" width="13" height="13" fill={sec} />
              </pattern>
            )}
            {pattern === "hoops" && (
              <pattern id={`pat-${id}`} width="20" height="32" patternUnits="userSpaceOnUse">
                <rect width="20" height="32" fill={primary} />
                <rect y="16" width="20" height="16" fill={sec} />
              </pattern>
            )}
            {pattern === "sash" && (
              <pattern id={`pat-${id}`} width="240" height="280" patternUnits="userSpaceOnUse">
                <rect width="240" height="280" fill={primary} />
                <path d="M60 60 L200 240 L170 260 L40 90 Z" fill={sec} />
              </pattern>
            )}

            <filter id={`fab-${id}`}>
              <feTurbulence baseFrequency="1.2" numOctaves="2" seed="5" />
              <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.06 0" />
              <feComposite in2="SourceGraphic" operator="in" />
            </filter>
          </defs>

          {/* Sleeves */}
          <path d="M40 50 Q18 72 14 116 L46 130 Q56 96 70 80 Z" fill={`url(#sleeveGrad-${id})`} />
          <path d="M200 50 Q222 72 226 116 L194 130 Q184 96 170 80 Z" fill={`url(#sleeveGrad-${id})`} />

          {/* Body */}
          <path
            d="M70 80
               Q90 50 100 42
               Q120 64 140 42
               Q150 50 170 80
               L176 252
               Q120 272 64 252
               Z"
            fill={bodyFill}
            stroke="rgba(0,0,0,0.55)"
            strokeWidth="1.2"
          />
          {/* Gloss highlight */}
          <path
            d="M70 80 Q90 50 100 42 Q120 64 140 42 Q150 50 170 80 L176 252 Q120 272 64 252 Z"
            fill={`url(#gloss-${id})`}
          />
          {/* Right-side shading */}
          <path
            d="M70 80 Q90 50 100 42 Q120 64 140 42 Q150 50 170 80 L176 252 Q120 272 64 252 Z"
            fill={`url(#shade-${id})`}
          />
          {/* Fabric noise */}
          <path
            d="M70 80 Q90 50 100 42 Q120 64 140 42 Q150 50 170 80 L176 252 Q120 272 64 252 Z"
            filter={`url(#fab-${id})`}
            opacity="0.7"
          />

          {/* Side seams */}
          <path d="M70 82 L66 252" stroke="rgba(0,0,0,0.28)" strokeWidth="0.8" fill="none" />
          <path d="M170 82 L176 252" stroke="rgba(0,0,0,0.28)" strokeWidth="0.8" fill="none" />

          {/* V-collar */}
          <path
            d="M100 42 Q120 72 140 42 L132 54 Q120 64 108 54 Z"
            fill={sec}
            stroke="rgba(0,0,0,0.5)"
            strokeWidth="1"
          />
          <path d="M108 54 Q120 62 132 54" stroke="rgba(255,255,255,0.3)" strokeWidth="1" fill="none" />

          {/* Sleeve cuff bands */}
          <path d="M16 114 Q33 130 50 130 L48 138 Q28 138 14 122 Z" fill={primary} opacity="0.95" />
          <path d="M224 114 Q207 130 190 130 L192 138 Q212 138 226 122 Z" fill={primary} opacity="0.95" />
          <path d="M18 122 Q34 134 49 134" stroke={sec} strokeWidth="1.2" fill="none" opacity="0.9" />
          <path d="M222 122 Q206 134 191 134" stroke={sec} strokeWidth="1.2" fill="none" opacity="0.9" />

          {/* Hem trim */}
          <path d="M64 252 Q120 272 176 252 L176 258 Q120 278 64 258 Z" fill="rgba(0,0,0,0.3)" />
          <path d="M64 254 Q120 270 176 254" stroke={sec} strokeWidth="1.2" fill="none" opacity="0.7" />

          {/* Crest (left chest) */}
          <g transform="translate(80,92)">
            <path d="M0 0 L22 0 L22 18 Q11 30 0 18 Z" fill={sec} stroke="rgba(0,0,0,0.55)" strokeWidth="0.8" />
            <path d="M2 2 L20 2 L20 17 Q11 27 2 17 Z" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="0.5" />
            {teamShort && (
              <text
                x="11"
                y="14"
                textAnchor="middle"
                fontSize="10"
                fontWeight="800"
                fill={isLight(sec) ? "#0A0A0A" : "#FFFFFF"}
                fontFamily="system-ui, sans-serif"
              >
                {teamShort}
              </text>
            )}
          </g>

          {/* Brand stripes (right chest) */}
          <g transform="translate(150,98)" opacity="0.85">
            <rect width="16" height="3" rx="1.5" fill={isLight(primary) ? "#0A0A0A" : "#FFFFFF"} />
            <rect y="6" width="12" height="3" rx="1.5" fill={isLight(primary) ? "#0A0A0A" : "#FFFFFF"} />
            <rect y="12" width="8" height="3" rx="1.5" fill={isLight(primary) ? "#0A0A0A" : "#FFFFFF"} />
          </g>

          {/* Player name (small, above number) */}
          {playerName && (
            <text
              x="120"
              y="148"
              textAnchor="middle"
              fontSize="11"
              fontWeight="700"
              fill={numFill}
              opacity="0.9"
              letterSpacing="3"
              fontFamily="system-ui, sans-serif"
            >
              {playerName.toUpperCase()}
            </text>
          )}

          {/* Number */}
          <text
            x="120"
            y="218"
            textAnchor="middle"
            fontSize="92"
            fontWeight="900"
            fill={numFill}
            stroke="rgba(0,0,0,0.4)"
            strokeWidth="1.2"
            fontFamily="'Arial Black', system-ui, sans-serif"
            letterSpacing="-3"
          >
            {number}
          </text>
        </svg>
      </div>
      <div className="text-center">
        <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">{label} Kit</div>
        <div className="text-sm font-medium mt-1">{description}</div>
      </div>
    </div>
  );
};

export default Jersey;
