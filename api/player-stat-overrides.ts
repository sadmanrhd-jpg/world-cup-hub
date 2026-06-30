/**
 * Optional corrections for statistics that ESPN does not expose or reports late.
 * Keys use: team-slug:normalized-player-name
 *
 * Example:
 * "france:kylianmbappe": { goals: 5, assists: 2 }
 */
export const PLAYER_STAT_OVERRIDES: Record<
  string,
  Partial<{
    appearances: number;
    starts: number;
    minutes: number;
    goals: number;
    assists: number;
    tackles: number;
    interceptions: number;
    saves: number;
    cleanSheets: number;
  }>
> = {};
