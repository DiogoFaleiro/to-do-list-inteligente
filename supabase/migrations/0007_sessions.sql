-- To-Do List Inteligente — sessões dentro de projetos
-- Rode este arquivo inteiro, uma única vez, no SQL Editor do seu projeto Supabase
-- (depois de já ter rodado 0001 a 0006).

-- Sessão é um sub-grupo nomeado dentro de um projeto (igual "Seções" do
-- Todoist) — pura organização, sem data nem controle de tempo. Uma sessão
-- pertence a exatamente um projeto (mesmo padrão de tasks -> projects),
-- não é muitos-para-muitos como as etiquetas.

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

-- Excluir uma sessão só desvincula as tarefas dela (não apaga a tarefa) —
-- mesmo padrão de tasks.project_id.
alter table public.tasks add column if not exists session_id uuid references public.sessions (id) on delete set null;

create index if not exists sessions_project_id_idx on public.sessions (project_id);
create index if not exists tasks_session_id_idx on public.tasks (session_id);

alter table public.sessions enable row level security;

create policy sessions_select_own on public.sessions
  for select using (user_id = auth.uid());

create policy sessions_insert_own on public.sessions
  for insert with check (user_id = auth.uid());

create policy sessions_update_own on public.sessions
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy sessions_delete_own on public.sessions
  for delete using (user_id = auth.uid());
