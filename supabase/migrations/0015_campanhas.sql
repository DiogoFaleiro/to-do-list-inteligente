-- To-Do List Inteligente — campanhas de follow-up de trial
-- Rode este arquivo inteiro, uma única vez, no SQL Editor do seu projeto Supabase
-- (depois de já ter rodado 0001 a 0014).

-- Uma campanha agrupa um lote de clientes em trial que recebem até 3
-- mensagens de follow-up automatizadas. followup_project_id/session_id
-- apontam pra onde as tarefas de follow-up de cada cliente são criadas.

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  trial_days integer not null default 7 check (trial_days between 1 and 90),
  followup_project_id uuid references public.projects (id) on delete set null,
  followup_session_id uuid references public.sessions (id) on delete set null,
  fup1_date date,
  fup2_date date,
  fup3_date date,
  fup1_message text,
  fup2_message text,
  fup3_message text,
  status text not null default 'ativa' check (status in ('ativa', 'encerrada')),
  created_at timestamptz not null default now()
);

-- Métricas (respondeu, converteu, mrr total, etc.) NÃO são colunas aqui —
-- são calculadas no client a partir da contagem de campaign_clients por
-- status, igual ao badge de contagem de projeto. Evita duas fontes de
-- verdade (coluna agregada vs. linhas reais) ficarem dessincronizadas.
create table if not exists public.campaign_clients (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  conexa_id text,
  name text not null,
  phone text,
  plan text,
  status text not null default 'sem_resposta'
    check (status in ('sem_resposta', 'respondeu', 'trial', 'convertido', 'recusou')),
  fup1_sent boolean not null default false,
  fup2_sent boolean not null default false,
  fup3_sent boolean not null default false,
  trial_start date,
  -- Referencia a tarefa de follow-up já criada pra este cliente: permite que
  -- a automação de trial seja rodada de novo (ex: reprocessar o dia) sem
  -- duplicar a tarefa — ela verifica se followup_task_id já está preenchido
  -- antes de criar uma nova.
  followup_task_id uuid references public.tasks (id) on delete set null,
  mrr numeric not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists campaigns_user_id_idx on public.campaigns (user_id);
create index if not exists campaign_clients_campaign_id_idx on public.campaign_clients (campaign_id);

alter table public.campaigns enable row level security;

drop policy if exists campaigns_select_own on public.campaigns;
create policy campaigns_select_own on public.campaigns
  for select using (user_id = auth.uid());

drop policy if exists campaigns_insert_own on public.campaigns;
create policy campaigns_insert_own on public.campaigns
  for insert with check (user_id = auth.uid());

drop policy if exists campaigns_update_own on public.campaigns;
create policy campaigns_update_own on public.campaigns
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists campaigns_delete_own on public.campaigns;
create policy campaigns_delete_own on public.campaigns
  for delete using (user_id = auth.uid());

alter table public.campaign_clients enable row level security;

drop policy if exists campaign_clients_select_own on public.campaign_clients;
create policy campaign_clients_select_own on public.campaign_clients
  for select using (user_id = auth.uid());

drop policy if exists campaign_clients_insert_own on public.campaign_clients;
create policy campaign_clients_insert_own on public.campaign_clients
  for insert with check (user_id = auth.uid());

drop policy if exists campaign_clients_update_own on public.campaign_clients;
create policy campaign_clients_update_own on public.campaign_clients
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists campaign_clients_delete_own on public.campaign_clients;
create policy campaign_clients_delete_own on public.campaign_clients
  for delete using (user_id = auth.uid());
