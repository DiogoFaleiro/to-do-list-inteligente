-- To-Do List Inteligente — lotes de vouchers e vouchers individuais
-- Rode este arquivo inteiro, uma única vez, no SQL Editor do seu projeto Supabase
-- (depois de já ter rodado 0001 a 0018).

-- Um "lote" (voucher_batches) representa um produto/importação (ex: um CSV
-- de vouchers "A1 - VIDEOCONFERENCIA"). default_cost_price/default_sale_price
-- aqui servem só de valor inicial no momento do import — cada voucher tem
-- seus próprios cost_price/sale_price editáveis depois, então mudar o
-- default do lote não altera vouchers já importados.
create table if not exists public.voucher_batches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text,
  default_cost_price numeric not null default 0,
  default_sale_price numeric not null default 0,
  status text not null default 'ativo' check (status in ('ativo', 'encerrado')),
  created_at timestamptz not null default now()
);

-- Métricas do lote (total de vouchers, quantos vendidos, receita, lucro) NÃO
-- são colunas aqui — são sempre calculadas no client a partir dos vouchers
-- (status/cost_price/sale_price), pra nunca dessincronizar de um valor
-- agregado guardado à parte.
create table if not exists public.vouchers (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.voucher_batches (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  code text not null,
  cost_price numeric not null default 0,
  sale_price numeric not null default 0,
  status text not null default 'disponivel' check (status in ('disponivel', 'reservado', 'vendido', 'expirado')),
  valid_until date,
  notes text,
  created_at timestamptz not null default now(),
  unique (user_id, code)
);

create index if not exists vouchers_batch_id_idx on public.vouchers (batch_id);
create index if not exists vouchers_user_id_status_idx on public.vouchers (user_id, status);

alter table public.voucher_batches enable row level security;
alter table public.vouchers enable row level security;

drop policy if exists voucher_batches_select_own on public.voucher_batches;
create policy voucher_batches_select_own on public.voucher_batches
  for select using (user_id = auth.uid());

drop policy if exists voucher_batches_insert_own on public.voucher_batches;
create policy voucher_batches_insert_own on public.voucher_batches
  for insert with check (user_id = auth.uid());

drop policy if exists voucher_batches_update_own on public.voucher_batches;
create policy voucher_batches_update_own on public.voucher_batches
  for update using (user_id = auth.uid());

drop policy if exists voucher_batches_delete_own on public.voucher_batches;
create policy voucher_batches_delete_own on public.voucher_batches
  for delete using (user_id = auth.uid());

drop policy if exists vouchers_select_own on public.vouchers;
create policy vouchers_select_own on public.vouchers
  for select using (user_id = auth.uid());

drop policy if exists vouchers_insert_own on public.vouchers;
create policy vouchers_insert_own on public.vouchers
  for insert with check (user_id = auth.uid());

drop policy if exists vouchers_update_own on public.vouchers;
create policy vouchers_update_own on public.vouchers
  for update using (user_id = auth.uid());

drop policy if exists vouchers_delete_own on public.vouchers;
create policy vouchers_delete_own on public.vouchers
  for delete using (user_id = auth.uid());
