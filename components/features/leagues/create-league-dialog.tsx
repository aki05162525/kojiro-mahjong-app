'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, X } from 'lucide-react'
import { useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { useCreateLeague } from '@/src/client/hooks/useLeagues'
import { type CreateLeagueInput, createLeagueSchema } from '@/src/schemas/leagues'

interface CreateLeagueDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * リーグ作成ダイアログコンポーネント
 */
export function CreateLeagueDialog({ open, onOpenChange }: CreateLeagueDialogProps) {
  const { toast } = useToast()
  const createLeague = useCreateLeague()
  const [playerNameInput, setPlayerNameInput] = useState('')
  const [playerNameError, setPlayerNameError] = useState('')

  const form = useForm<CreateLeagueInput>({
    resolver: zodResolver(createLeagueSchema),
    defaultValues: {
      name: '',
      description: '',
      players: [],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'players',
  })

  // プレイヤー人数の選択肢（8人 or 16人）
  const [requiredPlayerCount, setRequiredPlayerCount] = useState<8 | 16>(8)

  // プレイヤー追加処理
  const handleAddPlayer = () => {
    const name = playerNameInput.trim()

    // 入力チェック
    if (!name) {
      setPlayerNameError('プレイヤー名を入力してください')
      return
    }

    if (name.length > 20) {
      setPlayerNameError('プレイヤー名は20文字以内で入力してください')
      return
    }

    // 重複チェック（リーグ内で一意）
    if (fields.some((field) => field.name === name)) {
      setPlayerNameError('同じ名前のプレイヤーが既に存在します')
      return
    }

    // プレイヤー追加
    append({ name })
    setPlayerNameInput('')
    setPlayerNameError('')
  }

  // プレイヤー削除処理
  const handleRemovePlayer = (index: number) => {
    remove(index)
  }

  // フォーム送信処理
  const onSubmit = async (data: CreateLeagueInput) => {
    try {
      await createLeague.mutateAsync(data)
      toast({
        title: 'リーグを作成しました',
        variant: 'default',
      })
      onOpenChange(false)
      form.reset()
      setPlayerNameInput('')
      setPlayerNameError('')
    } catch (error) {
      toast({
        title: 'リーグの作成に失敗しました',
        description: error instanceof Error ? error.message : '不明なエラーが発生しました',
        variant: 'destructive',
      })
    }
  }

  // プレイヤー数が要件を満たしているかチェック
  const isPlayerCountValid = fields.length === requiredPlayerCount
  const canAddPlayer = fields.length < requiredPlayerCount

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>新しいリーグを作成</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* リーグ名 */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>リーグ名</FormLabel>
                  <FormControl>
                    <Input placeholder="例: 2025年春季リーグ" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 説明 */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>説明（任意）</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="リーグの説明を入力してください（任意）"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* プレイヤー人数選択 */}
            <div className="space-y-3">
              <FormLabel>プレイヤー人数</FormLabel>
              <RadioGroup
                value={requiredPlayerCount.toString()}
                onValueChange={(value) => setRequiredPlayerCount(Number(value) as 8 | 16)}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="8" id="player-count-8" />
                  <label htmlFor="player-count-8" className="cursor-pointer">
                    8人
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="16" id="player-count-16" />
                  <label htmlFor="player-count-16" className="cursor-pointer">
                    16人
                  </label>
                </div>
              </RadioGroup>
            </div>

            {/* プレイヤー追加 */}
            <div className="space-y-3">
              <FormLabel>プレイヤー新規作成</FormLabel>

              {/* プレイヤー追加入力欄 */}
              {canAddPlayer && (
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      placeholder="名前を入力"
                      value={playerNameInput}
                      onChange={(e) => {
                        setPlayerNameInput(e.target.value)
                        setPlayerNameError('')
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddPlayer()
                        }
                      }}
                    />
                    {playerNameError && (
                      <p className="text-sm text-destructive mt-1">{playerNameError}</p>
                    )}
                  </div>
                  <Button
                    type="button"
                    onClick={handleAddPlayer}
                    disabled={!playerNameInput.trim()}
                  >
                    作成
                  </Button>
                </div>
              )}

              {/* プレイヤー一覧 */}
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">
                  {fields.length} / {requiredPlayerCount} 人
                </div>

                {fields.length > 0 && (
                  <ScrollArea className="h-[200px] rounded-md border p-4">
                    <div className="space-y-2">
                      {fields.map((field, index) => (
                        <div
                          key={field.id}
                          className="flex items-center justify-between bg-muted/50 rounded-md px-3 py-2"
                        >
                          <span className="text-sm">{field.name}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemovePlayer(index)}
                            className="h-6 w-6 p-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </div>

            {/* フッター */}
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={createLeague.isPending}
              >
                キャンセル
              </Button>
              <Button type="submit" disabled={!isPlayerCountValid || createLeague.isPending}>
                {createLeague.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                作成
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
