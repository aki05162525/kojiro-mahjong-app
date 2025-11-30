/**
 * リーグステータスのスタイルを取得
 */
export function getStatusBadge(status: string): string {
  const baseClasses = 'inline-flex items-center rounded-full px-3 py-1 text-sm font-medium'
  switch (status) {
    case 'active':
      return `${baseClasses} bg-[hsl(var(--ds-status-info-light))] text-[hsl(var(--ds-status-info))]`
    case 'completed':
      return `${baseClasses} bg-[hsl(var(--ds-status-success-light))] text-[hsl(var(--ds-status-success))]`
    default:
      return `${baseClasses} bg-muted text-muted-foreground`
  }
}

/**
 * リーグステータスの日本語ラベルを取得
 */
export function getStatusLabel(status: string): string {
  switch (status) {
    case 'active':
      return '進行中'
    case 'completed':
      return '完了'
    case 'deleted':
      return '削除済み'
    default:
      return status
  }
}
