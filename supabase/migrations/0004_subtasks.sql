-- To-Do List Inteligente — subtarefas
-- Rode este arquivo inteiro, uma única vez, no SQL Editor do seu projeto Supabase
-- (depois de já ter rodado 0001, 0002 e 0003).

-- Subtarefa é só uma linha normal em public.tasks, ligada à tarefa mãe por
-- parent_task_id. Apagar a tarefa mãe apaga as subtarefas junto (cascade).
-- Não precisa de RLS nova: as policies existentes (user_id = auth.uid())
-- já cobrem essas linhas normalmente.

alter table public.tasks
  add column if not exists parent_task_id uuid references public.tasks (id) on delete cascade;

create index if not exists tasks_parent_task_id_idx on public.tasks (parent_task_id);
