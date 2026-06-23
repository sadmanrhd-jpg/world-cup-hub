import { useState } from "react";
import { getTeamByName } from "@/data/wc26";

type TeamFlagProps = {
  name: string;
  slug?: string;
  className?: string;
  alt?: string;
  eager?: boolean;
};

const TeamFlag = ({
  name,
  slug,
  className = "",
  alt,
  eager = false,
}: TeamFlagProps) => {
  const team = getTeamByName(name);
  const resolvedSlug = slug ?? team?.slug;
  const [failed, setFailed] = useState(false);

  if (!resolvedSlug || failed) {
    return (
      <span
        role="img"
        aria-label={alt ?? `${name} flag`}
        className={`inline-flex items-center justify-center ${className}`}
      >
        {team?.flag ?? "🏳️"}
      </span>
    );
  }

  return (
    <img
      src={`/flags/${resolvedSlug}.webp`}
      alt={alt ?? `${name} flag`}
      className={`block object-cover ${className}`}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
};

export default TeamFlag;
