-- To-Do List Inteligente — coluna de ordem manual (drag-and-drop) em
-- projects e sessions
-- Rode este arquivo inteiro, uma única vez, no SQL Editor do seu projeto
-- Supabase (depois de já ter rodado 0001 a 0012).

alter table public.projects add column if not exists position double precision;
alter table public.sessions add column if not exists position double precision;

-- Backfill: espaça em múltiplos de 1000 na ordem atual de created_at, pra
-- já nascer com espaço de sobra pra inserções futuras (ver cálculo de
-- position em js/store.js — média entre vizinhos, reindexa só se o espaço
-- entre dois vizinhos ficar praticamente zero).
with ranked as (
  select id, row_number() over (partition by user_id order by created_at asc) as rn
  from public.projects
  where position is null
)
update public.projects p set position = ranked.rn * 1000
from ranked where p.id = ranked.id;

with ranked as (
  select id, row_number() over (partition by project_id order by created_at asc) as rn
  from public.sessions
  where position is null
)
update public.sessions s set position = ranked.rn * 1000
from ranked where s.id = ranked.id;

create index if not exists projects_user_position_idx on public.projects (user_id, position);
create index if not exists sessions_project_position_idx on public.sessions (project_id, position);
