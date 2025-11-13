-- ========================================
-- Supabase Auth自動同期トリガーの設定
-- ========================================
--
-- 目的: auth.usersに新規ユーザーが作成されたときに、
--      自動的にpublic.usersテーブルにもレコードを作成する
--
-- 作成日: 2025-11-12
-- ========================================

-- トリガー関数: auth.usersに新規ユーザーが作成されたときに実行
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  -- public.usersテーブルに新規ユーザーを挿入
  insert into public.users (id, email, name, created_at, updated_at)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'full_name',
      split_part(new.email, '@', 1)  -- フォールバック: emailのユーザー名部分
    ),
    now(),
    now()
  );
  return new;
end;
$$;

-- コメント: 関数の説明
comment on function public.handle_new_user() is 'Supabase Authでユーザーが作成されたときに、public.usersテーブルにも自動的にレコードを作成する';

-- 既存のトリガーを削除（べき等性）
drop trigger if exists on_auth_user_created on auth.users;

-- トリガー: auth.usersにINSERTされたら、handle_new_user()を実行
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- コメント: トリガーの説明
comment on trigger on_auth_user_created on auth.users is 'ユーザー作成時にpublic.usersテーブルへ自動挿入';
