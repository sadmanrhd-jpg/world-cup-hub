import { useEffect, useState } from "react";

const KEY = "wc26-favorite-team";

export const useFavoriteTeam = () => {
  const [slug, setSlug] = useState<string | null>(null);

  useEffect(() => {
    try {
      setSlug(localStorage.getItem(KEY));
    } catch {}
    const onChange = () => {
      try { setSlug(localStorage.getItem(KEY)); } catch {}
    };
    window.addEventListener("storage", onChange);
    window.addEventListener("favorite-team-changed", onChange);
    return () => {
      window.removeEventListener("storage", onChange);
      window.removeEventListener("favorite-team-changed", onChange);
    };
  }, []);

  const set = (s: string | null) => {
    try {
      if (s) localStorage.setItem(KEY, s);
      else localStorage.removeItem(KEY);
    } catch {}
    setSlug(s);
    window.dispatchEvent(new Event("favorite-team-changed"));
  };

  return { slug, set };
};
