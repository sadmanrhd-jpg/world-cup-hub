# Apply Changes

Use `START_HERE.md`. It contains the shortest complete setup.

## Replacement files

- `package.json`
- `package-lock.json`
- `vercel.json`
- `src/App.tsx`
- `src/components/Layout.tsx`
- `src/components/PenaltyShootoutGame.tsx`
- `src/pages/MiniGame.tsx`

## New application files

- `src/contexts/AuthContext.tsx`
- `src/lib/supabase.ts`
- `src/types/fanProfile.ts`
- `src/services/bestXiService.ts`
- `src/services/playerService.ts`
- `src/services/progressService.ts`
- `src/components/UserDataSync.tsx`
- `src/components/auth/AuthPanel.tsx`
- `src/components/profile/ProfileMenu.tsx`
- `src/components/bestxi/BestXiBuilder.tsx`
- `src/components/bestxi/FootballPitch.tsx`
- `src/components/bestxi/PlayerPickerSheet.tsx`
- `src/components/bestxi/PlayerStatLine.tsx`
- `src/data/formations.ts`
- `src/pages/BestXI.tsx`
- `src/pages/Profile.tsx`

## Automatic data files

- `api/_lib/world-cup-data.ts`
- `api/world-cup-squads.ts`
- `api/world-cup-stats.ts`
- `api/player-stat-overrides.ts`

## Database file

- `supabase/setup.sql`

Do not restore or recreate the deleted Mini Game branch. Create the new branch from the latest `main`.
