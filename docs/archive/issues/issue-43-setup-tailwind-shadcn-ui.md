# Issue #43: Tailwind CSS + shadcn/ui + React Hook Form 環境構築

## ステータス

🔴 **Open**

## 優先度

🔥 **High**

## 概要

フロントエンド開発環境を整備する。Tailwind CSS + shadcn/ui + React Hook Form を導入し、Zennライクなカラースキームを設定する。ダークモードには対応しない（ライトモードのみ）。

---

## 技術スタック

- **Tailwind CSS v3** - ユーティリティファーストCSSフレームワーク
- **shadcn/ui** - コピー&ペースト型UIコンポーネントライブラリ
- **React Hook Form** - フォーム状態管理ライブラリ
- **Zod** - バリデーションライブラリ（導入済み）
- **@hookform/resolvers** - React Hook FormとZodの統合
- **TanStack Table** - データテーブル（shadcn/uiのtableコンポーネントで使用）

---

## 環境構築タスク

### タスク1: Tailwind CSSのインストール

```bash
# Tailwind CSS関連パッケージのインストール
bun add -D tailwindcss postcss autoprefixer tailwindcss-animate

# Tailwind設定ファイルの生成
bunx tailwindcss init -p
```

**パッケージ詳細:**

- `tailwindcss` - メインライブラリ（v3系）
- `postcss` - CSS変換ツール
- `autoprefixer` - ベンダープレフィックス自動付与
- `tailwindcss-animate` - アニメーションユーティリティ（shadcn/uiで必要）

---

### タスク2: Tailwind設定ファイルの作成

#### ファイル: `tailwind.config.ts`

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'], // shadcn/uiの一部コンポーネントで必要（使用はしない）
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // shadcn/ui用のCSS変数ベースカラー
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
```

**ポイント:**

- CSS変数ベースのカラーシステム（shadcn/ui標準）
- ライトモードのみ対応（`darkMode: ['class']`は残すが使用しない）
- コンテンツパスに`src/**`を含める

---

### タスク3: グローバルCSSの設定（Zennライク）

#### ファイル: `app/globals.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Zennライクなカラースキーム（ライトモードのみ） */

    /* 背景とテキスト */
    --background: 0 0% 100%;        /* 白背景 #FFFFFF */
    --foreground: 220 20% 15%;      /* ダークグレーのテキスト #1a202c相当 */

    /* プライマリカラー（Zennのブルー #3EA8FF相当） */
    --primary: 205 100% 62%;
    --primary-foreground: 0 0% 100%; /* 白文字 */

    /* セカンダリ */
    --secondary: 210 40% 96%;       /* 薄いグレー背景 */
    --secondary-foreground: 220 20% 15%;

    /* ミュート（控えめな要素） */
    --muted: 210 40% 96%;
    --muted-foreground: 220 10% 45%;

    /* アクセント */
    --accent: 210 40% 96%;
    --accent-foreground: 220 20% 15%;

    /* ボーダー */
    --border: 214 32% 91%;          /* 薄いグレーボーダー */
    --input: 214 32% 91%;
    --ring: 205 100% 62%;           /* フォーカスリング（プライマリと同色） */

    /* カード */
    --card: 0 0% 100%;
    --card-foreground: 220 20% 15%;

    /* ポップオーバー */
    --popover: 0 0% 100%;
    --popover-foreground: 220 20% 15%;

    /* デストラクティブ（削除など） */
    --destructive: 0 84% 60%;
    --destructive-foreground: 0 0% 100%;

    /* ボーダー半径 */
    --radius: 0.5rem;
  }

  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

**カラー設計のポイント:**

- **プライマリカラー**: Zennの特徴的なブルー（`#3EA8FF`）をHSL形式で定義
- **グレースケール**: 柔らかいグレー系（Zenn風）
- **フォーカスリング**: アクセシビリティを考慮したプライマリカラー
- **ボーダー半径**: 0.5rem（8px）でモダンな印象

---

### タスク4: shadcn/uiの初期化

```bash
bunx shadcn@latest init
```

**対話式の選択肢:**

| 質問 | 回答 |
|------|------|
| Would you like to use TypeScript? | **Yes** |
| Which style would you like to use? | **New York** (Zennに近いミニマルデザイン) |
| Which color would you like to use as base color? | **Blue** |
| Where is your global CSS file? | **app/globals.css** |
| Would you like to use CSS variables for colors? | **Yes** |
| Where is your tailwind.config.js located? | **tailwind.config.ts** |
| Configure the import alias for components? | **@/components** |
| Configure the import alias for utils? | **@/lib/utils** |

**自動生成されるファイル:**

- `components/ui/` - UIコンポーネントの配置先
- `lib/utils.ts` - ユーティリティ関数（`cn`など）
- `components.json` - shadcn/ui設定ファイル

---

### タスク5: React Hook Formのインストール

```bash
# React Hook Formと関連パッケージのインストール
bun add react-hook-form @hookform/resolvers
```

**パッケージ詳細:**

- `react-hook-form` - フォーム状態管理のメインライブラリ
- `@hookform/resolvers` - ZodなどのバリデーターとReact Hook Formを統合

**注意:** `zod`は既にプロジェクトにインストール済み（`package.json`で確認済み）

---

### タスク6: 基本UIコンポーネントのインストール

```bash
# よく使う基本コンポーネントをインストール
bunx shadcn@latest add button
bunx shadcn@latest add input
bunx shadcn@latest add form
bunx shadcn@latest add label
bunx shadcn@latest add card
bunx shadcn@latest add table
bunx shadcn@latest add dialog
bunx shadcn@latest add select
bunx shadcn@latest add checkbox
bunx shadcn@latest add textarea
```

**各コンポーネントの用途:**

- `button` - ボタン（リーグ作成、スコア登録など）
- `input` - テキスト入力（リーグ名、プレイヤー名など）
- `form` - React Hook Form統合フォーム
- `label` - フォームラベル
- `card` - カードレイアウト（リーグカード、スコアカードなど）
- `table` - データテーブル（スコア表、ランキング表）
- `dialog` - モーダルダイアログ（確認、削除など）
- `select` - セレクトボックス（プレイヤー数選択など）
- `checkbox` - チェックボックス
- `textarea` - 複数行テキスト入力（リーグ説明など）

---

### タスク7: パスエイリアスの確認

#### ファイル: `tsconfig.json`

Next.js 15では`@/*`がデフォルトで設定されているが、以下が含まれているか確認する：

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

**確認ポイント:**

- `@/components`、`@/lib`、`@/src`などがインポートできる
- shadcn/uiの初期化で自動設定されるが、念のため確認

## Zennライクなカラーのカスタマイズ（詳細版）

より正確にZennの色を再現したい場合、`app/globals.css`の`:root`セクションを以下のように調整可能：

```css
@layer base {
  :root {
    /* より精密なZennカラー */
    --zenn-blue: 205 100% 62%;       /* #3EA8FF */
    --zenn-blue-hover: 205 100% 55%; /* ホバー時（少し暗く） */
    --zenn-blue-light: 205 100% 95%; /* 薄い背景 */

    /* グレースケール（Zennは柔らかいグレーを使用） */
    --gray-50: 210 20% 98%;
    --gray-100: 210 20% 95%;
    --gray-200: 214 20% 90%;
    --gray-300: 214 15% 80%;
    --gray-400: 214 10% 60%;
    --gray-500: 214 10% 45%;
    --gray-600: 220 15% 30%;
    --gray-700: 220 20% 20%;
    --gray-800: 220 20% 15%;

    /* shadcn/ui変数にマッピング */
    --background: 0 0% 100%;
    --foreground: var(--gray-800);

    --primary: var(--zenn-blue);
    --primary-foreground: 0 0% 100%;

    --secondary: var(--gray-100);
    --secondary-foreground: var(--gray-800);

    --muted: var(--gray-100);
    --muted-foreground: var(--gray-500);

    --accent: var(--gray-100);
    --accent-foreground: var(--gray-800);

    --border: var(--gray-200);
    --input: var(--gray-200);
    --ring: var(--zenn-blue);

    --card: 0 0% 100%;
    --card-foreground: var(--gray-800);

    --popover: 0 0% 100%;
    --popover-foreground: var(--gray-800);

    --destructive: 0 84% 60%;
    --destructive-foreground: 0 0% 100%;

    --radius: 0.5rem;
  }

  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

**カスタムカラーの使い方:**

```typescript
// Tailwindのクラス名として使用
<div className="bg-primary text-primary-foreground">
  プライマリカラーの背景
</div>

// ボーダーのカスタマイズ
<div className="border border-border rounded-lg">
  ボーダー付きカード
</div>
```

---

## 既存コードとの統合

### Next.js App Routerとの統合

- `app/layout.tsx`で`globals.css`をインポート（Next.js 15のデフォルト設定で問題なし）
- Server ComponentsとClient Componentsの使い分け
  - フォーム、テーブル → Client Components（`'use client'`）
  - 静的ページ、レイアウト → Server Components

### Biomeとの互換性

- Biomeの設定（`.biome.json`）は既存のまま維持
- Tailwindのクラス名は自動フォーマット対象外（問題なし）
- `bun run lint:fix`で既存のルールに従う

### Zodバリデータとの統合

- **既存のバリデータを再利用**: `src/server/validators/`で定義されたスキーマをフロントエンドでもインポート
- **利用可能なスキーマ**:
  - `createLeagueSchema` - リーグ作成（name, description, players配列）
  - `updateLeagueSchema` - リーグ更新（name, description）
  - `updateLeagueStatusSchema` - ステータス変更（status）
  - `updatePlayerNameSchema` - プレイヤー名更新（name）
  - `updatePlayerRoleSchema` - 権限変更（role）
- **パスエイリアス**: `@/src/server/validators/leagues`でインポート可能
- **型推論**: `z.infer<typeof schema>`でTypeScript型を自動生成

---

## 検証方法

### タスク完了後の動作確認

1. **開発サーバー起動**
   ```bash
   bun run dev
   ```

2. **サンプルページ作成**
   - `app/test/page.tsx`を作成し、ボタンやフォームを配置
   - `http://localhost:3000/test`で表示確認

3. **カラースキーム確認**
   - プライマリカラーがZennのブルー（`#3EA8FF`）になっているか
   - ボーダー、背景色が意図通りか

4. **React Hook Form動作確認**
   - フォームにバリデーションエラーが表示されるか
   - 送信時に`console.log`で値が出力されるか

---

## トラブルシューティング

### よくある問題と解決策

1. **Tailwindのクラスが反映されない**
   - `tailwind.config.ts`の`content`パスが正しいか確認
   - 開発サーバーを再起動（`Ctrl+C` → `bun run dev`）

2. **shadcn/uiコンポーネントが見つからない**
   - `bunx shadcn@latest add <component-name>`で再インストール
   - `components.json`の`aliases`設定を確認

3. **CSS変数が読み込まれない**
   - `app/globals.css`が`app/layout.tsx`でインポートされているか確認
   - `:root`セレクタのスペルミスがないか確認

4. **React Hook Formのエラー**
   - `@hookform/resolvers`がインストールされているか確認
   - `zodResolver`のインポート先が正しいか確認

5. **Zodスキーマのインポートエラー**
   - `@/src/server/validators/*`からインポートできない場合、`tsconfig.json`のパスエイリアス設定を確認
   - フロントエンドで独自にスキーマを定義せず、必ず`src/server/validators/`のスキーマを再利用する

---

## 重要な設計原則: Zodスキーマの共有

### バックエンドとフロントエンドでスキーマを共有する理由

このプロジェクトでは、**Single Source of Truth**の原則に従い、Zodスキーマをバックエンドとフロントエンドで共有します。

**メリット:**

1. **バリデーションルールの一貫性**
   - バックエンドとフロントエンドで同じルールが適用される
   - ルール変更時も1箇所の修正で済む

2. **型安全性の向上**
   - `z.infer<typeof schema>`で型を自動生成
   - フロントエンドとバックエンドで型が一致することを保証

3. **保守性の向上**
   - スキーマの重複を避ける
   - バリデーションルールの不整合によるバグを防ぐ

4. **開発効率の向上**
   - スキーマを再定義する必要がない
   - エラーメッセージもバックエンドで定義したものを再利用

### スキーマの配置と使用方法

**バックエンド（定義側）:**
```typescript
// src/server/validators/leagues.ts
import { z } from 'zod'

// プレイヤー名のバリデーション
const playerNameSchema = z.object({
  name: z
    .string()
    .min(1, 'プレイヤー名は必須です')
    .max(20, 'プレイヤー名は20文字以内で入力してください'),
})

// リーグ作成リクエストのバリデーション
export const createLeagueSchema = z.object({
  name: z.string().min(1, 'リーグ名は必須です').max(20, 'リーグ名は20文字以内で入力してください'),
  description: z.string().optional(),
  players: z.union([
    z.array(playerNameSchema).length(8),
    z.array(playerNameSchema).length(16)
  ]),
})
```

**フロントエンド（使用側）:**
```typescript
// app/leagues/create/page.tsx
import { createLeagueSchema } from '@/src/server/validators/leagues'
import type { z } from 'zod'

type LeagueFormValues = z.infer<typeof createLeagueSchema>

const form = useForm<LeagueFormValues>({
  resolver: zodResolver(createLeagueSchema),
})
```

**禁止事項:**
```typescript
// ❌ フロントエンドで独自にスキーマを定義するのはNG
const leagueFormSchema = z.object({
  name: z.string().min(1).max(20),
  // ...
})
```

---

## 次のステップ

この環境構築が完了したら、以下の実装に進めます：

1. **リーグ作成ページ** - `app/leagues/create/page.tsx`の実装
2. **プレイヤー入力フォーム** - 8人または16人分の一括入力
3. **スコアテーブル** - TanStack Tableでソート・フィルタリング実装
4. **ランキング表示** - リアルタイム集計表示
5. **モーダルダイアログ** - 削除確認、エラー表示など

---

## 参考資料

### 公式ドキュメント

- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com/)
- [React Hook Form](https://react-hook-form.com/)
- [Zod](https://zod.dev/)
- [TanStack Table](https://tanstack.com/table/latest)

### shadcn/ui関連

- [Next.js Installation](https://ui.shadcn.com/docs/installation/next)
- [Form Component](https://ui.shadcn.com/docs/components/form)
- [Data Table](https://ui.shadcn.com/docs/components/data-table)
- [Theming](https://ui.shadcn.com/docs/theming)

### Tailwind + shadcn/ui 2025

- [Building a Modern Application in 2025: Next.js 15, React 19, Tailwind CSS v4 & Shadcn/ui](https://medium.com/@raviig/building-a-modern-application-in-2025-next-js-be1ca42f5c3d)
- [Setting Up Next.js 15 with ShadCN & Tailwind CSS v4](https://dev.to/darshan_bajgain/setting-up-2025-nextjs-15-with-shadcn-tailwind-css-v4-no-config-needed-dark-mode-5kl)

---

## 注意事項

### 重要な制約

1. **Tailwind CSS v3を使用**
   - v4はまだshadcn/uiとの互換性が不安定
   - `bun add -D tailwindcss`でv3系がインストールされる

2. **ダークモード非対応**
   - `darkMode: ['class']`は設定に含めるが、実装はしない
   - shadcn/uiの一部コンポーネントが設定を要求するため

3. **CSS変数ベースのカラーシステム**
   - `hsl(var(--primary))`形式で定義
   - Tailwindのカラークラス（`bg-primary`など）で使用

4. **コンポーネントはコピー&ペースト**
   - shadcn/uiはnpmパッケージではなく、ソースコードを直接配置
   - 更新は手動で行う必要がある

---

**作成日:** 2025-11-16
