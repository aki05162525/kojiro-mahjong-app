# Supabase Auth自動同期の設定

Supabase Authでユーザーが作成されたときに、自動的に`public.users`テーブルにもレコードを作成する設定

---

## 概要

**問題**:
- Supabase Authでユーザーを作成すると、`auth.users`テーブルにのみ保存される
- アプリの`public.users`テーブルには手動で挿入する必要がある
- これにより、リーグ作成時などに外部キー制約エラーが発生する

**解決策**:
- PostgreSQLトリガーを使って、`auth.users`への挿入を検知
- 自動的に`public.users`にも同じユーザー情報を挿入

---

## タスク1: トリガー関数の作成

### 実行方法

Supabase Studio（`http://127.0.0.1:54323`）の SQL Editor で実行するか、以下のコマンドで実行：

```bash
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -f db/migrations/setup_auth_trigger.sql
```

### SQLファイル: `db/migrations/setup_auth_trigger.sql`

```sql
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
      split_part(new.email, '@', 1)
    ),
    now(),
    now()
  );
  return new;
end;
$$;

-- コメント: 関数の説明
comment on function public.handle_new_user() is 'Supabase Authでユーザーが作成されたときに、public.usersテーブルにも自動的にレコードを作成する';
```

### 学習ポイント

1. **`security definer`**
   - 関数を作成したユーザー（postgres）の権限で実行
   - 通常のユーザーでは`auth.users`にアクセスできないため必要

2. **`set search_path = ''`**
   - セキュリティのため、明示的にスキーマを指定
   - 悪意のあるスキーマへのアクセスを防ぐ

3. **`new.raw_user_meta_data`**
   - サインアップ時にクライアントから送られたメタデータ
   - `{ name: "山田太郎" }` のような形式
   - `->>` 演算子でJSON値を文字列として取得

4. **`coalesce()`**
   - 最初の非NULL値を返す
   - フォールバック処理（name → full_name → emailのユーザー名部分）

### 📚 公式ドキュメント

- [Supabase: Managing User Data](https://supabase.com/docs/guides/auth/managing-user-data)
- [PostgreSQL: Trigger Functions](https://www.postgresql.org/docs/current/plpgsql-trigger.html)

---

## タスク2: トリガーの作成

### SQLファイル: `db/migrations/setup_auth_trigger.sql` に追加

```sql
-- 既存のトリガーを削除（べき等性）
drop trigger if exists on_auth_user_created on auth.users;

-- トリガー: auth.usersにINSERTされたら、handle_new_user()を実行
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- コメント: トリガーの説明
comment on trigger on_auth_user_created on auth.users is 'ユーザー作成時にpublic.usersテーブルへ自動挿入';
```

### 学習ポイント

1. **`after insert`**
   - `auth.users`にレコードが挿入された**後**に実行
   - `before insert`だと、まだ`new.id`が確定していない可能性がある

2. **`for each row`**
   - 挿入された各行ごとに関数を実行
   - 複数ユーザーを一度に作成した場合も対応

3. **べき等性**
   - `drop trigger if exists`で既存トリガーを削除
   - 何度実行してもエラーにならない

### 📚 公式ドキュメント

- [PostgreSQL: CREATE TRIGGER](https://www.postgresql.org/docs/current/sql-createtrigger.html)

---

## タスク3: 実行と動作確認

### 3-1: SQLを実行

**方法A: Supabase Studio**

1. ブラウザで `http://127.0.0.1:54323` を開く
2. 左メニュー > SQL Editor
3. `setup_auth_trigger.sql`の内容をコピペ
4. Run

**方法B: psqlコマンド**

```bash
# ファイルから実行
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -f db/migrations/setup_auth_trigger.sql

# または直接実行
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres << 'EOF'
-- SQLの内容をここに貼り付け
EOF
```

### 3-2: トリガーが作成されたか確認

```bash
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -c "
SELECT
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
"
```

**期待される結果**:
```
    trigger_name     | event_manipulation | event_object_table
---------------------+--------------------+--------------------
 on_auth_user_created | INSERT             | users
```

### 3-3: テストユーザーを作成

```bash
# .env.localから環境変数を読み込む
SUPABASE_URL=$(grep NEXT_PUBLIC_SUPABASE_URL .env.local | cut -d '=' -f2)
SUPABASE_ANON_KEY=$(grep NEXT_PUBLIC_SUPABASE_ANON_KEY .env.local | cut -d '=' -f2)

# サインアップ
curl -X POST "${SUPABASE_URL}/auth/v1/signup" \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test2@example.com",
    "password": "password123",
    "data": {
      "name": "テストユーザー2"
    }
  }'
```

### 3-4: `public.users`に自動挿入されたか確認

```bash
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -c "
SELECT id, email, name, created_at
FROM public.users
WHERE email = 'test2@example.com';
"
```

**期待される結果**:
```
                  id                  |       email        |      name       |         created_at
--------------------------------------+--------------------+-----------------+----------------------------
 xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx | test2@example.com  | テストユーザー2 | 2025-11-12 16:30:00.123456
```

✅ レコードが存在すれば成功！

---

## タスク4: 既存ユーザーのマイグレーション（オプション）

トリガーを設定する前に作成したユーザーは自動挿入されていません。手動で同期します。

### SQLファイル: `db/migrations/sync_existing_users.sql`

```sql
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
```

**ポイント**: `WITH ... RETURNING *` を使うことで、実際に挿入された行数だけをカウントします。

### 実行

```bash
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -f db/migrations/sync_existing_users.sql
```

---

## タスク5: Drizzleマイグレーションに追加（推奨）

トリガーをDrizzleマイグレーションとして管理すると、他の環境でも簡単に適用できます。

### 手順

```bash
# 新しいマイグレーションファイルを作成
bun run db:generate
```

生成されたマイグレーションファイル（例: `drizzle/0001_setup_auth_trigger.sql`）に上記のSQLを追加：

```sql
-- トリガー関数
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.users (id, email, name, created_at, updated_at)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'full_name',
      split_part(new.email, '@', 1)
    ),
    now(),
    now()
  );
  return new;
end;
$$;

-- トリガー
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
```

### マイグレーション実行

```bash
bun run db:migrate
```

---

## トラブルシューティング

### エラー: `permission denied for table auth.users`

**原因**: 関数が`security definer`になっていない

**解決**: SQLに`security definer`を追加

### エラー: `null value in column "name" violates not-null constraint`

**原因**: メタデータに`name`が含まれていない

**解決**:
1. サインアップ時に`data.name`を送信
2. または、`coalesce()`のフォールバック処理を確認

### トリガーが実行されない

**確認**:
```sql
-- トリガーが有効か確認
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
```

**デバッグ**:

トリガー関数は直接実行できません（TG_TABLE_NAME、NEWなどのトリガーコンテキストが必要）。テストするには実際にauth.usersにレコードを挿入します：

```bash
# テストユーザーをサインアップ（上記の3-3を参照）
# または、Supabase Dashboardで手動作成

# その後、public.usersに自動挿入されたか確認
psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -c "
SELECT id, email, name FROM public.users ORDER BY created_at DESC LIMIT 1;
"
```

**関数のロジックだけテストしたい場合**:

```sql
-- テスト用のラッパー関数を作成
CREATE OR REPLACE FUNCTION test_handle_new_user(
  test_id uuid,
  test_email text,
  test_metadata jsonb
) RETURNS void AS $$
BEGIN
  INSERT INTO public.users (id, email, name, created_at, updated_at)
  VALUES (
    test_id,
    test_email,
    coalesce(
      test_metadata->>'name',
      test_metadata->>'full_name',
      split_part(test_email, '@', 1)
    ),
    now(),
    now()
  );
END;
$$ LANGUAGE plpgsql;

-- テスト実行
SELECT test_handle_new_user(
  gen_random_uuid(),
  'debug@example.com',
  '{"name": "Debug User"}'::jsonb
);

-- テスト関数を削除
DROP FUNCTION test_handle_new_user;
```

---

## 完了チェックリスト

- [ ] `handle_new_user()`関数が作成された
- [ ] `on_auth_user_created`トリガーが作成された
- [ ] テストユーザーで動作確認ができた
- [ ] `public.users`に自動挿入されることを確認
- [ ] 既存ユーザーを同期（必要な場合）
- [ ] Drizzleマイグレーションに追加（推奨）

---

## 次のステップ

トリガーが正常に動作したら、ステップ2のフェーズ2（残りのエンドポイント追加）に進みましょう。

---

## 参考リンク

- [Supabase公式: User Management](https://supabase.com/docs/guides/auth/managing-user-data)
- [egghead.io: Supabase Triggers](https://egghead.io/lessons/javascript-use-triggers-to-automatically-update-supabase-tables)
- [PostgreSQL: Trigger Functions](https://www.postgresql.org/docs/current/plpgsql-trigger.html)

---

**作成日:** 2025-11-12
