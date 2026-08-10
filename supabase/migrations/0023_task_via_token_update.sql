-- To-Do List Inteligente — token de API: hora/descrição na criação + atualização
-- Rode este arquivo inteiro, uma única vez, no SQL Editor do seu projeto Supabase
-- (depois de já ter rodado 0001 a 0022).

-- Contexto: o app "Rotina Espiritual" vai enviar revisitas do ministério via
-- create_task_via_token. O contrato atual só aceita título e data, faltando
-- hora da visita e descrição (telefone/endereço), e não existe forma de
-- corrigir a tarefa quando a revisita é remarcada.
--
-- description (text) e due_time (time) já existem em public.tasks desde
-- 0012_description_comments.sql e 0011_recurrence_todoist.sql — nenhuma
-- coluna nova é necessária aqui.

-- 1. Precisa dropar a assinatura antiga antes de recriar: adicionar
--    parâmetros por si só criaria uma função sobrecarregada (mesmo nome,
--    assinatura diferente) em vez de substituir, o que deixa o PostgREST
--    ambíguo sobre qual create_task_via_token(text, text, date[, ...])
--    chamar via RPC.
drop function if exists public.create_task_via_token(text, text, date);

create or replace function public.create_task_via_token(
  p_token       text,
  p_title       text,
  p_due_date    date default null,
  p_due_time    time default null,
  p_description text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_row public.api_tokens;
  v_task_id uuid;
begin
  select * into v_row from public.api_tokens where token_hash = encode(digest(p_token, 'sha256'), 'hex');

  if not found then
    raise exception 'Token inválido';
  end if;

  insert into public.tasks (user_id, project_id, session_id, title, due_date, due_time, description, recurring, status, completed_date)
  values (v_row.user_id, v_row.project_id, v_row.session_id, p_title, p_due_date, p_due_time, p_description, false, 'todo', null)
  returning id into v_task_id;

  update public.api_tokens set last_used_at = now() where id = v_row.id;

  return v_task_id;
end;
$$;

grant execute on function public.create_task_via_token(text, text, date, time, text) to anon;

-- 2. Atualiza uma tarefa já criada por token (ex: revisita remarcada). Só
--    mexe na tarefa se ela pertencer ao project_id/session_id gravados no
--    próprio token — um token vazado não pode editar tarefa de outro
--    projeto. Campos não informados (null) preservam o valor atual via
--    coalesce, permitindo atualização parcial. Nunca toca em status/
--    recurring: se o usuário já concluiu a tarefa no app, a integração
--    externa não deve reabri-la.
create or replace function public.update_task_via_token(
  p_token       text,
  p_task_id     uuid,
  p_title       text default null,
  p_due_date    date default null,
  p_due_time    time default null,
  p_description text default null
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_row public.api_tokens;
  v_updated boolean;
begin
  select * into v_row from public.api_tokens where token_hash = encode(digest(p_token, 'sha256'), 'hex');

  if not found then
    raise exception 'Token inválido';
  end if;

  update public.tasks
  set
    title = coalesce(p_title, title),
    due_date = coalesce(p_due_date, due_date),
    due_time = coalesce(p_due_time, due_time),
    description = coalesce(p_description, description)
  where id = p_task_id
    and user_id = v_row.user_id
    and project_id is not distinct from v_row.project_id
    and session_id is not distinct from v_row.session_id;

  v_updated := found;

  if v_updated then
    update public.api_tokens set last_used_at = now() where id = v_row.id;
  end if;

  return v_updated;
end;
$$;

grant execute on function public.update_task_via_token(text, uuid, text, date, time, text) to anon;
