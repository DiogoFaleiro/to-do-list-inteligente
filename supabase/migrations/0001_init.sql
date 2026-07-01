-- To-Do List Inteligente — schema inicial para multiusuário + super admin
-- Rode este arquivo inteiro, uma única vez, no SQL Editor do seu projeto Supabase.

-- =========================================================================
-- 1. TABELAS
-- =========================================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  color text not null default '#6c5ce7',
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  title text not null,
  due_date date,
  recurring boolean not null default false,
  status text not null default 'todo' check (status in ('todo', 'doing', 'done')),
  completed_date date,
  created_at timestamptz not null default now()
);

create index if not exists projects_user_id_idx on public.projects (user_id);
create index if not exists tasks_user_id_idx on public.tasks (user_id);
create index if not exists tasks_project_id_idx on public.tasks (project_id);
create index if not exists tasks_status_idx on public.tasks (status);

-- =========================================================================
-- 2. FUNÇÃO HELPER: is_admin()
--    security definer para evitar qualquer complexidade de recursão de RLS
--    ao checar profiles.is_admin dentro de policies da própria tabela profiles.
-- =========================================================================

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

-- =========================================================================
-- 3. TRIGGER: criar profile automaticamente no signup
--    e marcar dfsystemsolucoes@gmail.com como super admin automaticamente.
-- =========================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, is_admin)
  values (
    new.id,
    new.email,
    lower(new.email) = 'dfsystemsolucoes@gmail.com'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Fallback: se a conta dfsystemsolucoes@gmail.com já existir antes deste
-- trigger, promova-a manualmente uma única vez:
-- update public.profiles set is_admin = true where lower(email) = 'dfsystemsolucoes@gmail.com';

-- =========================================================================
-- 4. TRIGGER: proteger a coluna is_admin contra auto-promoção pelo client
--    (só bloqueia quando a alteração vem de um usuário autenticado via API;
--    updates manuais feitos por você no SQL Editor continuam funcionando).
-- =========================================================================

create or replace function public.protect_is_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'authenticated' and new.is_admin is distinct from old.is_admin then
    new.is_admin = old.is_admin;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profiles_is_admin on public.profiles;
create trigger protect_profiles_is_admin
  before update on public.profiles
  for each row execute function public.protect_is_admin();

-- =========================================================================
-- 5. ROW LEVEL SECURITY
-- =========================================================================

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;

-- profiles: cada um lê o próprio perfil; admin lê todos (para métricas)
create policy profiles_select_own_or_admin on public.profiles
  for select using (id = auth.uid() or public.is_admin());

create policy profiles_update_own on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- projects: cada um mexe só nos próprios; admin só lê (read-only) os de todos
create policy projects_select_own_or_admin on public.projects
  for select using (user_id = auth.uid() or public.is_admin());

create policy projects_insert_own on public.projects
  for insert with check (user_id = auth.uid());

create policy projects_update_own on public.projects
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy projects_delete_own on public.projects
  for delete using (user_id = auth.uid());

-- tasks: mesmo padrão de projects
create policy tasks_select_own_or_admin on public.tasks
  for select using (user_id = auth.uid() or public.is_admin());

create policy tasks_insert_own on public.tasks
  for insert with check (user_id = auth.uid());

create policy tasks_update_own on public.tasks
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy tasks_delete_own on public.tasks
  for delete using (user_id = auth.uid());

-- =========================================================================
-- 6. RPC: métricas agregadas para o painel super admin (Etapa 4)
--    Já criada agora para não precisar de outra migration depois.
-- =========================================================================

create or replace function public.admin_dashboard_stats()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  result json;
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  select json_build_object(
    'total_users', (select count(*) from public.profiles),
    'total_tasks_done', (select count(*) from public.tasks where status = 'done'),
    'total_tasks_active', (select count(*) from public.tasks where status in ('todo', 'doing')),
    'active_users_7d', (
      select count(distinct user_id) from public.tasks where created_at >= now() - interval '7 days'
    ),
    'avg_tasks_per_user', (
      select case when count(distinct user_id) = 0 then 0
        else round(count(*)::numeric / count(distinct user_id), 2) end
      from public.tasks
    )
  ) into result;

  return result;
end;
$$;

revoke all on function public.admin_dashboard_stats() from public;
grant execute on function public.admin_dashboard_stats() to authenticated;
