-- ========================================
-- 既存ユーザーの同期
-- ========================================
--
-- 目的: トリガー設定前に作成されたauth.usersのユーザーを
--      public.usersテーブルに同期する
--
-- 作成日: 2025-11-12
-- ========================================

-- auth.usersに存在するが、public.usersに存在しないユーザーを挿入
with inserted_users as (
  insert into public.users (id, email, name, created_at, updated_at)
  select
    au.id,
    au.email,
    coalesce(
      au.raw_user_meta_data->>'name',
      au.raw_user_meta_data->>'full_name',
      split_part(au.email, '@', 1)
    ) as name,
    au.created_at,
    au.updated_at
  from auth.users au
  left join public.users pu on au.id = pu.id
  where pu.id is null
  returning *
)
-- 実際に挿入されたユーザー数を表示
select count(*) as synced_users from inserted_users;
