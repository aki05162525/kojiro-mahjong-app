# ディレクトリ構成ガイド（Hono RPC対応）

麻雀リーグ管理アプリのディレクトリ構成

---

## 📁 ディレクトリ構成

```
/
├── app/
│   ├── (dashboard)/               # フロントエンド画面
│   │   ├── leagues/
│   │   └── sessions/
│   │
│   └── api/[[...route]]/
│       └── route.ts               # Honoエントリーポイント
│
├── src/
│   ├── server/                    # バックエンド（Hono API）
│   │   ├── routes/
│   │   │   ├── index.ts          # ★AppType エクスポート（最重要）
│   │   │   ├── leagues.ts
│   │   │   ├── players.ts
│   │   │   ├── sessions.ts
│   │   │   └── scores.ts
│   │   │
│   │   ├── services/             # ビジネスロジック
│   │   ├── repositories/         # データアクセス
│   │   ├── middleware/           # 認証、エラーハンドリング
│   │   └── validators/           # Zod バリデータ
│   │
│   └── client/                   # フロントエンド（APIクライアント）
│       ├── api.ts                # ★Hono RPCクライアント（最重要）
│       └── hooks/                # React Query hooks
│           ├── useLeagues.ts
│           └── ...
│
└── db/                           # データベース
    ├── index.ts
    └── schema/
```

---

## 🔑 Hono RPC の3つの重要ポイント

### 1. **AppTypeをエクスポート** (`src/server/routes/index.ts`)

```typescript
import { Hono } from 'hono'
import leaguesRoutes from './leagues'

const app = new Hono().basePath('/api')

// ★すべてのルートを1つの式でチェーン（型推論に必須）
const routes = app
  .route('/leagues', leaguesRoutes)
  .route('/players', playersRoutes)
  .route('/sessions', sessionsRoutes)

// ★AppTypeをエクスポート
export type AppType = typeof routes

export default app
```

### 2. **RPCクライアント初期化** (`src/client/api.ts`)

```typescript
import { hc } from 'hono/client'
import type { AppType } from '@/src/server/routes'  // ★type import

export const apiClient = hc<AppType>('http://localhost:3000')
```

### 3. **フロントエンドで使用** (`src/client/hooks/useLeagues.ts`)

```typescript
import { apiClient } from '../api'

export function useLeagues() {
  return useQuery({
    queryKey: ['leagues'],
    queryFn: async () => {
      const res = await apiClient.api.leagues.$get()
      return res.json()  // ★完全に型推論される
    },
  })
}
```

---

## 🏗️ アーキテクチャ

### バックエンド：3層アーキテクチャ

```
Route → Service → Repository → Database
```

- **Route**: ルーティング、バリデーション
- **Service**: ビジネスロジック
- **Repository**: データアクセス

### フロントエンド：Hono RPC + React Query

```
Component → React Query Hook → Hono RPC Client → API
```

---

## ✅ ベストプラクティス

### 推奨
- ✅ すべてのルートを1つの式でチェーン
- ✅ `import type { AppType }` で型のみインポート
- ✅ React Queryで非同期状態管理

### 避けるべき
- ❌ `app`から直接型をエクスポート（`typeof app`）
- ❌ 実際のコードをインポート（`import { AppType }`）

---

## 📦 必要なパッケージ

```bash
npm install hono @hono/zod-validator zod @tanstack/react-query
```

---

**詳細な実装は Issue #06 のタスクを進めながら決定**

---

**作成日:** 2025-11-09
