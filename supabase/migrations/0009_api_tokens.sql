-- To-Do List Inteligente — tokens pessoais de API
-- Rode este arquivo inteiro, uma única vez, no SQL Editor do seu projeto Supabase
-- (depois de já ter rodado 0001 a 0008).

-- Permite que uma automação externa (ex: um agente agendado que lê e-mail e
-- cria tarefas) crie tarefas nesta conta sem usar login/senha reais — cada
-- token nasce vinculado a um projeto/sessão fixos, escolhidos na hora de
-- gerar o token, e só serve pra criar tarefa (nada de ler/editar/apagar).

create extension if not exists pgcrypto;

create table if not exists public.api_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  token_hash text not null unique,
  project_id uuid references public.projects (id) on delete set null,
  session_id uuid references public.sessions (id) on delete set null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create index if not exists api_tokens_user_id_idx on public.api_tokens (user_id);

alter table public.api_tokens enable row level security;

-- Só metadados (nome, projeto, datas) ficam visíveis pro dono — token_hash
-- nunca é exposto de volta pelo select (nem seria útil: é só o hash).
drop policy if exists api_tokens_select_own on public.api_tokens;
create policy api_tokens_select_own on public.api_tokens
  for select using (user_id = auth.uid());

drop policy if exists api_tokens_insert_own on public.api_tokens;
create policy api_tokens_insert_own on public.api_tokens
  for insert with check (user_id = auth.uid());

-- Sem policy de update: revogar um token é excluir a linha (a função de
-- criar tarefa simplesmente não encontra mais o hash correspondente).
drop policy if exists api_tokens_delete_own on public.api_tokens;
create policy api_tokens_delete_own on public.api_tokens
  for delete using (user_id = auth.uid());

-- Gera um novo token pro usuário logado (chamado normalmente, com sessão
-- autenticada, pela tela de Integrações). Retorna o valor em texto puro —
-- essa é a ÚNICA vez que ele existe fora do hash; o app precisa mostrar e
-- descartar, nunca persistir o texto puro em lugar nenhum.
create or replace function public.create_api_token(p_name text, p_project_id uuid, p_session_id uuid)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_token text;
begin
  v_token := 'todo_' || encode(gen_random_bytes(24), 'hex');

  insert into public.api_tokens (user_id, name, token_hash, project_id, session_id)
  values (auth.uid(), p_name, encode(digest(v_token, 'sha256'), 'hex'), p_project_id, p_session_id);

  return v_token;
end;
$$;

-- Cria uma tarefa a partir de um token (chamada por um script externo, SEM
-- sessão autenticada — só com a chave publicável do Supabase). O projeto/
-- sessão/usuário vêm do próprio token já cadastrado, nunca de parâmetro do
-- chamador, então nem um token vazado permite escrever fora do que foi
-- configurado na hora de gerá-lo.
create or replace function public.create_task_via_token(p_token text, p_title text, p_due_date date default null)
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

  insert into public.tasks (user_id, project_id, session_id, title, due_date, recurring, status, completed_date)
  values (v_row.user_id, v_row.project_id, v_row.session_id, p_title, p_due_date, false, 'todo', null)
  returning id into v_task_id;

  update public.api_tokens set last_used_at = now() where id = v_row.id;

  return v_task_id;
end;
$$;

grant execute on function public.create_task_via_token(text, text, date) to anon;
