# ディレクトリ構成

## 全体構成

```
/
├── app/
│   ├── (dashboard)/               # フロントエンド画面
│   └── api/[...route]/route.ts   # Next.js APIハンドラー
│
├── src/
│   ├── server/
│   │   ├── routes/                # Hono RPCアプリ（フロントエンド用）
│   │   ├── openapi/               # OpenAPIアプリ（ドキュメント用）
│   │   ├── services/              # ビジネスロジック
│   │   ├── repositories/          # データアクセス
│   │   ├── middleware/            # 認証、エラーハンドリング
│   │   └── validators/            # Zodバリデータ
│   │
│   └── client/
│       ├── api.ts                 # Hono RPCクライアント
│       └── hooks/                 # React Query hooks
│
└── db/
    ├── index.ts
    └── schema/                    # Drizzleスキーマ
```

## アーキテクチャ

### バックエンド: 3層アーキテクチャ

```
Route → Service → Repository → Database
```

### デュアルAPIシステム

| アプリ | 用途 | 技術 |
|--------|------|------|
| RPC | フロントエンド通信 | Hono + Hono RPC |
| OpenAPI | ドキュメント | OpenAPIHono + Swagger UI |

- マウント順序: RPC → OpenAPI
- サービス層は両方で共有

### フロントエンド

```
Component → React Query → Hono RPC Client → API
```

---

**参照:** [hono-coding-guidelines.md](./hono-coding-guidelines.md)
