import { useEffect, useMemo, useState } from "react";
import { Loader2, UserRound } from "lucide-react";

type WikiPage = {
  title?: string;
  thumbnail?: {
    source?: string;
  };
};

type WikiPayload = {
  query?: {
    pages?: WikiPage[];
  };
};

const imageCache = new Map<string, string | null>();

const PersonCutoutImage = ({
  name,
  searchHint,
  alt,
  className = "",
}: {
  name: string;
  searchHint: string;
  alt: string;
  className?: string;
}) => {
  const query = useMemo(
    () => `${name.trim()} ${searchHint.trim()}`.trim(),
    [name, searchHint],
  );
  const [src, setSrc] = useState<string | null>(() => imageCache.get(query) ?? null);
  const [loading, setLoading] = useState(() => !imageCache.has(query));

  useEffect(() => {
    if (!query || query === "TBA" || query.startsWith("—")) {
      setSrc(null);
      setLoading(false);
      return;
    }

    const cached = imageCache.get(query);
    if (cached !== undefined) {
      setSrc(cached);
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    const load = async () => {
      setLoading(true);

      try {
        const endpoint = new URL("https://en.wikipedia.org/w/api.php");
        endpoint.searchParams.set("origin", "*");
        endpoint.searchParams.set("action", "query");
        endpoint.searchParams.set("generator", "search");
        endpoint.searchParams.set("gsrsearch", query);
        endpoint.searchParams.set("gsrnamespace", "0");
        endpoint.searchParams.set("gsrlimit", "6");
        endpoint.searchParams.set("prop", "pageimages");
        endpoint.searchParams.set("piprop", "thumbnail");
        endpoint.searchParams.set("pithumbsize", "900");
        endpoint.searchParams.set("format", "json");
        endpoint.searchParams.set("formatversion", "2");

        const response = await fetch(endpoint.toString(), {
          signal: controller.signal,
          cache: "force-cache",
          headers: { Accept: "application/json" },
        });

        if (!response.ok) {
          throw new Error(`Wikipedia image request returned ${response.status}`);
        }

        const payload = (await response.json()) as WikiPayload;
        const image =
          payload.query?.pages?.find((page) => page.thumbnail?.source)?.thumbnail
            ?.source ?? null;

        imageCache.set(query, image);
        setSrc(image);
      } catch (error) {
        if (!controller.signal.aborted) {
          imageCache.set(query, null);
          setSrc(null);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void load();

    return () => controller.abort();
  }, [query]);

  return (
    <div
      className={`relative flex h-full w-full items-end justify-center overflow-hidden ${className}`}
      aria-label={alt}
    >
      <div className="absolute inset-x-6 bottom-0 h-2/3 rounded-full bg-primary/10 blur-3xl" />

      {loading ? (
        <Loader2 className="relative mb-12 h-9 w-9 animate-spin text-primary/70" />
      ) : src ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="relative h-full w-full object-contain object-bottom drop-shadow-[0_24px_34px_rgba(0,0,0,0.55)]"
          style={{
            WebkitMaskImage:
              "linear-gradient(to bottom, black 0%, black 76%, transparent 100%)",
            maskImage:
              "linear-gradient(to bottom, black 0%, black 76%, transparent 100%)",
          }}
          onError={() => {
            imageCache.set(query, null);
            setSrc(null);
          }}
        />
      ) : (
        <div className="relative mb-8 grid h-24 w-24 place-items-center rounded-full border border-border bg-secondary/70">
          <UserRound className="h-11 w-11 text-muted-foreground" />
        </div>
      )}
    </div>
  );
};

export default PersonCutoutImage;
