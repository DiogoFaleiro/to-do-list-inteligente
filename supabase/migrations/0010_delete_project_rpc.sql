-- To-Do List Inteligente — exclusão atômica de projeto (tarefas + projeto)
-- Rode este arquivo inteiro, uma única vez, no SQL Editor do seu projeto Supabase
-- (depois de já ter rodado 0001 a 0009).

-- Hoje js/store.js (deleteProject) faz duas chamadas sequenciais — apagar
-- as tarefas do projeto, depois apagar o projeto — porque tasks.project_id
-- é "on delete set null" (0001_init.sql), não cascade: excluir só o projeto
-- deixaria as tarefas órfãs (sem projeto) em vez de apagadas. Isso não é
-- atômico: se a rede cair entre as duas chamadas, o projeto continua
-- existindo já sem nenhuma tarefa. Esta função faz as duas exclusões dentro
-- de uma única chamada — como é um só statement (uma função), o Postgres já
-- executa tudo numa única transação implícita: ou as duas exclusões
-- acontecem, ou nenhuma.

create or replace function public.delete_project_cascade(p_project_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.projects where id = p_project_id and user_id = auth.uid()
  ) then
    raise exception 'Projeto não encontrado ou sem permissão';
  end if;

  delete from public.tasks where project_id = p_project_id;
  delete from public.projects where id = p_project_id;
end;
$$;

grant execute on function public.delete_project_cascade(uuid) to authenticated;
