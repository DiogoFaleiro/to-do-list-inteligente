-- To-Do List Inteligente — histórico de desfechos de certificado (renovado/perdido)
-- Rode este arquivo inteiro, uma única vez, no SQL Editor do seu projeto Supabase
-- (depois de já ter rodado 0001 a 0020).

-- Hoje campaign_clients.status guarda só o desfecho MAIS RECENTE do ciclo de
-- certificado ('pendente' → 'avisado' → 'renovado'/'perdido'). Depois de uma
-- renovação, o ciclo reinicia e o client volta o status para 'pendente' (novo
-- cert_expiry, nova régua de alerta) — nesse momento o fato "este cliente
-- renovou em tal data, com tal validade anterior" se perde, porque não há
-- coluna que preserve estado passado. certificate_outcomes é para status de
-- certificado o mesmo que task_completions (0011_recurrence_todoist.sql) é
-- para tasks recorrentes: renovação/perda é um EVENTO que se registra, não um
-- estado que se sobrescreve, exatamente porque o ciclo devolve o registro
-- "vivo" (campaign_clients) para um estado neutro em seguida.
create table if not exists public.certificate_outcomes (
  id uuid primary key default gen_random_uuid(),
  campaign_client_id uuid not null references public.campaign_clients (id) on delete cascade,
  -- Desnormalizado de propósito: permite agregar desfechos por campanha
  -- (ex: taxa de renovação de uma campanha) sem join em campaign_clients.
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  outcome text not null check (outcome in ('renovado', 'perdido')),
  occurred_on date not null default current_date,
  previous_expiry date,
  new_expiry date,
  created_at timestamptz not null default now()
);

create index if not exists certificate_outcomes_user_occurred_on_idx
  on public.certificate_outcomes (user_id, occurred_on);
create index if not exists certificate_outcomes_campaign_occurred_on_idx
  on public.certificate_outcomes (campaign_id, occurred_on);
create index if not exists certificate_outcomes_campaign_client_id_idx
  on public.certificate_outcomes (campaign_client_id);

alter table public.certificate_outcomes enable row level security;

-- Só select/insert/delete — é um log de desfechos, não faz sentido editar uma
-- entrada já registrada (igual a task_completions). Uma correção se faz
-- apagando a linha errada e inserindo uma nova, nunca com update.
drop policy if exists certificate_outcomes_select_own on public.certificate_outcomes;
create policy certificate_outcomes_select_own on public.certificate_outcomes
  for select using (user_id = auth.uid());

drop policy if exists certificate_outcomes_insert_own on public.certificate_outcomes;
create policy certificate_outcomes_insert_own on public.certificate_outcomes
  for insert with check (user_id = auth.uid());

drop policy if exists certificate_outcomes_delete_own on public.certificate_outcomes;
create policy certificate_outcomes_delete_own on public.certificate_outcomes
  for delete using (user_id = auth.uid());

-- Backfill: campaign_clients que já estão 'renovado'/'perdido' hoje não têm
-- nenhum evento registrado (a tabela não existia antes). Cria-se uma linha
-- por cliente nesse estado, com occurred_on = hoje — a data real do desfecho
-- não foi guardada em lugar nenhum antes desta migration, então hoje é a
-- melhor aproximação disponível, não a data real do evento. cert_expiry vira
-- previous_expiry (validade que estava valendo quando o desfecho ocorreu);
-- new_expiry fica null porque não há registro de qual teria sido a nova
-- validade combinada.
insert into public.certificate_outcomes
  (campaign_client_id, campaign_id, user_id, outcome, occurred_on, previous_expiry)
select id, campaign_id, user_id, status, current_date, cert_expiry
from public.campaign_clients
where status in ('renovado', 'perdido');
