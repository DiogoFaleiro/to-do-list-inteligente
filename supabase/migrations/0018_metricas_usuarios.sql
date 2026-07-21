-- To-Do List Inteligente — métricas detalhadas por usuário para o painel admin
-- Rode este arquivo inteiro, uma única vez, no SQL Editor do seu projeto Supabase
-- (depois de já ter rodado 0001 a 0017).
--
-- Definição canônica usada em toda esta migration:
--   conclusão = tarefa done + cada linha de task_completions
--   (recorrentes concluídas contam individualmente).
-- Até aqui o admin_user_list (0002) só contava tasks.status = 'done', então
-- toda conclusão de recorrente (que nunca vira 'done' enquanto a regra segue
-- ativa — ver App.recurrence.nextOccurrence) ficava de fora da contagem por
-- usuário. Esta migration corrige isso e adiciona uma métrica detalhada por
-- usuário (por projeto / por semana / por mês) para o painel admin.

-- =========================================================================
-- 1. RPC: métricas detalhadas de um usuário específico (para o admin abrir
--    o "drill-down" de um usuário no painel).
-- =========================================================================

create or replace function public.admin_user_metrics(p_user_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  result json;
  v_total_done bigint;
  v_total_recurring_completions bigint;
  v_by_project json;
  v_by_week json;
  v_by_month json;
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  select count(*) into v_total_done
  from public.tasks
  where user_id = p_user_id and status = 'done';

  select count(*) into v_total_recurring_completions
  from public.task_completions
  where user_id = p_user_id;

  -- by_project: junta tasks done (agrupadas por projeto) com task_completions
  -- (join em tasks pra descobrir o projeto de cada conclusão de recorrente).
  with done_by_project as (
    select project_id, count(*) as done
    from public.tasks
    where user_id = p_user_id and status = 'done'
    group by project_id
  ),
  completions_by_project as (
    select t.project_id, count(*) as recurring_completions
    from public.task_completions tc
    join public.tasks t on t.id = tc.task_id
    where tc.user_id = p_user_id
    group by t.project_id
  ),
  combined as (
    select
      coalesce(d.project_id, c.project_id) as project_id,
      coalesce(d.done, 0) as done,
      coalesce(c.recurring_completions, 0) as recurring_completions
    from done_by_project d
    full outer join completions_by_project c on c.project_id = d.project_id
  )
  select json_agg(
    json_build_object(
      'project_id', combined.project_id,
      'project_name', p.name,
      'done', combined.done,
      'recurring_completions', combined.recurring_completions
    )
  ) into v_by_project
  from combined
  left join public.projects p on p.id = combined.project_id;

  -- by_week: últimas 12 semanas (semana começando na segunda, padrão
  -- date_trunc('week', ...) do Postgres), somando done (por completed_date)
  -- e completions (por completed_on) na mesma semana.
  with weeks as (
    select generate_series(
      date_trunc('week', current_date) - interval '11 weeks',
      date_trunc('week', current_date),
      interval '1 week'
    )::date as week_start
  ),
  done_by_week as (
    select date_trunc('week', completed_date)::date as week_start, count(*) as done
    from public.tasks
    where user_id = p_user_id and status = 'done' and completed_date is not null
    group by 1
  ),
  completions_by_week as (
    select date_trunc('week', completed_on)::date as week_start, count(*) as completions
    from public.task_completions
    where user_id = p_user_id
    group by 1
  )
  select json_agg(
    json_build_object(
      'week_start', w.week_start,
      'count', coalesce(d.done, 0) + coalesce(c.completions, 0)
    ) order by w.week_start
  ) into v_by_week
  from weeks w
  left join done_by_week d on d.week_start = w.week_start
  left join completions_by_week c on c.week_start = w.week_start;

  -- by_month: últimos 12 meses, mesmo formato do by_week.
  with months as (
    select generate_series(
      date_trunc('month', current_date) - interval '11 months',
      date_trunc('month', current_date),
      interval '1 month'
    )::date as month_start
  ),
  done_by_month as (
    select date_trunc('month', completed_date)::date as month_start, count(*) as done
    from public.tasks
    where user_id = p_user_id and status = 'done' and completed_date is not null
    group by 1
  ),
  completions_by_month as (
    select date_trunc('month', completed_on)::date as month_start, count(*) as completions
    from public.task_completions
    where user_id = p_user_id
    group by 1
  )
  select json_agg(
    json_build_object(
      'month_start', m.month_start,
      'count', coalesce(d.done, 0) + coalesce(c.completions, 0)
    ) order by m.month_start
  ) into v_by_month
  from months m
  left join done_by_month d on d.month_start = m.month_start
  left join completions_by_month c on c.month_start = m.month_start;

  select json_build_object(
    'total_done', v_total_done,
    'total_recurring_completions', v_total_recurring_completions,
    'total_completions', v_total_done + v_total_recurring_completions,
    'by_project', coalesce(v_by_project, '[]'::json),
    'by_week', coalesce(v_by_week, '[]'::json),
    'by_month', coalesce(v_by_month, '[]'::json)
  ) into result;

  return result;
end;
$$;

-- =========================================================================
-- 2. Corrige admin_user_list (0002): done_tasks passava só tasks.status =
--    'done', deixando de fora conclusões de recorrentes (que ficam
--    registradas em task_completions e nunca viram 'done' enquanto a regra
--    segue ativa). Mesma assinatura de 0002 — CREATE OR REPLACE no lugar.
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
      coalesce(tk.done, 0) + coalesce(tc.total, 0) as done_tasks,
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
    left join (
      select user_id, count(*) as total
      from public.task_completions
      group by user_id
    ) as tc on tc.user_id = p.id
    order by p.created_at asc;
end;
$$;

-- =========================================================================
-- 3. GRANTs — lição registrada: SECURITY DEFINER sem grant explícito dá erro
--    de permissão real pro client (RPC "permission denied"), mesmo com a
--    função existindo e o is_admin() passando. Reafirma o grant de
--    admin_user_list também (inofensivo — CREATE OR REPLACE preserva grants
--    de assinatura inalterada, mas mantém a migration correta mesmo se um
--    dia a assinatura mudar).
-- =========================================================================

revoke all on function public.admin_user_metrics(uuid) from public;
grant execute on function public.admin_user_metrics(uuid) to authenticated;

revoke all on function public.admin_user_list() from public;
grant execute on function public.admin_user_list() to authenticated;
