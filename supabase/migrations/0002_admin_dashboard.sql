-- To-Do List Inteligente — métricas extras para o novo painel admin (/admin)
-- Rode este arquivo inteiro, uma única vez, no SQL Editor do seu projeto Supabase
-- (depois de já ter rodado 0001_init.sql).

-- =========================================================================
-- 1. RPC: tarefas concluídas agrupadas por dia da semana
--    dow segue o padrão do Postgres: 0 = domingo, 1 = segunda, ..., 6 = sábado.
-- =========================================================================

create or replace function public.admin_tasks_by_weekday()
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

  select json_agg(x order by x.dow) into result
  from (
    select
      d.dow,
      count(tk.id) as total
    from generate_series(0, 6) as d(dow)
    left join public.tasks tk
      on tk.status = 'done'
      and tk.completed_date is not null
      and extract(dow from tk.completed_date)::int = d.dow
    group by d.dow
  ) as x;

  return result;
end;
$$;

revoke all on function public.admin_tasks_by_weekday() from public;
grant execute on function public.admin_tasks_by_weekday() to authenticated;

-- =========================================================================
-- 2. RPC: lista de usuários cadastrados com totais por usuário
-- =========================================================================

create or replace function public.admin_user_list()
returns table (
  id uuid,
  email text,
  is_admin boolean,
  created_at timestamptz,
  total_projects bigint,
  total_tasks bigint,
  done_tasks bigint,
  active_tasks bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  return query
    select
      p.id,
      p.email,
      p.is_admin,
      p.created_at,
      coalesce(proj.total, 0) as total_projects,
      coalesce(tk.total, 0) as total_tasks,
      coalesce(tk.done, 0) as done_tasks,
      coalesce(tk.active, 0) as active_tasks
    from public.profiles p
    left join (
      select user_id, count(*) as total
      from public.projects
      group by user_id
    ) as proj on proj.user_id = p.id
    left join (
      select
        user_id,
        count(*) as total,
        count(*) filter (where status = 'done') as done,
        count(*) filter (where status in ('todo', 'doing')) as active
      from public.tasks
      group by user_id
    ) as tk on tk.user_id = p.id
    order by p.created_at asc;
end;
$$;

revoke all on function public.admin_user_list() from public;
grant execute on function public.admin_user_list() to authenticated;
