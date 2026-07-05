-- To-Do List Inteligente — recorrência no estilo Todoist (horário + regra + histórico)
-- Rode este arquivo inteiro, uma única vez, no SQL Editor do seu projeto Supabase
-- (depois de já ter rodado 0001 a 0010).

-- 1. Horário opcional da tarefa (hoje só existe due_date, sem hora). Fica
--    null pra tarefa sem horário marcado — não muda nada pra quem já usa
--    o app sem horário.
alter table public.tasks
  add column if not exists due_time time null;

-- 2. Regra de recorrência estruturada (frequência/intervalo/âncora), em vez
--    do booleano simples `recurring` (que só sabia dizer "diária" ou não).
--    Fica null pra tarefa não-recorrente. O formato do jsonb é decidido
--    pelo frontend — esta migration só abre o campo no banco.
alter table public.tasks
  add column if not exists recurrence jsonb null;

-- 3. Histórico de conclusões de tarefa recorrente. Hoje o app só guarda a
--    ÚLTIMA conclusão (tasks.completed_date) — sem histórico não dá pra
--    calcular sequência de dias seguidos, frequência real de conclusão,
--    etc. Cada conclusão de uma recorrente vira uma linha aqui (a linha
--    de tasks.completed_date continua existindo, sem mudança, só passa a
--    ser "a mais recente" também registrada aqui).
create table if not exists public.task_completions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid references public.tasks (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  completed_on date not null,
  completed_at timestamptz not null default now()
);

create index if not exists task_completions_user_completed_on_idx
  on public.task_completions (user_id, completed_on);

alter table public.task_completions enable row level security;

-- Só select/insert — é um log de conclusões, não faz sentido editar nem
-- apagar uma entrada do histórico depois que ela existe (se o usuário
-- desmarcar a tarefa por engano, isso é tratado no lado do app mudando
-- tasks.status, não reescrevendo o histórico).
drop policy if exists task_completions_select_own on public.task_completions;
create policy task_completions_select_own on public.task_completions
  for select using (user_id = auth.uid());

drop policy if exists task_completions_insert_own on public.task_completions;
create policy task_completions_insert_own on public.task_completions
  for insert with check (user_id = auth.uid());

-- 4. Backfill: toda tarefa recorrente que já existe (recurring = true, no
--    modelo antigo só "diária") ganha a regra equivalente no novo formato
--    estruturado, e devido_date volta pra hoje (mesmo comportamento que o
--    app já dava pra recorrente sem data marcada).
update public.tasks
set recurrence = '{"freq":"daily","interval":1,"anchor":"completed"}'::jsonb,
    due_date = current_date
where recurring = true;

-- 5. A coluna `recurring` NÃO é removida aqui de propósito — o frontend
--    ainda lê/escreve nela (js/store.js, js/render.js). Ela só deve ser
--    removida numa migration futura, depois que o código que passar a
--    usar `recurrence` estiver implantado e confirmado funcionando.
