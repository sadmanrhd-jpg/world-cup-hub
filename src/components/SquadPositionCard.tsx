import { useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import type { WorldCupPlayer } from "@/types/fanProfile";
import { getPlayerBio } from "@/data/playerBios";
import type { PlayerBio } from "@/data/playerBios";
import PlayerBioModal from "@/components/PlayerBioModal";
import PlayerBioPanel, { Portrait } from "@/components/PlayerBioPanel";
import { formatPlayerPosition } from "@/utils/playerPosition";

const googleSearchUrl = (name: string) =>
  `https://www.google.com/search?q=${encodeURIComponent(`${name} footballer`)}`;

const playerNameSizeClass = (name: string) => {
  if (name.length >= 30) return "text-[11px] leading-tight sm:text-sm";
  if (name.length >= 24) return "text-[12px] leading-tight sm:text-sm";
  if (name.length >= 18) return "text-[13px] leading-tight sm:text-base";
  return "text-sm leading-tight sm:text-base";
};

const SquadPositionCard = ({
  groupShort,
  groupLabel,
  players,
}: {
  groupShort: string;
  groupLabel: string;
  players: WorldCupPlayer[];
}) => {
  const bios = useMemo(
    () => new Map(players.map((player) => [player.id, getPlayerBio(player)])),
    [players],
  );

  const [activePlayerId, setActivePlayerId] = useState<string | null>(null);
  const [modalBio, setModalBio] = useState<PlayerBio | null>(null);

  const activeBio =
    (activePlayerId ? bios.get(activePlayerId) : null) ?? null;

  return (
    <>
      <article
        className="overflow-hidden rounded-3xl border border-border card-elevated"
        onMouseLeave={() => setActivePlayerId(null)}
      >
        <div className="flex items-center justify-between border-b border-border bg-secondary/35 px-5 py-4">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
              {groupShort}
            </div>
            <h3 className="text-xl font-black">{groupLabel}</h3>
          </div>

          <span className="grid h-9 min-w-9 place-items-center rounded-full bg-primary/10 px-2 text-xs font-black text-primary">
            {players.length}
          </span>
        </div>

        <div
          className={[
            "relative grid transition-[grid-template-columns] duration-300 ease-out",
            activeBio
              ? "lg:grid-cols-[minmax(0,0.58fr)_minmax(280px,0.42fr)]"
              : "lg:grid-cols-[minmax(0,1fr)_0fr]",
          ].join(" ")}
        >
          <div className="min-w-0 divide-y divide-border">
            {players.map((player) => {
              const bio = bios.get(player.id)!;
              const active = activePlayerId === player.id;

              return (
                <div
                  key={player.id}
                  className={[
                    "group/player relative flex min-w-0 items-center gap-2 px-3 py-3.5 transition-colors sm:gap-3 sm:px-5",
                    active
                      ? "bg-primary/[0.08]"
                      : "hover:bg-secondary/45 focus-within:bg-secondary/45",
                  ].join(" ")}
                  onMouseEnter={() => setActivePlayerId(player.id)}
                  onFocus={() => setActivePlayerId(player.id)}
                >
                  <button
                    type="button"
                    onClick={() => setModalBio(bio)}
                    className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary lg:hidden"
                    aria-label={`Open biography for ${player.name}`}
                  >
                    <Portrait bio={bio} size="small" />
                  </button>

                  <div className="hidden h-11 w-11 shrink-0 place-items-center rounded-xl border border-border bg-secondary/60 font-mono text-xs font-black text-primary lg:grid">
                    {player.shirtNumber != null
                      ? String(player.shirtNumber).padStart(2, "0")
                      : groupShort}
                  </div>

                  <div className="min-w-0 flex-1">
                    <a
                      href={googleSearchUrl(player.name)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex max-w-full items-center gap-1.5 font-bold transition-colors hover:text-primary"
                    >
                      <span
                        className={`min-w-0 truncate ${playerNameSizeClass(
                          player.name,
                        )}`}
                      >
                        {player.name}
                      </span>
                      <ExternalLink className="h-3.5 w-3.5 shrink-0 opacity-40 transition-opacity group-hover/player:opacity-100" />
                    </a>

                    <div className="mt-0.5 truncate text-[10px] text-muted-foreground sm:text-[11px]">
                      {formatPlayerPosition(player.position)}
                      {player.club ? ` · ${player.club}` : ""}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setModalBio(bio)}
                    className="inline-flex h-8 shrink-0 items-center gap-0.5 rounded-full border border-primary/25 bg-primary/[0.08] px-2.5 text-[11px] font-semibold lowercase text-primary transition-all hover:border-primary/50 hover:bg-primary/15 sm:h-9 sm:px-3 sm:text-xs lg:hidden"
                    aria-label={`Open biography for ${player.name}`}
                  >
                    bio
                    <span aria-hidden="true" className="text-[9px]">
                      ▶
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActivePlayerId(player.id)}
                    onMouseEnter={() => setActivePlayerId(player.id)}
                    className="hidden h-8 shrink-0 items-center gap-0.5 rounded-full border border-primary/25 bg-primary/[0.08] px-2.5 text-[11px] font-semibold lowercase text-primary transition-all hover:border-primary/50 hover:bg-primary/15 lg:inline-flex"
                    aria-label={`Show biography for ${player.name}`}
                  >
                    bio
                    <span aria-hidden="true" className="text-[9px]">
                      ▶
                    </span>
                  </button>

                  {active && (
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute right-0 top-1/2 hidden h-px w-8 origin-left animate-[scale-in_220ms_ease-out] bg-primary/70 lg:block"
                    >
                      <span className="absolute -right-px -top-3 h-3 w-px bg-primary/70" />
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <aside
            className={[
              "relative hidden min-w-0 overflow-hidden border-l border-border bg-gradient-to-br from-primary/[0.08] via-background to-secondary/25 transition-opacity duration-300 lg:block",
              activeBio ? "opacity-100" : "pointer-events-none opacity-0",
            ].join(" ")}
            aria-live="polite"
          >
            {activeBio && (
              <div className="sticky top-24 max-h-[620px] overflow-y-auto">
                <PlayerBioPanel bio={activeBio} />
              </div>
            )}
          </aside>
        </div>
      </article>

      <PlayerBioModal bio={modalBio} onClose={() => setModalBio(null)} />
    </>
  );
};

export default SquadPositionCard;
