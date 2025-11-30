'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { useCreateSession } from '@/src/client/hooks/useSessions'

interface CreateSessionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  leagueId: string
  sessionNumber: number
}

/**
 * 節作成確認ダイアログ
 */
export function CreateSessionDialog({
  open,
  onOpenChange,
  leagueId,
  sessionNumber,
}: CreateSessionDialogProps) {
  const router = useRouter()
  const { toast } = useToast()
  const createSession = useCreateSession()

  const handleCreate = async () => {
    try {
      await createSession.mutateAsync(leagueId)

      toast({
        title: '節を作成しました',
        description: `第${sessionNumber}節の卓割り当てが完了しました`,
      })

      onOpenChange(false)
      router.refresh()
    } catch (error) {
      console.error('Failed to create session:', error)
      toast({
        variant: 'destructive',
        title: '節の作成に失敗しました',
        description: error instanceof Error ? error.message : 'もう一度お試しください',
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>第{sessionNumber}節を作成</DialogTitle>
          <DialogDescription>
            新しい節を作成し、卓割り当てを自動で行います。
            {sessionNumber === 1
              ? 'プレイヤーをランダムに4卓に割り当てます。'
              : '前節の結果に基づいて昇降級を行います。'}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-muted-foreground">
            この操作は取り消せません。よろしいですか？
          </p>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={createSession.isPending}
          >
            キャンセル
          </Button>
          <Button type="button" onClick={handleCreate} disabled={createSession.isPending}>
            {createSession.isPending ? '作成中...' : '作成'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
