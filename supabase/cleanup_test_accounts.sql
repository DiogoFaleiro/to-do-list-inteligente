-- To-Do List Inteligente — limpeza de contas de teste
-- Script utilitário avulso, NÃO é uma migration (não muda schema, não entra
-- na sequência supabase/migrations/00XX_*.sql). Rode manualmente no SQL
-- Editor do seu projeto Supabase sempre que quiser limpar as contas de
-- teste criadas com alias "+" do Gmail durante testes manuais/automatizados
-- (ex: dfsystemsolucoes+descpreview1783603271@gmail.com), mantendo intacta
-- a conta real (dfsystemsolucoes@gmail.com, sem "+").
--
-- Todas as tabelas relevantes (profiles, projects, tasks, subtasks via
-- parent_task_id, tags, task_tags, sessions, task_comments,
-- task_completions, api_tokens) já têm "on delete cascade" a partir de
-- auth.users (direto ou transitivo via tasks/projects) — apagar a linha em
-- auth.users é suficiente pra apagar tudo que pertence à conta de teste.

-- =========================================================================
-- 1. CONFIRME antes de apagar: rode só este SELECT primeiro e revise a
--    lista inteira. Ajuste o padrão do e-mail abaixo se necessário.
-- =========================================================================
select id, email, created_at
from auth.users
where email ilike 'dfsystemsolucoes+%@gmail.com'
order by created_at;

-- =========================================================================
-- 2. Só depois de conferir que a lista acima é EXATAMENTE o conjunto de
--    contas de teste (nenhuma real misturada), descomente e rode o DELETE
--    abaixo. O padrão "+%@gmail.com" exige um "+" literal no e-mail, então
--    NUNCA bate com a conta real "dfsystemsolucoes@gmail.com" (sem "+").
-- =========================================================================
-- delete from auth.users
-- where email ilike 'dfsystemsolucoes+%@gmail.com';

-- =========================================================================
-- 3. Conferência pós-delete (opcional): deve retornar 0 linhas nas quatro
--    tabelas principais.
-- =========================================================================
-- select count(*) from auth.users where email ilike 'dfsystemsolucoes+%@gmail.com';
-- select count(*) from public.profiles where email ilike 'dfsystemsolucoes+%@gmail.com';
-- select count(*) from public.projects where user_id not in (select id from auth.users);
-- select count(*) from public.tasks where user_id not in (select id from auth.users);


-- =========================================================================
-- VARIANTE B — apaga QUALQUER conta cujo e-mail seja diferente da sua real
-- (dfsystemsolucoes@gmail.com), não só as de alias "+". Mais abrangente e
-- mais perigosa que a Variante A acima: se por algum motivo existir uma
-- conta real de outra pessoa nesse projeto Supabase, ela também seria
-- apagada aqui. Só use isto se tiver certeza de que TODA conta que não é a
-- sua é lixo de teste (ex: app pessoal, uso solo).
-- =========================================================================

-- 1. CONFIRME antes de apagar: rode só este SELECT primeiro e revise a
--    lista inteira.
select id, email, created_at
from auth.users
where lower(email) <> 'dfsystemsolucoes@gmail.com'
order by created_at;

-- 2. Só depois de conferir a lista acima, descomente e rode o DELETE.
-- delete from auth.users
-- where lower(email) <> 'dfsystemsolucoes@gmail.com';

-- 3. Conferência pós-delete (opcional): deve sobrar só a sua conta real.
-- select id, email from auth.users;
