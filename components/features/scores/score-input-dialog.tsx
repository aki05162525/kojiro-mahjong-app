'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { useUpdateScores } from '@/src/client/hooks/useScores'
import type { SessionScore } from '@/src/types/session'

interface ScoreInputDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tableId: string
  tableType: 'first' | 'upper' | 'lower'
  scores: SessionScore[]
}

const WIND_LABELS: Record<string, string> = {
  east: '東',
  south: '南',
  west: '西',
  north: '北',
}

const WIND_ORDER: Record<string, number> = {
  east: 0,
  south: 1,
  west: 2,
  north: 3,
}

export function ScoreInputDialog({ open, onOpenChange, tableId, scores }: ScoreInputDialogProps) {
  const router = useRouter()
  const { toast } = useToast()
  const updateScores = useUpdateScores()

  // 風順にソート
  const sortedScores = useMemo(
    () => [...scores].sort((a, b) => WIND_ORDER[a.wind] - WIND_ORDER[b.wind]),
    [scores],
  )

  // フォーム状態（scoreId → finalScore のマップ）
  const [inputScores, setInputScores] = useState<Record<string, string>>({})

  // scoresが変更されたときに状態をリセット（別のテーブルに切り替わった場合など）
  useEffect(() => {
    setInputScores(
      Object.fromEntries(sortedScores.map((s) => [s.id, s.finalScore?.toString() || ''])),
    )
  }, [sortedScores])

  // 合計点チェック
  const totalScore = useMemo(() => {
    return Object.values(inputScores).reduce((sum, val) => {
      const num = Number.parseInt(val, 10)
      return sum + (Number.isNaN(num) ? 0 : num)
    }, 0)
  }, [inputScores])

  const isValid = totalScore === 100000

  const handleSubmit = async () => {
    if (!isValid) {
      toast({
        variant: 'destructive',
        title: '入力エラー',
        description: '合計点数は100,000点である必要があります',
      })
      return
    }

    try {
      await updateScores.mutateAsync({
        tableId,
        scores: {
          scores: sortedScores.map((s) => ({
            scoreId: s.id,
            finalScore: Number.parseInt(inputScores[s.id], 10),
          })),
        },
      })

      toast({
        title: 'スコアを更新しました',
        description: 'ポイントが自動計算されました',
      })

      onOpenChange(false)
      router.refresh()
    } catch (error) {
      console.error('Failed to update scores:', error)
      toast({
        variant: 'destructive',
        title: 'スコア更新に失敗しました',
        description: error instanceof Error ? error.message : 'もう一度お試しください',
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>スコア入力</DialogTitle>
          <DialogDescription>
            4人分の最終得点を入力してください。合計は100,000点である必要があります。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {sortedScores.map((score) => (
            <div key={score.id} className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">
                {WIND_LABELS[score.wind]} {score.player.name}
              </Label>
              <Input
                type="number"
                className="col-span-2"
                value={inputScores[score.id]}
                onChange={(e) => setInputScores({ ...inputScores, [score.id]: e.target.value })}
                placeholder="25000"
              />
              <span className="text-sm text-muted-foreground">点</span>
            </div>
          ))}

          <div className="flex items-center justify-between border-t pt-4">
            <span className="font-medium">合計:</span>
            <span className={`font-bold ${isValid ? 'text-green-600' : 'text-red-600'}`}>
              {totalScore.toLocaleString()} 点
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={updateScores.isPending}
          >
            キャンセル
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!isValid || updateScores.isPending}
          >
            {updateScores.isPending ? '保存中...' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
