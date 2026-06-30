-- Fan26 user profiles, prediction sync, Best XI saves and Mini Game progress.
-- Run this entire file once in Supabase Dashboard > SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  favorite_team_slug text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_predictions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.best_xi_squads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  formation text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint best_xi_payload_shape check (
    jsonb_typeof(payload->'starters') = 'array'
    and jsonb_array_length(payload->'starters') = 11
    and jsonb_typeof(payload->'substitutes') = 'array'
    and jsonb_array_length(payload->'substitutes') = 8
    and jsonb_typeof(payload->'managerId') = 'string'
  )
);

create index if not exists best_xi_user_updated_idx
  on public.best_xi_squads(user_id, updated_at desc);

create table if not exists public.mini_game_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fixture_id integer,
  selected_team text not null,
  opponent text not null,
  goals integer not null check (goals >= 0),
  shots integer not null check (shots >= 0),
  saves integer not null check (saves >= 0),
  misses integer not null check (misses >= 0),
  accuracy numeric(5,2) not null default 0 check (accuracy between 0 and 100),
  created_at timestamptz not null default now()
);

create index if not exists mini_game_results_user_created_idx
  on public.mini_game_results(user_id, created_at desc);

create table if not exists public.mini_game_summary (
  user_id uuid primary key references auth.users(id) on delete cascade,
  games_played integer not null default 0,
  total_goals integer not null default 0,
  total_shots integer not null default 0,
  total_saves_faced integer not null default 0,
  total_misses integer not null default 0,
  best_score integer not null default 0,
  best_accuracy numeric(5,2) not null default 0,
  most_used_team text,
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'display_name',
      new.raw_user_meta_data->>'full_name',
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace function public.limit_best_xi_squads()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if (select count(*) from public.best_xi_squads where user_id = new.user_id) >= 5 then
    raise exception 'A user can save a maximum of five Best XI teams.';
  end if;
  return new;
end;
$$;

create or replace function public.record_mini_game_result(
  p_user_id uuid,
  p_fixture_id integer,
  p_selected_team text,
  p_opponent text,
  p_goals integer,
  p_shots integer,
  p_saves integer,
  p_misses integer,
  p_accuracy numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  most_used text;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then
    raise exception 'Not authorized';
  end if;

  insert into public.mini_game_results (
    user_id,
    fixture_id,
    selected_team,
    opponent,
    goals,
    shots,
    saves,
    misses,
    accuracy
  ) values (
    p_user_id,
    p_fixture_id,
    p_selected_team,
    p_opponent,
    greatest(p_goals, 0),
    greatest(p_shots, 0),
    greatest(p_saves, 0),
    greatest(p_misses, 0),
    least(greatest(p_accuracy, 0), 100)
  );

  select selected_team
  into most_used
  from public.mini_game_results
  where user_id = p_user_id
  group by selected_team
  order by count(*) desc, max(created_at) desc
  limit 1;

  insert into public.mini_game_summary (
    user_id,
    games_played,
    total_goals,
    total_shots,
    total_saves_faced,
    total_misses,
    best_score,
    best_accuracy,
    most_used_team,
    updated_at
  ) values (
    p_user_id,
    1,
    greatest(p_goals, 0),
    greatest(p_shots, 0),
    greatest(p_saves, 0),
    greatest(p_misses, 0),
    greatest(p_goals, 0),
    least(greatest(p_accuracy, 0), 100),
    most_used,
    now()
  )
  on conflict (user_id) do update set
    games_played = public.mini_game_summary.games_played + 1,
    total_goals = public.mini_game_summary.total_goals + excluded.total_goals,
    total_shots = public.mini_game_summary.total_shots + excluded.total_shots,
    total_saves_faced = public.mini_game_summary.total_saves_faced + excluded.total_saves_faced,
    total_misses = public.mini_game_summary.total_misses + excluded.total_misses,
    best_score = greatest(public.mini_game_summary.best_score, excluded.best_score),
    best_accuracy = greatest(public.mini_game_summary.best_accuracy, excluded.best_accuracy),
    most_used_team = most_used,
    updated_at = now();
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists predictions_updated_at on public.user_predictions;
create trigger predictions_updated_at
before update on public.user_predictions
for each row execute function public.set_updated_at();

drop trigger if exists best_xi_updated_at on public.best_xi_squads;
create trigger best_xi_updated_at
before update on public.best_xi_squads
for each row execute function public.set_updated_at();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

drop trigger if exists enforce_best_xi_limit on public.best_xi_squads;
create trigger enforce_best_xi_limit
before insert on public.best_xi_squads
for each row execute function public.limit_best_xi_squads();

alter table public.profiles enable row level security;
alter table public.user_predictions enable row level security;
alter table public.best_xi_squads enable row level security;
alter table public.mini_game_results enable row level security;
alter table public.mini_game_summary enable row level security;

drop policy if exists "Users read own profile" on public.profiles;
create policy "Users read own profile"
on public.profiles for select
using (auth.uid() = id);

drop policy if exists "Users insert own profile" on public.profiles;
create policy "Users insert own profile"
on public.profiles for insert
with check (auth.uid() = id);

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Users read own prediction" on public.user_predictions;
create policy "Users read own prediction"
on public.user_predictions for select
using (auth.uid() = user_id);

drop policy if exists "Users insert own prediction" on public.user_predictions;
create policy "Users insert own prediction"
on public.user_predictions for insert
with check (auth.uid() = user_id);

drop policy if exists "Users update own prediction" on public.user_predictions;
create policy "Users update own prediction"
on public.user_predictions for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users delete own prediction" on public.user_predictions;
create policy "Users delete own prediction"
on public.user_predictions for delete
using (auth.uid() = user_id);

drop policy if exists "Users read own Best XI" on public.best_xi_squads;
create policy "Users read own Best XI"
on public.best_xi_squads for select
using (auth.uid() = user_id);

drop policy if exists "Users insert own Best XI" on public.best_xi_squads;
create policy "Users insert own Best XI"
on public.best_xi_squads for insert
with check (auth.uid() = user_id);

drop policy if exists "Users update own Best XI" on public.best_xi_squads;
create policy "Users update own Best XI"
on public.best_xi_squads for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users delete own Best XI" on public.best_xi_squads;
create policy "Users delete own Best XI"
on public.best_xi_squads for delete
using (auth.uid() = user_id);

drop policy if exists "Users read own Mini Game results" on public.mini_game_results;
create policy "Users read own Mini Game results"
on public.mini_game_results for select
using (auth.uid() = user_id);

drop policy if exists "Users read own Mini Game summary" on public.mini_game_summary;
create policy "Users read own Mini Game summary"
on public.mini_game_summary for select
using (auth.uid() = user_id);

revoke all on function public.record_mini_game_result(
  uuid, integer, text, text, integer, integer, integer, integer, numeric
) from public;

grant execute on function public.record_mini_game_result(
  uuid, integer, text, text, integer, integer, integer, integer, numeric
) to authenticated;
