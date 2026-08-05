-- To-Do List Inteligente — coluna de ordem manual (drag-and-drop) em tasks
-- Rode este arquivo inteiro, uma única vez, no SQL Editor do seu projeto
-- Supabase (depois de já ter rodado 0001 a 0021).

alter table public.tasks add column if not exists position double precision;

-- Backfill: espaça em múltiplos de 1000 na ordem atual de created_at (por
-- usuário, sem particionar por dia/projeto/sessão). position só é
-- consultado como desempate DEPOIS de due_date/due_time já terem empatado
-- (ver sortTasks em js/render.js), então uma atribuição globalmente
-- monótona em created_at já preserva a ordem certa dentro de qualquer
-- subgrupo — mesmo raciocínio do backfill de sessions.position em
-- 0013_position_projects_sessions.sql.
with ranked as (
  select id, row_number() over (partition by user_id order by created_at asc) as rn
  from public.tasks
  where position is null
)
update public.tasks t set position = ranked.rn * 1000
from ranked where t.id = ranked.id;

create index if not exists tasks_user_position_idx on public.tasks (user_id, position);
