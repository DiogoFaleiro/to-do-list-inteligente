-- To-Do List Inteligente — remove validade/expiração de vouchers
-- Rode este arquivo inteiro, uma única vez, no SQL Editor do seu projeto Supabase
-- (depois de já ter rodado 0001 a 0019).

-- Vouchers deste catálogo não têm data de validade nem "expiram" — a
-- coluna valid_until e o status 'expirado' (0019_vouchers.sql) partiram de
-- uma suposição errada sobre o negócio. Reclassifica qualquer voucher que
-- já esteja como 'expirado' pra 'disponivel' ANTES de trocar o check
-- constraint (senão a ALTER abaixo falha se existir alguma linha assim).
update public.vouchers set status = 'disponivel' where status = 'expirado';

alter table public.vouchers drop constraint if exists vouchers_status_check;
alter table public.vouchers
  add constraint vouchers_status_check
  check (status in ('disponivel', 'reservado', 'vendido'));

alter table public.vouchers drop column if exists valid_until;
