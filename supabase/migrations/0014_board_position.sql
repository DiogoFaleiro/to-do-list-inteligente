-- To-Do List Inteligente — coluna de ordem manual independente para as
-- colunas de projeto no Painel (board_position), separada da ordem da
-- sidebar (position). Rode este arquivo inteiro, uma única vez, no SQL
-- Editor do seu projeto Supabase (depois de já ter rodado 0001 a 0013).

alter table public.projects add column if not exists board_position double precision;

-- Backfill: nasce com a MESMA ordem relativa da sidebar (position atual),
-- renumerada em múltiplos de 1000 — depois disso os dois campos evoluem
-- livres e independentes (arrastar no Painel não move a sidebar, e
-- vice-versa; ver reorderProjectsBoard/reorderProjects em js/store.js).
with ranked as (
  select id, row_number() over (partition by user_id order by position asc, created_at asc) as rn
  from public.projects
  where board_position is null
)
update public.projects p set board_position = ranked.rn * 1000
from ranked where p.id = ranked.id;

create index if not exists projects_user_board_position_idx on public.projects (user_id, board_position);
