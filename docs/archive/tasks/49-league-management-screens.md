# リーグ管理画面 - 実装タスク

**Issue**: #49
**URL**: https://github.com/aki05162525/kojiro-mahjong-app/issues/49

## 概要

リーグ詳細ページとリーグ設定変更フォームを実装する。

## 前提条件

### 既存の実装

✅ **リーグ一覧ページ** (`/leagues`)
- リーグカード表示
- ステータス表示（進行中/完了）
- 作成日表示
- クリックで詳細ページに遷移（`/leagues/:id`）

✅ **API エンドポイント**
- `GET /api/leagues/:id` - リーグ詳細取得
- `PATCH /api/leagues/:id` - リーグ更新
- `PATCH /api/leagues/:id/status` - ステータス更新

✅ **React Query Hooks**
- `useLeague(leagueId)` - リーグ詳細取得
- `useUpdateLeague()` - リーグ更新
- `useUpdateLeagueStatus()` - ステータス更新

✅ **Zod スキーマ**
- `updateLeagueSchema` - リーグ更新用
- `updateLeagueStatusSchema` - ステータス更新用

## 実装タスク

### 1. リーグ詳細ページの作成

**ファイル**: `app/(dashboard)/leagues/[id]/page.tsx`

**実装内容**:
- Server Component でリーグ詳細データを取得
- Server Action (`getLeagueById`) を使用
- Container コンポーネントに initialData を渡す

**参考**: `app/(dashboard)/leagues/page.tsx` の実装パターン

---

### 2. リーグ詳細 Container コンポーネント

**ファイル**: `components/features/leagues/league-detail-container.tsx`

**実装内容**:
- React Query で initialData を使用
- ローディング・エラー状態の管理
- 設定変更ダイアログの開閉管理
- Presentational コンポーネントに props を渡す

**State**:
- `isSettingsDialogOpen: boolean` - 設定ダイアログの開閉状態

---

### 3. リーグ詳細 Presentational コンポーネント

**ファイル**: `components/features/leagues/league-detail.tsx`

**実装内容**:
- リーグ情報の表示
- ステータスバッジ表示
- 「設定」ボタン（ダイアログを開く）
- プレイヤー一覧表示（将来的に拡張）

**Props**:
```typescript
interface LeagueDetailProps {
  league: League
  onSettingsClick: () => void
}
```

**レイアウト**:
```
┌─────────────────────────────────────┐
│ ← 戻る          [設定]ボタン        │
├─────────────────────────────────────┤
│ リーグ名               [ステータス]  │
│ 説明文                              │
│                                     │
│ 作成日: YYYY/MM/DD                  │
│ 更新日: YYYY/MM/DD                  │
├─────────────────────────────────────┤
│ プレイヤー一覧（今後実装）           │
└─────────────────────────────────────┘
```

---

### 4. リーグ設定変更ダイアログ

**ファイル**: `components/features/leagues/league-settings-dialog.tsx`

**実装内容**:
- Dialog コンポーネント使用
- React Hook Form + Zod バリデーション
- リーグ名・説明の編集
- ステータス変更（RadioGroup）
- 更新・キャンセルボタン

**Props**:
```typescript
interface LeagueSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  league: League
}
```

**フォーム項目**:
1. **リーグ名** (必須)
   - Input
   - 1-20文字
   - プレースホルダー: 既存のリーグ名

2. **説明** (任意)
   - Textarea
   - プレースホルダー: 既存の説明

3. **ステータス** (必須)
   - RadioGroup
   - 選択肢:
     - 進行中 (active)
     - 完了 (completed)

**動作**:
- 初期値: 既存のリーグ情報をセット
- 更新成功時:
  - ダイアログを閉じる
  - 成功トースト表示: "リーグ設定を更新しました"
  - リーグ詳細のキャッシュを無効化
- エラー時:
  - ダイアログは開いたまま
  - エラートースト表示: "更新に失敗しました"

---

### 5. Server Action の作成

**ファイル**: `src/server/actions/leagues.ts`

**実装内容**:
- `getLeagueById(leagueId: string)` の追加
- Supabase 認証チェック
- API エンドポイント (`/api/leagues/:id`) を呼び出し
- エラーハンドリング

**既存**: `getLeaguesForUser()` が参考になる

---

## 技術要件

### 使用コンポーネント (shadcn/ui)
- `Dialog`
- `Form` (React Hook Form)
- `Input`
- `Textarea`
- `RadioGroup`
- `Button`
- `Card`
- `Badge`
- `Toast`

### バリデーション
- `updateLeagueSchema` (src/schemas/leagues.ts)
- `updateLeagueStatusSchema` (src/schemas/leagues.ts)

### API 統合
- `useLeague(leagueId)` - リーグ詳細取得
- `useUpdateLeague()` - リーグ更新
- `useUpdateLeagueStatus()` - ステータス更新

### ルーティング
- `/leagues/:id` - リーグ詳細ページ
- クリックで `/leagues` に戻る（Back ボタン）

---

## 実装の流れ

1. **Server Action 作成** (`getLeagueById`)
2. **リーグ詳細ページ作成** (`app/(dashboard)/leagues/[id]/page.tsx`)
3. **Presentational コンポーネント作成** (`league-detail.tsx`)
4. **Container コンポーネント作成** (`league-detail-container.tsx`)
5. **設定変更ダイアログ作成** (`league-settings-dialog.tsx`)
6. **動作確認とテスト**

---

## 注意事項

### Container/Presentational パターン
- リーグ一覧と同じパターンを踏襲
- Server Component → Container → Presentational の流れ

### ステータス定数化
- ステータス選択肢は定数配列として定義
- `.map()` で動的生成（UI 定数化パターン）

### バリデーション一元化
- Zod スキーマを使用
- コンポーネント内で重複したバリデーションを書かない

### エラーハンドリング
- `finally` ブロックでローディング状態をリセット
- 成功・失敗両方で適切なフィードバック

---

## 参考ファイル

- `app/(dashboard)/leagues/page.tsx` - Server Component パターン
- `components/features/leagues/leagues-container.tsx` - Container パターン
- `components/features/leagues/leagues-list.tsx` - Presentational パターン
- `components/features/leagues/create-league-dialog.tsx` - Dialog + Form パターン
- `src/server/actions/leagues.ts` - Server Action パターン
