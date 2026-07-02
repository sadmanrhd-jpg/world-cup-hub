import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import type { PlayerBio } from "@/data/playerBios";
import PlayerBioPanel from "@/components/PlayerBioPanel";

const PlayerBioModal = ({
  bio,
  onClose,
}: {
  bio: PlayerBio | null;
  onClose: () => void;
}) => {
  useEffect(() => {
    if (!bio) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [bio, onClose]);

  if (!bio || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-5 lg:hidden"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="player-bio-title"
        className="relative max-h-[92dvh] w-full overflow-y-auto rounded-t-[2rem] border border-border bg-background shadow-2xl sm:max-w-xl sm:rounded-[2rem]"
      >
        <button
          type="button"
          onClick={onClose}
          className="sticky top-4 z-10 ml-auto mr-4 mt-4 grid h-11 w-11 place-items-center rounded-full border border-border bg-background/95 text-foreground shadow-lg backdrop-blur transition-colors hover:border-primary/50 hover:text-primary"
          aria-label="Close player biography"
        >
          <X className="h-6 w-6" />
        </button>

        <div id="player-bio-title" className="sr-only">
          {bio.name} biography
        </div>

        <div className="-mt-8">
          <PlayerBioPanel bio={bio} compact />
        </div>
      </section>
    </div>,
    document.body,
  );
};

export default PlayerBioModal;
