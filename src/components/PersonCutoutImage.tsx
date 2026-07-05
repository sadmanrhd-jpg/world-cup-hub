import { useEffect, useMemo, useState } from "react";
import { Loader2, UserRound } from "lucide-react";
import "@/styles/personFeatureCards.css";

type WikiPage = {
  missing?: boolean;
  pageprops?: {
    disambiguation?: string;
  };
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
  pageTitle,
  alt,
  className = "",
}: {
  pageTitle: string;
  alt: string;
  className?: string;
}) => {
  const title = useMemo(() => pageTitle.trim(), [pageTitle]);
  const [src, setSrc] = useState<string | null>(
    () => imageCache.get(title) ?? null,
  );
  const [loading, setLoading] = useState(
    () => Boolean(title) && !imageCache.has(title),
  );

  useEffect(() => {
    if (!title || title === "TBA" || title === "—") {
      setSrc(null);
      setLoading(false);
      return;
    }

    const cached = imageCache.get(title);
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
        endpoint.searchParams.set("titles", title);
        endpoint.searchParams.set("redirects", "1");
        endpoint.searchParams.set("prop", "pageimages|pageprops");
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
          throw new Error(
            `Wikipedia image request returned ${response.status}`,
          );
        }

        const payload = (await response.json()) as WikiPayload;
        const page = payload.query?.pages?.[0];
        const image =
          page && !page.missing && !page.pageprops?.disambiguation
            ? page.thumbnail?.source ?? null
            : null;

        imageCache.set(title, image);
        setSrc(image);
      } catch {
        if (!controller.signal.aborted) {
          imageCache.set(title, null);
          setSrc(null);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void load();

    return () => controller.abort();
  }, [title]);

  return (
    <div
      className={`person-feature-portrait relative flex items-center justify-center overflow-hidden ${className}`}
      aria-label={alt}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-transparent to-secondary/30" />

      {loading ? (
        <Loader2 className="relative h-9 w-9 animate-spin text-primary/70" />
      ) : src ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="relative h-full w-full object-cover object-top"
          onError={() => {
            imageCache.set(title, null);
            setSrc(null);
          }}
        />
      ) : (
        <div className="relative grid h-24 w-24 place-items-center rounded-2xl border border-border bg-secondary/70">
          <UserRound className="h-11 w-11 text-muted-foreground" />
        </div>
      )}
    </div>
  );
};

export default PersonCutoutImage;
