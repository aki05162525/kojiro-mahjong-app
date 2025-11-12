# 認証ミドルウェアの仕組みを理解する

あなたが実装した `src/server/middleware/auth.ts` が**何のために存在するのか**、**どんな課題を解決しているのか**を、ゼロから理解するためのドキュメントです。

---

## 🤔 そもそも何が問題なのか？

### 状況1: 認証なしのAPIを想像してみる

麻雀リーグ管理アプリで、こんなAPIを作ったとします：

```typescript
// リーグを削除するAPI
app.delete('/api/leagues/:id', async (c) => {
  const id = c.req.param('id')
  await db.delete(leagues).where(eq(leagues.id, id))
  return c.json({ success: true })
})
```

**問題点:**
- **誰でも** このAPIを叩けば、他人のリーグを削除できてしまう
- URLを知っていれば、ログインしていなくても操作できてしまう
- 「誰が」操作したのか記録できない

### 状況2: 毎回ユーザー情報を送る？

じゃあ、リクエストごとにユーザー名とパスワードを送ればいい？

```typescript
// ❌ こんな実装をしたくない
app.delete('/api/leagues/:id', async (c) => {
  const { username, password } = await c.req.json()

  // 毎回DBでパスワード確認？
  const user = await db.query.users.findFirst({
    where: eq(users.username, username)
  })

  if (!user || user.password !== password) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  // やっとリーグ削除処理...
})
```

**問題点:**
- 毎回パスワードをネットワーク経由で送るのは危険
- 毎回DBに問い合わせるのは遅い
- すべてのAPIエンドポイントに同じコードを書くのは面倒

---

## 💡 解決策: トークン認証の登場

### ステップ1: ログイン時に「合言葉」をもらう

```
ユーザー: 「ユーザー名: 山田、パスワード: secret123 です」
サーバー: 「確認しました。これが合言葉(トークン)です: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...」
```

この「合言葉(トークン)」には以下の情報が**暗号化**されて入っています：
- ユーザーID
- 発行日時
- 有効期限

### ステップ2: APIを叩く時は「合言葉」を見せる

```
ユーザー: 「リーグを削除したいです。合言葉は eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... です」
サーバー: 「合言葉を確認...OK！あなたは山田さんですね。削除を実行します」
```

これがBearer Token認証の基本です。

---

## 🔧 もし自分が最初から作るなら、どう困って工夫するか？

### 困りごと1: 全部のAPIで同じチェックを書きたくない

```typescript
// ❌ こんなコピペ地獄は嫌だ
app.delete('/api/leagues/:id', async (c) => {
  // ↓ この部分を毎回書くの？
  const authHeader = c.req.header('Authorization')
  if (!authHeader) return c.json({ error: 'Unauthorized' }, 401)
  const token = authHeader.replace('Bearer ', '')
  const { data, error } = await supabase.auth.getUser(token)
  if (error) return c.json({ error: 'Unauthorized' }, 401)
  // ↑ ここまでコピペ

  // やっと本題...
  await db.delete(leagues).where(eq(leagues.id, id))
})

app.patch('/api/leagues/:id', async (c) => {
  // ↓ また同じコードをコピペ...
  const authHeader = c.req.header('Authorization')
  if (!authHeader) return c.json({ error: 'Unauthorized' }, 401)
  // ...
})
```

**工夫: ミドルウェアで共通化しよう！**

```typescript
// ✅ 一度書けば、どこでも使える
export const authMiddleware = createMiddleware<AuthContext>(async (c, next) => {
  // トークンチェックの処理
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized', message: '認証が必要です' }, 401)
  }

  const token = authHeader.replace('Bearer ', '')
  const { data, error } = await supabase.auth.getUser(token)

  if (error || !data.user) {
    return c.json({ error: 'Unauthorized', message: '無効なトークンです' }, 401)
  }

  // ユーザーIDをContextに保存（後で使える）
  c.set('userId', data.user.id)

  await next() // ✅ OKなら次の処理へ
})
```

### 困りごと2: 誰が操作したか知りたい

リーグを削除する時、「誰が削除したのか」を記録したい。

```typescript
// ❌ ミドルウェアなし: 毎回トークンからユーザーIDを取得
app.delete('/api/leagues/:id', async (c) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '')
  const { data } = await supabase.auth.getUser(token!)
  const userId = data.user.id // ← 毎回これを取得するのは面倒

  await db.delete(leagues).where(eq(leagues.id, id))
  console.log(`User ${userId} deleted league`)
})
```

**工夫: ミドルウェアで `userId` を Context に保存！**

```typescript
// ✅ ミドルウェアあり: c.get('userId') で簡単に取得
app.delete('/api/leagues/:id', authMiddleware, async (c) => {
  const userId = c.get('userId') // ← ミドルウェアが保存してくれた！

  await db.delete(leagues).where(eq(leagues.id, id))
  console.log(`User ${userId} deleted league`)
})
```

---

## 📖 あなたのコードを1行ずつ解説

```typescript
import { createClient } from '@supabase/supabase-js'
import { createMiddleware } from 'hono/factory'
```
- `createClient`: Supabaseと通信するためのクライアントを作る
- `createMiddleware`: Honoでミドルウェアを作るためのヘルパー

```typescript
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)
```
- Supabaseに接続するための設定
- `.env` ファイルからURLとAPIキーを読み込む

```typescript
export type AuthContext = {
  Variables: {
    userId: string
  }
}
```
- TypeScriptの型定義
- 「このミドルウェアを通ったら、`c.get('userId')` が使えるよ」という宣言

```typescript
export const authMiddleware = createMiddleware<AuthContext>(async (c, next) => {
```
- 認証ミドルウェアの本体
- `<AuthContext>` で型安全性を確保

```typescript
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized', message: '認証が必要です' }, 401)
  }
```
- **課題:** リクエストに「合言葉」が含まれているか確認
- **解決:** `Authorization: Bearer {token}` の形式をチェック
- なければエラーを返して処理を止める

```typescript
  const token = authHeader.replace('Bearer ', '')
```
- **課題:** "Bearer " という接頭辞を外して、トークンだけ取り出す
- **例:** `"Bearer abc123"` → `"abc123"`

```typescript
  const { data, error } = await supabase.auth.getUser(token)

  if (error || !data.user) {
    return c.json({ error: 'Unauthorized', message: '無効なトークンです' }, 401)
  }
```
- **課題:** トークンが本物か確認
- **解決:** Supabaseに問い合わせて検証
  - 有効期限切れ → エラー
  - 改ざんされている → エラー
  - ログアウト済み → エラー

```typescript
  c.set('userId', data.user.id)
```
- **課題:** 後続の処理で「誰が操作しているか」を使いたい
- **解決:** ユーザーIDをContextに保存

```typescript
  await next()
})
```
- **意味:** 認証OK！次の処理（実際のAPI処理）に進む

---

## 🌊 実際の流れ（リーグ削除の例）

### 1. フロントエンドからリクエスト

```typescript
// React コンポーネントから
const response = await fetch('/api/leagues/abc-123', {
  method: 'DELETE',
  headers: {
    'Authorization': `Bearer ${userToken}` // ← ログイン時に取得したトークン
  }
})
```

### 2. Honoがミドルウェアを実行

```typescript
app.delete('/api/leagues/:id', authMiddleware, async (c) => {
  // ↑ まず authMiddleware が実行される

  // authMiddleware が成功したら、ここが実行される
  const userId = c.get('userId') // ← ミドルウェアが保存したユーザーID
  const leagueId = c.req.param('id')

  await db.delete(leagues).where(eq(leagues.id, leagueId))
  return c.json({ success: true })
})
```

### 3. ミドルウェアの内部処理

```
1. Authorization ヘッダーをチェック
   ↓ なければ 401 エラーを返す

2. トークンを取り出す
   ↓

3. Supabaseでトークンを検証
   ↓ 無効なら 401 エラーを返す

4. ユーザーIDをContextに保存
   ↓

5. next() を呼んで次の処理へ
```

---

## 🎯 まとめ: ミドルウェアが解決した課題

| 課題 | ミドルウェアなし | ミドルウェアあり |
|------|----------------|----------------|
| 認証チェック | 全APIで同じコードをコピペ | `authMiddleware` を指定するだけ |
| ユーザーID取得 | 毎回トークンから取り出す | `c.get('userId')` で簡単取得 |
| セキュリティ | チェック漏れのリスク | 一箇所で管理、漏れなし |
| 保守性 | 修正が大変 | 一箇所直せば全部に反映 |

---

## 📚 参考リンク

### JWT認証の基礎を学ぶ
- [JWT認証の流れを理解する #初学者向け - Qiita](https://qiita.com/asagohan2301/items/cef8bcb969fef9064a5c)
- [基本から理解するJWTとJWT認証の仕組み | 豆蔵デベロッパーサイト](https://developer.mamezou-tech.com/blogs/2022/12/08/jwt-auth/)
- [JWT で学ぶトークン認証 - Fenrir Engineers](https://engineers.fenrir-inc.com/entry/2024/09/20/181944)
- [【完全ガイド】JWTとは？初心者でもわかる仕組みと使い方を徹底解説](https://it-biz.online/it-skills/jwt/)

### Bearer Token の必要性
- [ベアラートークンとは？WebアプリやAPIにおける認証の基本](https://www.issoh.co.jp/tech/details/4150/)
- [「Authorization: Bearer 」って何？—API認証のカギとなるトークンの仕組み](https://note.com/minato_kame/n/n4ad4d016bfb3)
- [API認証の選択：Basic AuthとBearer Tokenの違いと使い分け](https://apidog.com/jp/blog/basic-auth-vs-bearer-token/)

### Supabase Auth
- [Supabase: Server-Side Auth for Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Supabase: auth.getUser() API Reference](https://supabase.com/docs/reference/javascript/auth-getuser)

### Hono ミドルウェア
- [Hono: createMiddleware (Factory)](https://hono.dev/docs/helpers/factory)
- [Hono: Middleware Guide](https://hono.dev/docs/guides/middleware)

---

## 🚀 次のステップ

認証ミドルウェアの仕組みが理解できたら、次は：

1. **エラーハンドラー** を実装して、エラーレスポンスを統一
2. **実際のAPI（リーグ作成）** で `authMiddleware` を使ってみる
3. **フロントエンド** でログイン処理を実装して、トークンを取得

---

**作成日:** 2025-11-09
