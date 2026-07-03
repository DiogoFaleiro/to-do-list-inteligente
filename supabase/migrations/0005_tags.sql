-- To-Do List Inteligente — etiquetas (tags) e favoritos
-- Rode este arquivo inteiro, uma única vez, no SQL Editor do seu projeto Supabase
-- (depois de já ter rodado 0001, 0002, 0003 e 0004).

-- Etiqueta é uma tabela "dona única" igual projects. Uma tarefa pode ter
-- várias etiquetas ao mesmo tempo, por isso task_tags é uma tabela de
-- junção (muitos-para-muitos) em vez de uma coluna na própria tarefa.

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  color text not null default '#6c5ce7',
  is_favorite boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.task_tags (
  task_id uuid not null references public.tasks (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  primary key (task_id, tag_id)
);

alter table public.projects add column if not exists is_favorite boolean not null default false;

create index if not exists tags_user_id_idx on public.tags (user_id);
create index if not exists task_tags_tag_id_idx on public.task_tags (tag_id);

alter table public.tags enable row level security;
alter table public.task_tags enable row level security;

create policy tags_select_own_or_admin on public.tags
  for select using (user_id = auth.uid() or public.is_admin());

create policy tags_insert_own on public.tags
  for insert with check (user_id = auth.uid());

create policy tags_update_own on public.tags
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy tags_delete_own on public.tags
  for delete using (user_id = auth.uid());

-- task_tags não tem user_id próprio: a policy confere o dono via join com tasks.
create policy task_tags_select_own_or_admin on public.task_tags
  for select using (
    exists (select 1 from public.tasks t where t.id = task_id and (t.user_id = auth.uid() or public.is_admin()))
  );

create policy task_tags_insert_own on public.task_tags
  for insert with check (
    exists (select 1 from public.tasks t where t.id = task_id and t.user_id = auth.uid())
  );

create policy task_tags_delete_own on public.task_tags
  for delete using (
    exists (select 1 from public.tasks t where t.id = task_id and t.user_id = auth.uid())
  );
