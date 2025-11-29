'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { useUpdateLeague, useUpdatePlayerName } from '@/src/client/hooks/useLeagues'
import { leagueStatusSchema, playerNameSchema } from '@/src/schemas/leagues'

// ステータス選択肢を定数として定義
const STATUS_OPTIONS = [
  { value: 'active' as const, label: '進行中' },
  { value: 'completed' as const, label: '完了' },
] as const

// フォームスキーマ定義
const settingsFormSchema = z.object({
  name: z.string().min(1, 'リーグ名は必須です').max(20, 'リーグ名は20文字以内で入力してください'),
  description: z.string().optional(),
  status: leagueStatusSchema.exclude(['deleted']),
  players: z.array(
    z.object({
      id: z.string(),
      name: playerNameSchema.shape.name,
    }),
  ),
})

type SettingsFormValues = z.infer<typeof settingsFormSchema>

interface LeagueSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  league: {
    id: string
    name: string
    description: string | null
    status: string
    players: Array<{
      id: string
      name: string
      role: string | null
    }>
  }
}

/**
 * リーグ設定変更ダイアログ
 * リーグ名・説明・ステータスを編集できる
 */
export function LeagueSettingsDialog({ open, onOpenChange, league }: LeagueSettingsDialogProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const updateLeague = useUpdateLeague()
  const updatePlayerName = useUpdatePlayerName()

  // React Hook Form の初期化
  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      name: league.name,
      description: league.description ?? '',
      status: league.status as 'active' | 'completed',
      players: league.players.map((p) => ({ id: p.id, name: p.name })),
    },
  })

  // フォーム送信処理
  const onSubmit = async (data: SettingsFormValues) => {
    setIsSubmitting(true)

    try {
      // リーグ情報を更新
      await updateLeague.mutateAsync({
        leagueId: league.id,
        data: {
          name: data.name,
          description: data.description,
          // ステータスは別エンドポイントで更新する想定
        },
      })

      // プレイヤー名が変更されているものを更新
      const playerUpdatePromises = data.players
        .map((player, index) => {
          const originalPlayer = league.players[index]
          if (originalPlayer && player.name !== originalPlayer.name) {
            return updatePlayerName.mutateAsync({
              leagueId: league.id,
              playerId: player.id,
              name: player.name,
            })
          }
          return null
        })
        .filter((promise) => promise !== null)

      await Promise.all(playerUpdatePromises)

      toast({
        title: '更新完了',
        description: 'リーグ設定を更新しました',
      })

      onOpenChange(false)
      router.refresh()
    } catch (error) {
      console.error('Failed to update league:', error)
      toast({
        variant: 'destructive',
        title: '更新失敗',
        description: '更新に失敗しました。もう一度お試しください。',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>リーグ設定</DialogTitle>
          <DialogDescription>
            リーグの名前、説明、ステータス、プレイヤー名を変更できます
          </DialogDescription>
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
                    <Input placeholder={league.name} {...field} />
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
                    <Textarea placeholder={league.description ?? ''} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* ステータス */}
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ステータス</FormLabel>
                  <FormControl>
                    <RadioGroup onValueChange={field.onChange} defaultValue={field.value}>
                      <div className="space-y-2">
                        {STATUS_OPTIONS.map((option) => (
                          <div key={option.value} className="flex items-center space-x-2">
                            <RadioGroupItem value={option.value} id={`status-${option.value}`} />
                            <label
                              htmlFor={`status-${option.value}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                            >
                              {option.label}
                            </label>
                          </div>
                        ))}
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* プレイヤー名編集 */}
            <div className="space-y-2">
              <FormLabel>プレイヤー名</FormLabel>
              <ScrollArea className="h-[200px] rounded-md border p-4">
                <div className="space-y-3">
                  {form.watch('players').map((player, index) => (
                    <FormField
                      key={player.id}
                      control={form.control}
                      name={`players.${index}.name`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              placeholder={`プレイヤー ${index + 1}`}
                              {...field}
                              className="w-full"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
              </ScrollArea>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                キャンセル
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? '更新中...' : '更新'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
