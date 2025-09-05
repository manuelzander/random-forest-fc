
-- 1) Protect player_stats with RLS and allow read-only access

alter table public.player_stats enable row level security;

drop policy if exists "Public can view player stats" on public.player_stats;
create policy "Public can view player stats"
  on public.player_stats
  for select
  using (true);  -- change to: (auth.role() = 'authenticated') if you prefer auth-only


-- 2) Ensure get_player_stats does not bypass RLS

create or replace function public.get_player_stats()
returns table(
  id uuid,
  name text,
  user_id uuid,
  avatar_url text,
  badges jsonb,
  created_at timestamptz,
  updated_at timestamptz,
  points bigint,
  games_played bigint,
  wins bigint,
  draws bigint,
  losses bigint,
  mvp_awards bigint,
  goal_difference bigint
)
language sql
stable
security invoker
set search_path to 'public'
as $$
  select *
  from public.player_stats
  order by points desc, goal_difference desc
$$;


-- 3) Players: precise claim/unclaim and owner updates, plus column-level grants

-- Ensure RLS is enabled (should already be)
alter table public.players enable row level security;

-- Replace broad owner update policy with precise ones
drop policy if exists "Users can update their claimed player" on public.players;

-- Allow claiming unowned players: only when currently unclaimed, new owner must be the caller
create policy "Users can claim unowned player"
  on public.players
  for update
  using (user_id is null)
  with check (user_id = auth.uid());

-- Allow unclaiming: only the current owner can set user_id to null
create policy "Users can unclaim their player"
  on public.players
  for update
  using (user_id = auth.uid())
  with check (user_id is null);

-- Allow owners to update their row (used for avatar updates; grants will restrict columns)
create policy "Owners can update their row"
  on public.players
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Tighten column update privileges to only user_id and avatar_url for authenticated users
revoke update on public.players from anon, authenticated;
grant update (user_id, avatar_url) on public.players to authenticated;

-- Read access remains public via existing policy:
--   "Anyone can view players" USING (true)
