-- To-Do List Inteligente — corrige vazamento de dados entre contas
-- Rode este arquivo inteiro, uma única vez, no SQL Editor do seu projeto Supabase
-- (depois de já ter rodado 0001 a 0005).

-- As policies de SELECT de profiles/projects/tasks/tags/task_tags tinham
-- "or public.is_admin()", o que fazia a conta admin enxergar as linhas de
-- TODOS os usuários (não só as próprias) sempre que o app carregava os
-- dados normalmente. Isso nunca foi necessário: o painel super admin
-- (/admin) já usa funções security definer (admin_dashboard_stats,
-- admin_tasks_by_weekday, admin_user_list, em 0001_init.sql/
-- 0002_admin_dashboard.sql) que ignoram RLS e conferem is_admin() por
-- conta própria. O único efeito real desse "or admin" era misturar dados
-- de outras contas na conta admin — e como a policy de UPDATE não tem
-- esse mesmo "or admin" (corretamente), tentar editar algo que apareceu
-- mas não é seu falha com "Falha ao atualizar ...".

drop policy if exists profiles_select_own_or_admin on public.profiles;
create policy profiles_select_own on public.profiles
  for select using (id = auth.uid());

drop policy if exists projects_select_own_or_admin on public.projects;
create policy projects_select_own on public.projects
  for select using (user_id = auth.uid());

drop policy if exists tasks_select_own_or_admin on public.tasks;
create policy tasks_select_own on public.tasks
  for select using (user_id = auth.uid());

drop policy if exists tags_select_own_or_admin on public.tags;
create policy tags_select_own on public.tags
  for select using (user_id = auth.uid());

drop policy if exists task_tags_select_own_or_admin on public.task_tags;
create policy task_tags_select_own on public.task_tags
  for select using (
    exists (select 1 from public.tasks t where t.id = task_id and t.user_id = auth.uid())
  );
