-- To-Do List Inteligente — Campanhas de atualizacao de sistema (kind 'atualizacao')
-- Rode este arquivo inteiro, uma unica vez, no SQL Editor do seu projeto Supabase
-- (depois de ja ter rodado 0001 a 0023).

-- Terceiro "kind" de campanha, ao lado de "vendas" (0015_campanhas.sql) e
-- "certificados" (0017_campanhas_certificados.sql): acompanha a atualizacao
-- de um sistema (VELO, DF VENDAS, LINK PRO, ou qualquer sistema futuro) junto
-- a uma carteira de clientes. Diferente de certificados (date-driven no
-- boot, guiado por cert_expiry/alert_days), a automacao de "atualizacao" e
-- status-driven: a tarefa de follow-up nasce quando o cliente e marcado como
-- 'agendado', usando scheduled_at como data/hora do agendamento.
-- followup_task_id (0015_campanhas.sql) continua sendo o mecanismo de
-- idempotencia nos tres kinds: antes de criar a tarefa de follow-up, a
-- automacao verifica se followup_task_id ja esta preenchido.

alter table public.campaigns
  add column if not exists system_name text,
  add column if not exists target_version text;

-- system_name e texto livre (sem CHECK) de proposito: novos sistemas (alem
-- de VELO / DF VENDAS / LINK PRO) devem poder ser cadastrados direto pela UI,
-- sem precisar de uma migration a cada sistema novo.

alter table public.campaign_clients
  add column if not exists scheduled_at timestamptz,
  add column if not exists updated_on date;

-- scheduled_at: data e hora combinadas com o cliente para a atualizacao.
-- updated_on: data em que a atualizacao foi de fato realizada.

alter table public.campaigns drop constraint if exists campaigns_kind_check;
alter table public.campaigns
  add constraint campaigns_kind_check
  check (kind in ('vendas', 'certificados', 'atualizacao'));

alter table public.campaign_clients drop constraint if exists campaign_clients_status_check;
alter table public.campaign_clients
  add constraint campaign_clients_status_check
  check (status in (
    'sem_resposta', 'respondeu', 'trial', 'convertido', 'recusou',
    'pendente', 'avisado', 'renovado', 'perdido',
    'agendado', 'atualizado', 'nao_localizado'
  ));

-- Lista acumulada de campaigns.kind (para a proxima migration nao precisar
-- cacar no historico): 'vendas', 'certificados', 'atualizacao'.
-- Lista acumulada de campaign_clients.status: 'sem_resposta', 'respondeu',
-- 'trial', 'convertido', 'recusou', 'pendente', 'avisado', 'renovado',
-- 'perdido', 'agendado', 'atualizado', 'nao_localizado'.

-- A validade semantica de qual subconjunto de status vale para qual kind e
-- responsabilidade do client (igual a separacao ja feita entre vendas e
-- certificados) — o banco continua deliberadamente permissivo aqui, sem
-- acoplar este check a "kind".
