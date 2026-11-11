-- BETA: UNLOCKED | Supabase schema (v2, locked down)
--
-- Run this whole file once in the Supabase SQL editor. It is safe to run again.
--
-- How it is protected
--   * Every table has row level security switched on and NO policies, so the browser
--     (anon / authenticated roles) cannot read or write anything directly.
--   * The only way in is the `beta-api` Edge Function, which uses the service role key.
--   * Every api_* function below can be executed by the service role only.
--   * The Game Master passcode is NOT stored here. It is the Edge Function secret BETA_GM_PASSCODE.
--
-- Anything left over from the first version of this project (open policies, gm_config, old RPCs)
-- is removed in the first block.

-- 0. Clean up v1 -----------------------------------------------------------
do $$
declare r record;
begin
  -- Remove any policy left by v1 (only on tables that already exist, so a fresh project is fine).
  for r in
    select schemaname, tablename, policyname from pg_policies
     where schemaname = 'public' and tablename in ('event_state', 'team_state', 'players')
  loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;
drop function if exists server_now_ms();
drop function if exists patch_event(jsonb);
drop function if exists patch_team_field(text, text, text, jsonb);
drop function if exists reset_team_mission(text, text);
drop function if exists gm_check(text);
drop function if exists reset_game(text, boolean);
drop function if exists gm_get_vault(text);
drop function if exists gm_set_vault(text, text, text, text, text, text);
drop function if exists reveal_get(text);
drop table if exists gm_config;

-- 1. Tables -----------------------------------------------------------------
create table if not exists event_state (
  id int primary key default 1 check (id = 1),
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists team_state (
  id text primary key check (id in ('A', 'B', 'C', 'D')),
  progress jsonb not null default '{"chaos":{},"brain":{},"fearless":{},"ignition":{}}'::jsonb,
  hint jsonb
);

create table if not exists players (
  id text primary key default gen_random_uuid()::text,
  name text not null check (char_length(name) between 2 and 30),
  team text not null references team_state (id),
  joined_at timestamptz not null default now()
);
create unique index if not exists players_team_name_key on players (team, lower(name));

create table if not exists identity_vault (
  team text primary key references team_state (id),
  name text not null default '',
  tagline text not null default '',
  clue text not null default '',
  anthem_url text not null default ''
);

create table if not exists facilitators (
  team text primary key references team_state (id),
  name text not null,
  code_hash text not null unique,
  updated_at timestamptz not null default now()
);

create table if not exists beta_sessions (
  token_hash text primary key,
  role text not null check (role in ('player', 'gm', 'facilitator')),
  player_id text references players (id) on delete cascade,
  team_id text references team_state (id),
  facilitator_name text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index if not exists beta_sessions_expiry on beta_sessions (expires_at);

create table if not exists auth_attempts (
  key text primary key,
  attempts int not null default 0,
  window_start timestamptz not null default now()
);

-- 2. Seed data --------------------------------------------------------------
insert into event_state (id, state) values (1, '{}') on conflict do nothing;
insert into team_state (id) values ('A'), ('B'), ('C'), ('D') on conflict do nothing;
insert into identity_vault (team, name, tagline, clue) values
  ('A', 'MAST', 'The energy of living every moment.', 'You never wait for the weekend to feel alive. You squeeze the whole of today out of today.'),
  ('B', 'SAKKATH', 'The spirit of being exceptional.', 'Ordinary was never on the menu. Someone raised the bar, and you cleared it with room to spare.'),
  ('C', 'BINDAAS', 'The courage to be unapologetically yourself.', 'No filter, no apology, no permission slip. You show up as exactly who you are.'),
  ('D', 'BENKI', 'The fire that ignites.', 'It starts as a spark in one person and ends as a fire in the whole room.')
on conflict do nothing;

-- 3. Lock the tables --------------------------------------------------------
alter table event_state enable row level security;
alter table team_state enable row level security;
alter table players enable row level security;
alter table identity_vault enable row level security;
alter table facilitators enable row level security;
alter table beta_sessions enable row level security;
alter table auth_attempts enable row level security;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on event_state, team_state, players, identity_vault, facilitators, beta_sessions, auth_attempts from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on event_state, team_state, players, identity_vault, facilitators, beta_sessions, auth_attempts from authenticated;
  end if;
end $$;

-- 4. Functions used by the Edge Function -----------------------------------
-- Each takes one jsonb argument `p` and returns jsonb, so the Edge Function stays a thin wrapper.
-- Writes that several teammates make at once happen inside one UPDATE, so nothing is overwritten.

create or replace function api_get_event(p jsonb default '{}')
returns jsonb language sql stable as $$
  select coalesce(state, '{}'::jsonb) from event_state where id = 1
$$;

create or replace function api_patch_event(p jsonb)
returns jsonb language sql as $$
  update event_state
     set state = state || coalesce(p -> 'patch', '{}'::jsonb), updated_at = now()
   where id = 1
  returning state
$$;

-- Change one part of the reveal state (authorised, final, or one team's stage) without touching the rest,
-- so facilitators revealing at the same moment never overwrite each other.
create or replace function api_set_reveal(p jsonb)
returns jsonb language plpgsql as $$
declare
  v_path text[] := array(select jsonb_array_elements_text(p -> 'path'));
  v_value jsonb := coalesce(p -> 'value', 'null'::jsonb);
begin
  update event_state
     set state = jsonb_set(
           jsonb_set(
             jsonb_set(state, '{reveal}', coalesce(state -> 'reveal', '{}'::jsonb), true),
             '{reveal,teams}', coalesce(state #> '{reveal,teams}', '{}'::jsonb), true),
           array['reveal'] || v_path, v_value, true),
         updated_at = now()
   where id = 1;
  return 'true'::jsonb;
end $$;

-- Set one room's timer without touching the other rooms, so facilitators in different rooms never overwrite each other.
create or replace function api_set_room_timer(p jsonb)
returns jsonb language plpgsql as $$
begin
  update event_state
     set state = jsonb_set(
           jsonb_set(state, '{roomTimers}', coalesce(state -> 'roomTimers', '{}'::jsonb), true),
           array['roomTimers', p ->> 'room'], coalesce(p -> 'timer', 'null'::jsonb), true),
         updated_at = now()
   where id = 1;
  return 'true'::jsonb;
end $$;

create or replace function api_get_teams(p jsonb default '{}')
returns jsonb language sql stable as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'progress', progress, 'hint', hint) order by id), '[]'::jsonb)
    from team_state
   where (p ->> 'team') is null or id = p ->> 'team'
$$;

-- Set or clear one key of one mission for one team.
create or replace function api_patch_team_field(p jsonb)
returns jsonb language plpgsql as $$
declare
  v_team text := p ->> 'team';
  v_mission text := p ->> 'mission';
  v_key text := p ->> 'key';
  v_value jsonb := p -> 'value';
begin
  if v_mission not in ('chaos', 'brain', 'fearless', 'ignition') then
    raise exception 'bad_mission';
  end if;
  update team_state
     set progress = jsonb_set(
       progress,
       array[v_mission],
       case
         when v_value is null or jsonb_typeof(v_value) = 'null'
           then coalesce(progress -> v_mission, '{}'::jsonb) - v_key
         else coalesce(progress -> v_mission, '{}'::jsonb) || jsonb_build_object(v_key, v_value)
       end,
       true)
   where id = v_team;
  if not found then raise exception 'bad_team'; end if;
  return 'true'::jsonb;
end $$;

create or replace function api_reset_mission(p jsonb)
returns jsonb language plpgsql as $$
begin
  if (p ->> 'mission') not in ('chaos', 'brain', 'fearless', 'ignition') then raise exception 'bad_mission'; end if;
  update team_state set progress = jsonb_set(progress, array[p ->> 'mission'], '{}'::jsonb, true) where id = p ->> 'team';
  if not found then raise exception 'bad_team'; end if;
  return 'true'::jsonb;
end $$;

create or replace function api_set_hint(p jsonb)
returns jsonb language plpgsql as $$
begin
  update team_state set hint = case when jsonb_typeof(p -> 'hint') = 'null' then null else p -> 'hint' end where id = p ->> 'team';
  if not found then raise exception 'bad_team'; end if;
  return 'true'::jsonb;
end $$;

create or replace function api_list_players(p jsonb default '{}')
returns jsonb language sql stable as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'team', team, 'joined_at', joined_at) order by joined_at, id), '[]'::jsonb)
    from players
   where (p ->> 'team') is null or team = p ->> 'team'
$$;

-- Add a player, or return the existing one when the same name rejoins. Teams have no size limit.
create or replace function api_join_player(p jsonb)
returns jsonb language plpgsql as $$
declare
  v_team text := p ->> 'team';
  v_name text := btrim(p ->> 'name');
  v_row players;
begin
  perform 1 from team_state where id = v_team for update;
  if not found then raise exception 'bad_team'; end if;
  if v_name is null or char_length(v_name) < 2 or char_length(v_name) > 30 then raise exception 'bad_name'; end if;

  -- Facilitators run the game, they never play it.
  if exists (select 1 from facilitators where lower(btrim(name)) = lower(v_name)) then raise exception 'is_facilitator'; end if;

  select * into v_row from players where team = v_team and lower(name) = lower(v_name);
  if found then
    return jsonb_build_object('created', false, 'player',
      jsonb_build_object('id', v_row.id, 'name', v_row.name, 'team', v_row.team, 'joined_at', v_row.joined_at));
  end if;

  insert into players (name, team) values (v_name, v_team) returning * into v_row;
  return jsonb_build_object('created', true, 'player',
    jsonb_build_object('id', v_row.id, 'name', v_row.name, 'team', v_row.team, 'joined_at', v_row.joined_at));
end $$;

create or replace function api_remove_player(p jsonb)
returns jsonb language sql as $$
  with gone as (delete from players where id = p ->> 'id' returning 1)
  select to_jsonb((select count(*) from gone))
$$;

create or replace function api_reset_progress(p jsonb default '{}')
returns jsonb language plpgsql as $$
begin
  update event_state set state = '{}'::jsonb, updated_at = now() where id = 1;
  update team_state set progress = '{"chaos":{},"brain":{},"fearless":{},"ignition":{}}'::jsonb, hint = null where id is not null;
  return 'true'::jsonb;
end $$;

create or replace function api_reset_all(p jsonb default '{}')
returns jsonb language plpgsql as $$
begin
  perform api_reset_progress('{}');
  delete from beta_sessions where role <> 'gm';
  delete from players where id is not null;
  return 'true'::jsonb;
end $$;

-- Sessions ----------------------------------------------------------------
create or replace function api_create_session(p jsonb)
returns jsonb language plpgsql as $$
begin
  delete from beta_sessions where expires_at < now();
  insert into beta_sessions (token_hash, role, player_id, team_id, facilitator_name, expires_at)
  values (p ->> 'token_hash', p ->> 'role', p ->> 'player_id', p ->> 'team_id', p ->> 'facilitator_name', (p ->> 'expires_at')::timestamptz);
  return 'true'::jsonb;
end $$;

create or replace function api_find_session(p jsonb)
returns jsonb language sql stable as $$
  select to_jsonb(s) from beta_sessions s where token_hash = p ->> 'token_hash' and expires_at > now()
$$;

create or replace function api_delete_session(p jsonb)
returns jsonb language plpgsql as $$
begin
  delete from beta_sessions where token_hash = p ->> 'token_hash';
  return 'true'::jsonb;
end $$;

-- Facilitators ------------------------------------------------------------
create or replace function api_list_facilitators(p jsonb default '{}')
returns jsonb language sql stable as $$
  select coalesce(jsonb_agg(jsonb_build_object('team', team, 'name', name) order by team), '[]'::jsonb) from facilitators
$$;

create or replace function api_upsert_facilitator(p jsonb)
returns jsonb language plpgsql as $$
begin
  insert into facilitators (team, name, code_hash) values (p ->> 'team', p ->> 'name', p ->> 'code_hash')
  on conflict (team) do update set name = excluded.name, code_hash = excluded.code_hash, updated_at = now();
  delete from beta_sessions where role = 'facilitator' and team_id = p ->> 'team';
  -- Anyone already in the game under this name is a facilitator, so take them out of the player list.
  delete from beta_sessions where role = 'player' and player_id in (select id from players where lower(btrim(name)) = lower(btrim(p ->> 'name')));
  delete from players where lower(btrim(name)) = lower(btrim(p ->> 'name'));
  return 'true'::jsonb;
exception when unique_violation then
  raise exception 'code_in_use';
end $$;

create or replace function api_find_facilitator(p jsonb)
returns jsonb language sql stable as $$
  select jsonb_build_object('team', team, 'name', name) from facilitators where code_hash = p ->> 'code_hash'
$$;

-- Vault -------------------------------------------------------------------
create or replace function api_get_vault(p jsonb default '{}')
returns jsonb language sql stable as $$
  select coalesce(jsonb_agg(to_jsonb(v) order by team), '[]'::jsonb) from identity_vault v
$$;

create or replace function api_set_vault(p jsonb)
returns jsonb language plpgsql as $$
begin
  update identity_vault set
    name = coalesce(p -> 'patch' ->> 'name', name),
    tagline = coalesce(p -> 'patch' ->> 'tagline', tagline),
    clue = coalesce(p -> 'patch' ->> 'clue', clue),
    anthem_url = coalesce(p -> 'patch' ->> 'anthem_url', anthem_url)
  where team = p ->> 'team';
  if not found then raise exception 'bad_team'; end if;
  return 'true'::jsonb;
end $$;

-- Slow down guessing of passcodes and codes. `delta` 0 only checks, 1 records a failed try.
-- A key is blocked once it has `limit` failed tries inside `window_seconds`.
create or replace function api_bump_attempt(p jsonb)
returns jsonb language plpgsql as $$
declare
  v_key text := p ->> 'key';
  v_limit int := (p ->> 'limit')::int;
  v_delta int := coalesce((p ->> 'delta')::int, 1);
  v_window interval := make_interval(secs => (p ->> 'window_seconds')::int);
  v_row auth_attempts;
begin
  insert into auth_attempts (key) values (v_key) on conflict (key) do nothing;
  select * into v_row from auth_attempts where key = v_key for update;
  if v_row.window_start < now() - v_window then
    update auth_attempts set attempts = v_delta, window_start = now() where key = v_key;
    return to_jsonb(v_delta <= v_limit);
  end if;
  if v_delta > 0 then
    update auth_attempts set attempts = attempts + v_delta where key = v_key;
  end if;
  if v_delta = 0 then return to_jsonb(v_row.attempts < v_limit); end if;
  return to_jsonb(v_row.attempts + v_delta <= v_limit);
end $$;

create or replace function api_clear_attempt(p jsonb)
returns jsonb language plpgsql as $$
begin
  delete from auth_attempts where key = p ->> 'key';
  return 'true'::jsonb;
end $$;

-- 5. Only the service role may run the functions ---------------------------
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname like 'api\_%'
  loop
    execute format('revoke all on function %s from public', f.sig);
    if exists (select 1 from pg_roles where rolname = 'anon') then
      execute format('revoke all on function %s from anon', f.sig);
    end if;
    if exists (select 1 from pg_roles where rolname = 'authenticated') then
      execute format('revoke all on function %s from authenticated', f.sig);
    end if;
    if exists (select 1 from pg_roles where rolname = 'service_role') then
      execute format('grant execute on function %s to service_role', f.sig);
    end if;
  end loop;
end $$;
