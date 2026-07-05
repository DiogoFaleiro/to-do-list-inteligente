-- To-Do List Inteligente — corrige a policy de inserir vínculo tarefa-etiqueta
-- Rode este arquivo inteiro, uma única vez, no SQL Editor do seu projeto Supabase
-- (depois de já ter rodado 0001 a 0007).

-- A policy `task_tags_insert_own` (0005_tags.sql) só conferia que a TAREFA
-- era do usuário, mas não conferia que a ETIQUETA também era — ou seja, um
-- usuário poderia, em teoria, vincular sua própria tarefa a uma etiqueta de
-- outro usuário (se soubesse o UUID dela). Isso não expõe dado nenhum (a
-- policy de select da etiqueta continua bloqueando ver nome/cor), mas é uma
-- inconsistência: agora a inserção também exige que a etiqueta seja sua.

drop policy if exists task_tags_insert_own on public.task_tags;

create policy task_tags_insert_own on public.task_tags
  for insert with check (
    exists (select 1 from public.tasks t where t.id = task_id and t.user_id = auth.uid())
    and exists (select 1 from public.tags g where g.id = tag_id and g.user_id = auth.uid())
  );
