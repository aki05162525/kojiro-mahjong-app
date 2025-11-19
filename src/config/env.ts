/**
 * 環境変数の検証と取得を一元管理
 * DRY原則に従い、環境変数チェックを集約
 */

/**
 * DATABASE_URL環境変数を取得（検証済み）
 * @throws {Error} DATABASE_URLが未定義の場合
 */
export function getDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error('DATABASE_URL must be defined in environment variables.')
  }
  return databaseUrl
}

/**
 * Supabase関連の環境変数を取得（検証済み）
 * @throws {Error} 必須の環境変数が未定義の場合
 */
export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL must be defined in environment variables.')
  }
  if (!anonKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY must be defined in environment variables.')
  }

  return { url, anonKey }
}
