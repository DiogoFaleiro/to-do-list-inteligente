-- To-Do List Inteligente — descrição da tarefa + comentários
-- Rode este arquivo inteiro, uma única vez, no SQL Editor do seu projeto Supabase
-- (depois de já ter rodado 0001 a 0011).

-- 1. Descrição livre da tarefa (hoje só existe o título). Fica null pra
--    tarefa sem descrição — não muda nada pra quem já usa o app sem ela.
alter table public.tasks
  add column if not exists description text null;

-- 2. Comentários de uma tarefa — histórico de anotações soltas, separado da
--    descrição (que é editável/substituível; comentário é um registro que
--    fica, no estilo de um log de acompanhamento).
create table if not exists public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  content text not null check (length(content) between 1 and 5000),
  created_at timestamptz not null default now()
);

create index if not exists task_comments_task_id_created_at_idx
  on public.task_comments (task_id, created_at);

alter table public.task_comments enable row level security;

drop policy if exists task_comments_select_own on public.task_comments;
create policy task_comments_select_own on public.task_comments
  for select using (user_id = auth.uid());

drop policy if exists task_comments_insert_own on public.task_comments;
create policy task_comments_insert_own on public.task_comments
  for insert with check (user_id = auth.uid());

drop policy if exists task_comments_update_own on public.task_comments;
create policy task_comments_update_own on public.task_comments
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists task_comments_delete_own on public.task_comments;
create policy task_comments_delete_own on public.task_comments
  for delete using (user_id = auth.uid());
