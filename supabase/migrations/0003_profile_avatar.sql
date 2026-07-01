-- To-Do List Inteligente — nome de exibição + foto de avatar
-- Rode este arquivo inteiro, uma única vez, no SQL Editor do seu projeto Supabase
-- (depois de já ter rodado 0001_init.sql e 0002_admin_dashboard.sql).

-- =========================================================================
-- 1. Colunas novas em profiles
-- =========================================================================

alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists avatar_url text;

-- Sem mudança de RLS necessária aqui: a policy profiles_update_own já
-- existente (id = auth.uid()) já permite ao usuário atualizar essas
-- colunas no próprio perfil.

-- =========================================================================
-- 2. Bucket de Storage para fotos de avatar (leitura pública, escrita
--    restrita à própria pasta do usuário: avatars/<user_id>/arquivo)
-- =========================================================================

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy avatars_public_read on storage.objects
  for select using (bucket_id = 'avatars');

create policy avatars_insert_own on storage.objects
  for insert with check (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy avatars_update_own on storage.objects
  for update using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy avatars_delete_own on storage.objects
  for delete using (
    bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
  );
