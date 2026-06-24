import { CalendarDays, Clock3, MapPin, Users } from "lucide-react";

type MatchInfoGridProps = {
  date: string;
  kickoff: string;
  venue: string;
  attendance: string;
  weather?: string;
};

const compactDate = (value: string) =>
  value.replace(/^[^,]+,\s*/, "").trim() || value;

const MatchInfoGrid = ({
  date,
  kickoff,
  venue,
  attendance,
  weather,
}: MatchInfoGridProps) => {
  const cards = [
    {
      label: "Date",
      mobileValue: compactDate(date),
      desktopValue: date,
      icon: CalendarDays,
      title: date,
    },
    {
      label: "Kickoff",
      mobileValue: kickoff,
      desktopValue: kickoff,
      icon: Clock3,
      title: kickoff,
    },
    {
      label: "Venue",
      mobileValue: venue,
      desktopValue: venue,
      icon: MapPin,
      title: venue,
    },
    {
      label: "Attendance",
      mobileValue: attendance,
      desktopValue: attendance,
      icon: Users,
      title: attendance,
      helper: weather,
    },
  ];

  return (
    <section className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <div
            key={card.label}
            title={card.title}
            className="card-elevated flex aspect-square min-w-0 flex-col items-center justify-center rounded-2xl border border-border p-3 text-center sm:aspect-auto sm:min-h-[150px] sm:items-start sm:justify-start sm:p-5 sm:text-left lg:min-h-0"
          >
            <Icon className="h-5 w-5 shrink-0 text-primary" />

            <div className="mt-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground sm:mt-3 sm:text-xs sm:tracking-widest">
              {card.label}
            </div>

            <div className="mt-1 min-w-0 text-xs font-semibold leading-snug sm:text-base">
              <span className="sm:hidden line-clamp-3 break-words">
                {card.mobileValue}
              </span>
              <span className="hidden sm:block break-words">
                {card.desktopValue}
              </span>
            </div>

            {card.helper && (
              <div className="mt-1 line-clamp-2 text-[10px] leading-tight text-muted-foreground sm:text-xs">
                {card.helper}
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
};

export default MatchInfoGrid;
