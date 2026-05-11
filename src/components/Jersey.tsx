// SVG jersey illustration colored by description string (e.g. "Red & White stripes")
// Renders an actual football shirt shape rather than a flat swatch.

const COLOR_MAP: Record<string, string> = {
  red: "#D7263D",
  white: "#F5F5F5",
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
  "sky": "#7EC8E3",
};

const pickColors = (desc: string): { primary: string; secondary?: string; pattern?: "stripes" | "checks" } => {
  const d = desc.toLowerCase();
  const found: string[] = [];
  // sort keys longest first to match "sky blue" before "blue"
  const keys = Object.keys(COLOR_MAP).sort((a, b) => b.length - a.length);
  for (const k of keys) {
    if (d.includes(k) && !found.includes(COLOR_MAP[k])) found.push(COLOR_MAP[k]);
  }
  let pattern: "stripes" | "checks" | undefined;
  if (d.includes("stripe")) pattern = "stripes";
  if (d.includes("check")) pattern = "checks";
  return {
    primary: found[0] ?? "#444",
    secondary: found[1],
    pattern,
  };
};

const Jersey = ({ description, label }: { description: string; label: string }) => {
  const { primary, secondary, pattern } = pickColors(description);
  const sec = secondary ?? primary;

  return (
    <div className="flex flex-col items-center gap-3">
      <svg viewBox="0 0 200 220" className="w-full max-w-[180px] drop-shadow-xl">
        <defs>
          {pattern === "stripes" && (
            <pattern id={`stripes-${label}`} width="20" height="20" patternUnits="userSpaceOnUse">
              <rect width="20" height="20" fill={primary} />
              <rect x="10" width="10" height="20" fill={sec} />
            </pattern>
          )}
          {pattern === "checks" && (
            <pattern id={`checks-${label}`} width="24" height="24" patternUnits="userSpaceOnUse">
              <rect width="24" height="24" fill={primary} />
              <rect width="12" height="12" fill={sec} />
              <rect x="12" y="12" width="12" height="12" fill={sec} />
            </pattern>
          )}
        </defs>
        {/* Jersey body */}
        <path
          d="M40 30 L70 15 Q100 35 130 15 L160 30 L185 70 L155 85 L155 200 Q100 215 45 200 L45 85 L15 70 Z"
          fill={
            pattern === "stripes"
              ? `url(#stripes-${label})`
              : pattern === "checks"
                ? `url(#checks-${label})`
                : primary
          }
          stroke="rgba(0,0,0,0.35)"
          strokeWidth="1.5"
        />
        {/* Sleeves accent */}
        {!pattern && secondary && (
          <>
            <path d="M15 70 L40 30 L55 50 L30 80 Z" fill={sec} opacity="0.9" />
            <path d="M185 70 L160 30 L145 50 L170 80 Z" fill={sec} opacity="0.9" />
          </>
        )}
        {/* Collar */}
        <path d="M85 18 Q100 30 115 18 L110 30 Q100 38 90 30 Z" fill={sec} stroke="rgba(0,0,0,0.4)" strokeWidth="1" />
        {/* Number */}
        <text
          x="100"
          y="135"
          textAnchor="middle"
          fontSize="56"
          fontWeight="900"
          fill={pattern || !secondary ? "rgba(255,255,255,0.85)" : sec}
          stroke="rgba(0,0,0,0.3)"
          strokeWidth="1"
          fontFamily="system-ui, sans-serif"
        >
          10
        </text>
      </svg>
      <div className="text-center">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
        <div className="text-sm font-medium">{description}</div>
      </div>
    </div>
  );
};

export default Jersey;
