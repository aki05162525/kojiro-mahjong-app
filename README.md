```
bun install
bun run dev
```

### Quality checks

```
bun run lint       # biome check --reporter summary
bun run lint:fix   # biome check --write (safe fixes) / used by lefthook
bun run lint:staged # biome check --write --staged (manual staged-file run)
bun run format     # biome format --write
```

# 🧱 Supabase + Drizzle 開発手順

## ▶️ 環境起動

```bash
# Supabase ローカル起動
bunx supabase start

# 停止する場合
bunx supabase stop

# スキーマ変更からマイグレーション SQL を生成
bun run db:generate

# 生成済みマイグレーションを DB へ適用
bun run db:migrate

# 現在のスキーマを直接 DB に反映（ローカル検証向け）
bun run db:push

# Drizzle Studio を起動してスキーマを確認
bun run db:studio
```
