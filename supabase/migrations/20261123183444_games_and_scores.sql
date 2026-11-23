-- SPEC 07: tablas games y scores, vistas de leaderboard, RLS y submit_score.

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------

create table public.games (
  id         text primary key,          -- slug, igual al id de lib/games.ts
  title      text not null,
  created_at timestamptz not null default now()
);

insert into public.games (id, title) values ('asteroides', 'ASTEROIDES');

create table public.scores (
  id          uuid primary key default gen_random_uuid(),
  game_id     text not null references public.games (id) on delete cascade,
  player_name text not null check (char_length(player_name) between 1 and 10),
  score       integer not null check (score >= 0 and score <= 10000000),
  user_id     uuid null references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);

create index scores_game_score_idx on public.scores (game_id, score desc);
create index scores_player_idx on public.scores (player_name);
create index scores_user_id_idx on public.scores (user_id);

-- ---------------------------------------------------------------------------
-- Vistas (mejor puntaje por player_name, sensible a mayúsculas,
-- empate resuelto por el más antiguo)
-- ---------------------------------------------------------------------------

-- una fila por (game_id, player_name)
create view public.leaderboard_by_game with (security_invoker = true) as
select distinct on (game_id, player_name)
       game_id, player_name, score, created_at
from public.scores
order by game_id, player_name, score desc, created_at asc;

-- una fila por player_name (mejor score en cualquier juego)
create view public.leaderboard_global with (security_invoker = true) as
select distinct on (player_name)
       player_name, game_id, score, created_at
from public.scores
order by player_name, score desc, created_at asc;

-- ---------------------------------------------------------------------------
-- Seguridad (RLS)
-- ---------------------------------------------------------------------------

alter table public.games  enable row level security;
alter table public.scores enable row level security;

create policy "games_select_public"  on public.games  for select to anon, authenticated using (true);
create policy "scores_select_public" on public.scores for select to anon, authenticated using (true);
-- Sin políticas de INSERT/UPDATE/DELETE: nadie escribe directo con la clave publicable.

-- Permisos explícitos de la Data API: solo lectura.
revoke all on public.games, public.scores, public.leaderboard_by_game, public.leaderboard_global
  from anon, authenticated;
grant select on public.games, public.scores, public.leaderboard_by_game, public.leaderboard_global
  to anon, authenticated;

-- ---------------------------------------------------------------------------
-- submit_score: única vía de escritura
-- ---------------------------------------------------------------------------

create function public.submit_score(p_game_id text, p_player_name text, p_score integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := btrim(coalesce(p_player_name, ''));
begin
  if p_game_id is null or not exists (select 1 from public.games where id = p_game_id) then
    raise exception 'invalid game_id' using errcode = '22023';
  end if;

  if char_length(v_name) < 1 or char_length(v_name) > 10 then
    raise exception 'invalid player_name' using errcode = '22023';
  end if;

  if p_score is null or p_score < 0 or p_score > 10000000 then
    raise exception 'invalid score' using errcode = '22023';
  end if;

  insert into public.scores (game_id, player_name, score, user_id)
  values (p_game_id, v_name, p_score, null);
end;
$$;

revoke all on function public.submit_score(text, text, integer) from public;
grant execute on function public.submit_score(text, text, integer) to anon, authenticated;
