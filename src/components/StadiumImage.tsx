import { useWikiImage } from "@/hooks/useWikiImage";

type Props = {
  wikiTitle: string;
  alt: string;
  className?: string;
};

const StadiumImage = ({ wikiTitle, alt, className }: Props) => {
  const { data, isLoading } = useWikiImage(wikiTitle);
  const src = data?.originalimage?.source ?? data?.thumbnail?.source;

  if (isLoading) {
    return <div className={`${className} bg-secondary/40 animate-pulse`} />;
  }
  if (!src) {
    return (
      <div className={`${className} bg-secondary/40 flex items-center justify-center text-5xl`}>
        🏟️
      </div>
    );
  }
  return <img src={src} alt={alt} loading="lazy" className={className} />;
};

export default StadiumImage;
