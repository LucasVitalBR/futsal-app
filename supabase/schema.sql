-- Esquema do app de futsal (com login)
-- Rode este script no SQL Editor do seu projeto Supabase (Supabase Dashboard > SQL Editor > New query)

create extension if not exists "pgcrypto";

-- Jogadores do time. Cada jogador pode estar vinculado a uma conta de login
-- (user_id). is_admin marca quem pode rodar a chamada e mexer nos dados de
-- qualquer jogador (você, o treinador).
create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users (id) on delete set null,
  is_admin boolean not null default false,
  name text not null,
  jersey_number int,
  -- pontos totais acumulados ao longo da carreira (nunca diminui, só um admin altera)
  total_points int not null default 0,
  -- pontos ainda não distribuídos em atributos
  skill_points_available int not null default 0,
  -- atributos do jogador virtual, de 1 a 99, estilo cartinha FIFA
  attributes jsonb not null default '{
    "pace": 40,
    "shooting": 40,
    "passing": 40,
    "dribbling": 40,
    "defending": 40,
    "physical": 40
  }'::jsonb,
  created_at timestamptz not null default now()
);

-- Cada jogador escolhe o próprio número no perfil (ver trigger mais abaixo,
-- que libera esse campo pra edição do dono da linha). Um por número, com
-- vários jogadores sem número escolhido ainda (null) sendo permitido.
drop index if exists players_jersey_number_unique;
create unique index players_jersey_number_unique on players (jersey_number) where jersey_number is not null;

-- Posição escolhida na cartinha. Usada só pra pesar o sorteio de habilidades
-- desbloqueadas por tier (ver mais abaixo); não trava o jogador de tirar
-- habilidade de fora da posição dele, só deixa menos provável.
alter table players add column if not exists position text;
update players set position = null where position = 'linha'; -- valor antigo, de antes das 5 posições
alter table players drop constraint if exists players_position_check;
alter table players add constraint players_position_check
  check (position in ('goleiro', 'fixo', 'ala_direita', 'ala_esquerda', 'pivo'));

-- Maior índice de tier (0 = Bronze ... 5 = Legend, ver src/lib/rarity.js)
-- que esse jogador já usou pra desbloquear habilidade. Serve pra saber
-- quando ele "pulou" de tier de verdade, sem dar desbloqueio repetido.
alter table players add column if not exists highest_tier_reached int not null default 0;

-- Habilidades desbloqueadas ao longo da carreira, uma entrada por tier
-- pulado: [{"tier": 1, "tierName": "Gold", "options": ["id1", "id2"], "equipped": "id1"}, ...]
-- "equipped" é definitivo — não existe fluxo de troca depois de escolhido.
alter table players add column if not exists unlocked_skills jsonb not null default '[]'::jsonb;

-- Backfill pra quem já jogava antes dessa feature existir: marca o tier
-- atual como "já visto", pra ninguém ganhar desbloqueio retroativo pelos
-- tiers que já passou. Só roda pra quem ainda está zerado (0), então é
-- seguro rodar esse script de novo depois.
with player_overall as (
  select
    id,
    greatest(40, least(120, round((
      greatest(40, least(120, coalesce((attributes ->> 'pace')::int, 40))) +
      greatest(40, least(120, coalesce((attributes ->> 'shooting')::int, 40))) +
      greatest(40, least(120, coalesce((attributes ->> 'passing')::int, 40))) +
      greatest(40, least(120, coalesce((attributes ->> 'dribbling')::int, 40))) +
      greatest(40, least(120, coalesce((attributes ->> 'defending')::int, 40))) +
      greatest(40, least(120, coalesce((attributes ->> 'physical')::int, 40)))
    ) / 6.0))) as overall
  from players
)
update players p
set highest_tier_reached = case
  when po.overall <= 50 then 0
  when po.overall <= 60 then 1
  when po.overall <= 70 then 2
  when po.overall <= 80 then 3
  when po.overall <= 99 then 4
  else 5
end
from player_overall po
where po.id = p.id and p.highest_tier_reached = 0;

-- Partidas de sábado (uma linha por data de jogo)
create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  match_date date not null unique,
  game_confirmed boolean not null default false,
  -- pontos concedidos por presença confirmada nesta partida
  points_per_attendance int not null default 10,
  created_at timestamptz not null default now()
);

alter table matches add column if not exists game_confirmed boolean not null default false;

-- Horário em que o futsal vai acontecer nesse dia. Só o admin define (mesma
-- policy de "Admin gerencia partidas" abaixo); os outros jogadores só veem.
alter table matches add column if not exists match_time time;

-- Presença de cada jogador em cada partida
create table if not exists attendances (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches (id) on delete cascade,
  player_id uuid not null references players (id) on delete cascade,
  present boolean not null default true,
  points_awarded int not null default 0,
  created_at timestamptz not null default now(),
  unique (match_id, player_id)
);

alter table attendances add column if not exists points_awarded int not null default 0;

-- Sorteios de times de uma partida. Cada sorteio é uma linha nova (não
-- sobrescreve o anterior), assim fica guardado o histórico caso alguém
-- queira conferir depois, e dá pra "sortear de novo" se ficar desequilibrado.
create table if not exists team_draws (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches (id) on delete cascade,
  -- formato: {"A": ["player-id-1", "player-id-2", ...], "B": [...]}
  teams jsonb not null,
  created_at timestamptz not null default now()
);

-- Quando alguém cria uma conta (login), isso cria automaticamente a
-- cartinha de jogador dela, já vinculada. O nome (e, se a pessoa escolheu,
-- o número da camisa) vem do que ela digitou na tela de cadastro.
create or replace function public.handle_new_user()
returns trigger as $$
declare
  requested_jersey int;
begin
  begin
    requested_jersey := nullif(new.raw_user_meta_data ->> 'jersey_number', '')::int;
  exception when others then
    requested_jersey := null;
  end;

  if requested_jersey is not null and (requested_jersey < 0 or requested_jersey > 99) then
    requested_jersey := null;
  end if;

  begin
    insert into public.players (user_id, name, jersey_number)
    values (
      new.id,
      coalesce(new.raw_user_meta_data ->> 'full_name', 'Novo jogador'),
      requested_jersey
    );
  exception when unique_violation then
    -- Alguém ficou com esse número entre a checagem no app e o cadastro de
    -- verdade (corrida rara). Não deixa isso quebrar a criação da conta —
    -- cria sem número, e a pessoa escolhe outro depois no perfil.
    insert into public.players (user_id, name, jersey_number)
    values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', 'Novo jogador'), null);
  end;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Trava de segurança: um jogador comum só pode alterar a PRÓPRIA linha, e
-- só pode mexer nos atributos / pontos disponíveis (respeitando a
-- quantidade de pontos que ele realmente tem pra gastar), posição e número
-- da camisa (esse com índice único acima, pra não repetir número). Quem é
-- admin (você) não passa por essa trava.
create or replace function public.enforce_player_self_update()
returns trigger as $$
declare
  caller_is_admin boolean;
  points_spent int;
  attribute_delta int;
begin
  -- Sem auth.uid(): isso é uma edição direta pelo painel do Supabase
  -- (Table Editor / SQL Editor), que já exige a senha do seu projeto.
  -- Confiamos nesse acesso e liberamos sem restrição.
  if auth.uid() is null then
    return new;
  end if;

  select coalesce(is_admin, false) into caller_is_admin
  from players where user_id = auth.uid();

  if caller_is_admin then
    return new;
  end if;

  if auth.uid() is distinct from old.user_id then
    raise exception 'Você só pode editar o seu próprio jogador.';
  end if;

  if new.total_points is distinct from old.total_points
     or new.name is distinct from old.name
     or new.user_id is distinct from old.user_id
     or new.is_admin is distinct from old.is_admin then
    raise exception 'Esse campo só pode ser alterado por um administrador.';
  end if;

  points_spent := old.skill_points_available - new.skill_points_available;
  if points_spent < 0 then
    raise exception 'Pontos disponíveis não podem aumentar sozinhos.';
  end if;

  -- Sem isso, dava pra mandar skill_points_available bem negativo (ex.: via
  -- devtools, chamando a API direto) e "financiar" um monte de pontos de
  -- atributo com um saldo que nunca existiu de verdade.
  if new.skill_points_available < 0 then
    raise exception 'Pontos disponíveis não podem ficar negativos.';
  end if;

  attribute_delta :=
    (coalesce((new.attributes ->> 'pace')::int, 0) - coalesce((old.attributes ->> 'pace')::int, 0)) +
    (coalesce((new.attributes ->> 'shooting')::int, 0) - coalesce((old.attributes ->> 'shooting')::int, 0)) +
    (coalesce((new.attributes ->> 'passing')::int, 0) - coalesce((old.attributes ->> 'passing')::int, 0)) +
    (coalesce((new.attributes ->> 'dribbling')::int, 0) - coalesce((old.attributes ->> 'dribbling')::int, 0)) +
    (coalesce((new.attributes ->> 'defending')::int, 0) - coalesce((old.attributes ->> 'defending')::int, 0)) +
    (coalesce((new.attributes ->> 'physical')::int, 0) - coalesce((old.attributes ->> 'physical')::int, 0));

  if attribute_delta <> points_spent then
    raise exception 'A distribuição de pontos não bate com os pontos disponíveis.';
  end if;

  -- Mesma ideia: a conta acima só garante que o total bate, não que cada
  -- atributo ficou dentro da faixa que a cartinha usa (40 a 120). Sem essa
  -- trava, dava pra concentrar tudo num atributo só e passar de 120.
  if coalesce((new.attributes ->> 'pace')::int, 40) not between 40 and 120
     or coalesce((new.attributes ->> 'shooting')::int, 40) not between 40 and 120
     or coalesce((new.attributes ->> 'passing')::int, 40) not between 40 and 120
     or coalesce((new.attributes ->> 'dribbling')::int, 40) not between 40 and 120
     or coalesce((new.attributes ->> 'defending')::int, 40) not between 40 and 120
     or coalesce((new.attributes ->> 'physical')::int, 40) not between 40 and 120 then
    raise exception 'Atributo fora da faixa permitida (40 a 120).';
  end if;

  if new.jersey_number is not null and new.jersey_number not between 0 and 99 then
    raise exception 'Número da camisa precisa estar entre 0 e 99.';
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists trg_enforce_player_self_update on players;
create trigger trg_enforce_player_self_update
  before update on players
  for each row execute function public.enforce_player_self_update();

alter table players enable row level security;
alter table matches enable row level security;
alter table attendances enable row level security;

drop policy if exists "Leitura pública de jogadores" on players;
drop policy if exists "Escrita pública de jogadores" on players;
drop policy if exists "Admin cadastra jogador manualmente" on players;
drop policy if exists "Dono ou admin atualiza jogador" on players;
drop policy if exists "Admin remove jogador" on players;

create policy "Leitura pública de jogadores" on players
  for select using (true);

-- Inserção manual (aba Elenco) só por admin. Jogadores comuns ganham sua
-- linha automaticamente ao criar conta, via handle_new_user() acima.
create policy "Admin cadastra jogador manualmente" on players
  for insert with check (
    exists (select 1 from players a where a.user_id = auth.uid() and a.is_admin)
  );

-- Dono da linha ou admin podem atualizar; o trigger acima decide o que
-- cada um pode realmente mudar campo a campo.
create policy "Dono ou admin atualiza jogador" on players
  for update using (
    auth.uid() = user_id
    or exists (select 1 from players a where a.user_id = auth.uid() and a.is_admin)
  );

create policy "Admin remove jogador" on players
  for delete using (
    exists (select 1 from players a where a.user_id = auth.uid() and a.is_admin)
  );

drop policy if exists "Leitura pública de partidas" on matches;
drop policy if exists "Escrita pública de partidas" on matches;
drop policy if exists "Usuário logado gerencia partidas" on matches;
drop policy if exists "Admin gerencia partidas" on matches;

create policy "Leitura pública de partidas" on matches
  for select using (true);
create policy "Admin gerencia partidas" on matches
  for all using (
    exists (select 1 from players p where p.user_id = auth.uid() and p.is_admin)
  ) with check (
    exists (select 1 from players p where p.user_id = auth.uid() and p.is_admin)
  );

drop policy if exists "Leitura pública de presenças" on attendances;
drop policy if exists "Escrita pública de presenças" on attendances;
drop policy if exists "Usuário logado gerencia presenças" on attendances;
drop policy if exists "Admin gerencia presenças" on attendances;

create policy "Leitura pública de presenças" on attendances
  for select using (true);
create policy "Admin gerencia presenças" on attendances
  for all using (
    exists (select 1 from players p where p.user_id = auth.uid() and p.is_admin)
  ) with check (
    exists (select 1 from players p where p.user_id = auth.uid() and p.is_admin)
  );

alter table team_draws enable row level security;

drop policy if exists "Leitura pública de sorteios" on team_draws;
drop policy if exists "Usuário logado gerencia sorteios" on team_draws;
drop policy if exists "Admin gerencia sorteios" on team_draws;

create policy "Leitura pública de sorteios" on team_draws
  for select using (true);
create policy "Admin gerencia sorteios" on team_draws
  for all using (
    exists (select 1 from players p where p.user_id = auth.uid() and p.is_admin)
  ) with check (
    exists (select 1 from players p where p.user_id = auth.uid() and p.is_admin)
  );
