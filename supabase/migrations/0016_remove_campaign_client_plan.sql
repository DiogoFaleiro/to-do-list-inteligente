-- To-Do List Inteligente — remove a coluna "plan" de campaign_clients
-- Rode este arquivo uma única vez no SQL Editor do seu projeto Supabase
-- (depois de já ter rodado 0001 a 0015).

-- A coluna "plan" (0015_campanhas.sql) nunca chegou a ser preenchida pela
-- planilha do Conexa (removida do import antes deste momento) nem tem uso
-- na UI — a tabela de clientes da campanha e o modal de inclusão manual não
-- a exibem mais. drop column if exists deixa este arquivo seguro de rodar
-- de novo.
alter table public.campaign_clients drop column if exists plan;
