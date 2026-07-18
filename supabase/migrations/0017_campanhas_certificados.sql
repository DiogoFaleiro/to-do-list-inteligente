-- To-Do List Inteligente — campanhas do tipo "certificados" (renovação por validade)
-- Rode este arquivo inteiro, uma única vez, no SQL Editor do seu projeto Supabase
-- (depois de já ter rodado 0001 a 0016).

-- Até aqui toda campanha era do tipo "vendas" (trial → follow-up → convertido).
-- "kind" introduz um segundo tipo, "certificados", cuja automação não é
-- guiada por status (fup1/fup2/fup3 batendo num trial_start) e sim por data:
-- cert_expiry (validade do certificado) + alert_days (quantos dias antes do
-- vencimento avisar) decidem quando gerar o follow-up. Campanhas existentes
-- não têm kind ainda, então o default 'vendas' já faz o backfill.
alter table public.campaigns
  add column if not exists kind text not null default 'vendas'
    check (kind in ('vendas', 'certificados'));

-- Só usado por campanhas kind='certificados'; fica null para 'vendas'.
alter table public.campaigns
  add column if not exists alert_days integer check (alert_days between 1 and 180);

-- Só usado por clientes de campanha kind='certificados'; fica null para 'vendas'.
alter table public.campaign_clients
  add column if not exists cert_expiry date;

-- O status de campaign_clients ganha o vocabulário do fluxo de certificados
-- (pendente/avisado/renovado/perdido) ao lado do vocabulário de vendas já
-- existente (sem_resposta/respondeu/trial/convertido/recusou). A validade
-- semântica de qual subconjunto vale para qual kind é responsabilidade do
-- client (igual à separação de UI entre os dois tipos de campanha) — o banco
-- fica deliberadamente permissivo aqui, sem acoplar este check a "kind", pra
-- não precisar de uma segunda migration toda vez que um novo status for
-- adicionado a um dos dois fluxos.
alter table public.campaign_clients drop constraint if exists campaign_clients_status_check;
alter table public.campaign_clients
  add constraint campaign_clients_status_check
  check (status in (
    'sem_resposta', 'respondeu', 'trial', 'convertido', 'recusou',
    'pendente', 'avisado', 'renovado', 'perdido'
  ));

-- followup_task_id (0015_campanhas.sql) continua sendo o mecanismo de
-- idempotência nos dois tipos: antes de criar a tarefa de follow-up (seja
-- pela régua de trial de vendas, seja pelo alerta de vencimento de
-- certificado), a automação verifica se followup_task_id já está preenchido.
