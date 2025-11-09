# Issue #06: リーグ管理API実装

## ステータス
🔴 **Open**

## 優先度
🔥 **High** - コアAPIの実装

## 概要

リーグ管理・プレイヤー管理APIを実装する。3層アーキテクチャ（Route → Service → Repository）を採用し、保守性・拡張性の高いAPI基盤を構築する。

## 実装するAPI

### リーグ管理API（6エンドポイント）
- `POST /api/leagues` - リーグ作成
- `GET /api/leagues` - リーグ一覧
- `GET /api/leagues/:id` - リーグ詳細
- `PATCH /api/leagues/:id` - リーグ更新
- `DELETE /api/leagues/:id` - リーグ削除（論理削除）
- `PATCH /api/leagues/:id/status` - ステータス変更

### プレイヤー管理API（2エンドポイント）
- `PATCH /api/leagues/:id/players/:playerId` - プレイヤー名更新
- `PATCH /api/leagues/:id/players/:playerId/role` - 権限変更

## タスクリスト

### フェーズ1: 基盤準備

- [ ] **ディレクトリ構成作成**
  - [ ] `src/routes/` ディレクトリ作成
  - [ ] `src/services/` ディレクトリ作成
  - [ ] `src/repositories/` ディレクトリ作成
  - [ ] `src/middleware/` ディレクトリ作成
  - [ ] `src/validators/` ディレクトリ作成
  - [ ] `src/lib/` ディレクトリ作成

- [ ] **データベース接続設定**
  - [ ] `db/index.ts` - Drizzleクライアント初期化
  - [ ] Supabase接続設定

- [ ] **認証ミドルウェア作成**
  - [ ] `src/middleware/auth.ts` - JWTトークン検証
  - [ ] ユーザー情報の取得・注入

- [ ] **エラーハンドリング設定**
  - [ ] `src/middleware/error-handler.ts` - 共通エラーハンドラー
  - [ ] HTTPExceptionの統一

- [ ] **バリデーション設定**
  - [ ] `@hono/zod-validator` インストール
  - [ ] `zod` インストール

### フェーズ2: リーグ管理API実装

#### タスク1: POST /api/leagues - リーグ作成

- [ ] **バリデータ作成**
  - [ ] `src/validators/leagues.validator.ts`
  - [ ] `createLeagueSchema` - name, description, players検証
  - [ ] プレイヤー数チェック（8人 or 16人）

- [ ] **リポジトリ作成**
  - [ ] `src/repositories/leagues.repository.ts`
  - [ ] `create()` - リーグ作成
  - [ ] `src/repositories/players.repository.ts`
  - [ ] `create()` - プレイヤー作成

- [ ] **サービス作成**
  - [ ] `src/services/leagues.service.ts`
  - [ ] `createLeague()` - トランザクション処理
    - [ ] リーグ作成
    - [ ] プレイヤー一括作成
    - [ ] 作成者に対応するプレイヤーにadmin権限付与

- [ ] **ルート作成**
  - [ ] `src/routes/leagues.ts`
  - [ ] POST / エンドポイント定義
  - [ ] バリデーション適用
  - [ ] レスポンス整形（201 Created）

#### タスク2: GET /api/leagues - リーグ一覧

- [ ] **リポジトリ拡張**
  - [ ] `findByUserId()` - 参加リーグ取得

- [ ] **サービス拡張**
  - [ ] `getLeaguesByUser()` - リーグ一覧取得

- [ ] **ルート追加**
  - [ ] GET / エンドポイント定義
  - [ ] レスポンス整形

#### タスク3: GET /api/leagues/:id - リーグ詳細

- [ ] **リポジトリ拡張**
  - [ ] `findById()` - リーグ取得
  - [ ] `hasUserAccess()` - アクセス権確認
  - [ ] `players.findByLeagueId()` - プレイヤー一覧取得

- [ ] **サービス拡張**
  - [ ] `getLeagueById()` - リーグ詳細取得
  - [ ] アクセス権限チェック
  - [ ] プレイヤー情報含めて返す

- [ ] **ルート追加**
  - [ ] GET /:id エンドポイント定義
  - [ ] 404エラーハンドリング

#### タスク4: PATCH /api/leagues/:id - リーグ更新

- [ ] **バリデータ追加**
  - [ ] `updateLeagueSchema` - name, description検証

- [ ] **リポジトリ拡張**
  - [ ] `update()` - リーグ更新
  - [ ] `players.hasAdminRole()` - admin権限確認

- [ ] **サービス拡張**
  - [ ] `updateLeague()` - リーグ更新
  - [ ] admin権限チェック

- [ ] **ルート追加**
  - [ ] PATCH /:id エンドポイント定義
  - [ ] 403エラーハンドリング

#### タスク5: DELETE /api/leagues/:id - リーグ削除

- [ ] **サービス拡張**
  - [ ] `deleteLeague()` - 論理削除（status → 'deleted'）
  - [ ] admin権限チェック

- [ ] **ルート追加**
  - [ ] DELETE /:id エンドポイント定義
  - [ ] 204 No Content レスポンス

#### タスク6: PATCH /api/leagues/:id/status - ステータス変更

- [ ] **バリデータ追加**
  - [ ] `updateLeagueStatusSchema` - status検証

- [ ] **サービス拡張**
  - [ ] `updateLeagueStatus()` - ステータス更新
  - [ ] admin権限チェック

- [ ] **ルート追加**
  - [ ] PATCH /:id/status エンドポイント定義

### フェーズ3: プレイヤー管理API実装

#### タスク7: PATCH /api/leagues/:id/players/:playerId - プレイヤー名更新

- [ ] **バリデータ作成**
  - [ ] `src/validators/players.validator.ts`
  - [ ] `updatePlayerNameSchema` - name検証

- [ ] **リポジトリ作成**
  - [ ] `players.update()` - プレイヤー更新
  - [ ] `players.findById()` - プレイヤー取得

- [ ] **サービス作成**
  - [ ] `src/services/players.service.ts`
  - [ ] `updatePlayerName()` - 名前更新
  - [ ] admin権限チェック

- [ ] **ルート作成**
  - [ ] `src/routes/players.ts`
  - [ ] PATCH /leagues/:id/players/:playerId エンドポイント

#### タスク8: PATCH /api/leagues/:id/players/:playerId/role - 権限変更

- [ ] **バリデータ追加**
  - [ ] `updatePlayerRoleSchema` - role検証

- [ ] **サービス拡張**
  - [ ] `updatePlayerRole()` - 権限更新
  - [ ] user_idチェック（nullなら400エラー）
  - [ ] admin権限チェック

- [ ] **ルート追加**
  - [ ] PATCH /leagues/:id/players/:playerId/role エンドポイント

### フェーズ4: 統合とテスト

- [ ] **ルート統合**
  - [ ] `src/routes/index.ts` - 全ルート統合
  - [ ] グローバルミドルウェア設定

- [ ] **エントリーポイント更新**
  - [ ] `app/api/[[...route]]/route.ts` 更新
  - [ ] POST, PATCH, DELETE ハンドラー追加

- [ ] **手動テスト**
  - [ ] Postman/Thunderclientでエンドポイントテスト
  - [ ] 各種エラーケースの確認
  - [ ] 認証フローの確認

- [ ] **ドキュメント更新**
  - [ ] READMEに開発手順追加
  - [ ] API設計書との整合性確認

## 推奨実装順序

1. ✅ ディレクトリ構成作成
2. ✅ データベース接続設定
3. ✅ 認証ミドルウェア（簡易版でOK）
4. ✅ エラーハンドリング設定
5. **POST /api/leagues** - リーグ作成（最重要）
6. **GET /api/leagues** - リーグ一覧
7. **GET /api/leagues/:id** - リーグ詳細
8. 残りのエンドポイント

## 技術スタック

- **フレームワーク**: Hono v4.10.4
- **バリデーション**: Zod + @hono/zod-validator
- **ORM**: Drizzle ORM v0.44.7
- **認証**: Supabase Auth
- **言語**: TypeScript

## 参考資料

- [api-design.md](../api-design.md) - API仕様
- [directory-structure.md](../directory-structure.md) - ディレクトリ構成ガイド
- [Hono Documentation](https://hono.dev/)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)

## 注意事項

### リーグ作成時の重要ポイント

1. **トランザクション処理**
   - リーグ作成とプレイヤー作成は1つのトランザクションで実行
   - 途中でエラーが起きたら全てロールバック

2. **作成者の権限付与**
   - 作成者に対応するプレイヤーに自動的に `role: admin` を設定
   - プレイヤー一覧の最初のプレイヤーを作成者と紐付け

3. **プレイヤー数検証**
   - 8人または16人のみ許可
   - それ以外は400エラー

### 権限チェックの実装

- admin権限が必要な操作：
  - リーグ更新、削除、ステータス変更
  - プレイヤー名更新、権限変更

- 実装パターン：
  ```typescript
  // Service層で権限チェック
  private async checkAdminPermission(leagueId: string, userId: string) {
    const hasPermission = await this.playersRepo.hasAdminRole(leagueId, userId)
    if (!hasPermission) {
      throw new HTTPException(403, { message: '管理者権限が必要です' })
    }
  }
  ```

---

**作成日:** 2025-11-09
**担当者:** TBD
