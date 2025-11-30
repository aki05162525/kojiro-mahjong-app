'use client'

import { useState } from 'react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Session } from '@/src/types/session'
import { ScoreInputDialog } from '../scores/score-input-dialog'

interface SessionListProps {
  sessions: Session[]
}

/**
 * 風の日本語表記
 */
const WIND_LABELS: Record<string, string> = {
  east: '東',
  south: '南',
  west: '西',
  north: '北',
}

/**
 * 卓タイプの日本語表記
 */
const TABLE_TYPE_LABELS: Record<string, string> = {
  first: '初回',
  upper: '上位卓',
  lower: '下位卓',
}

/**
 * 風の順序（ソート用）
 */
const WIND_ORDER: Record<string, number> = {
  east: 0,
  south: 1,
  west: 2,
  north: 3,
}

/**
 * 節一覧コンポーネント
 */
export function SessionList({ sessions }: SessionListProps) {
  const [selectedTable, setSelectedTable] = useState<{
    tableId: string
    tableType: 'first' | 'upper' | 'lower'
    scores: Session['tables'][0]['scores']
  } | null>(null)

  if (sessions.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-sm text-muted-foreground">まだ節が作成されていません</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {sessions.map((session) => (
          <Card key={session.id}>
            <CardHeader>
              <CardTitle>第{session.sessionNumber}節</CardTitle>
              <p className="text-sm text-muted-foreground">
                作成日: {new Date(session.createdAt).toLocaleDateString('ja-JP')}
              </p>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {session.tables
                  .sort((a, b) => a.tableNumber - b.tableNumber)
                  .map((table) => {
                    const allScoresEntered = table.scores.every((s) => s.rank !== null)

                    return (
                      <AccordionItem key={table.id} value={`table-${table.id}`}>
                        <AccordionTrigger>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{table.tableNumber}卓</span>
                            <span className="text-sm text-muted-foreground">
                              ({TABLE_TYPE_LABELS[table.tableType]})
                            </span>
                            {allScoresEntered && (
                              <span className="text-xs text-green-600">✓ 入力済み</span>
                            )}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-4">
                            <div className="grid gap-2 sm:grid-cols-2">
                              {table.scores
                                .sort((a, b) => WIND_ORDER[a.wind] - WIND_ORDER[b.wind])
                                .map((score) => (
                                  <div
                                    key={score.id}
                                    className="flex items-center justify-between rounded-lg border bg-card p-3 text-sm"
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium">
                                        {WIND_LABELS[score.wind]}
                                      </span>
                                      <div>
                                        <div className="font-medium">{score.player.name}</div>
                                        {score.finalScore !== null && (
                                          <div className="text-xs text-muted-foreground">
                                            {score.finalScore.toLocaleString()}点 / {score.totalPt}
                                            pt
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    {score.rank !== null && (
                                      <span className="text-muted-foreground">{score.rank}位</span>
                                    )}
                                  </div>
                                ))}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={() =>
                                setSelectedTable({
                                  tableId: table.id,
                                  tableType: table.tableType,
                                  scores: table.scores,
                                })
                              }
                            >
                              スコアを入力
                            </Button>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )
                  })}
              </Accordion>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedTable && (
        <ScoreInputDialog
          open={!!selectedTable}
          onOpenChange={(open) => !open && setSelectedTable(null)}
          tableId={selectedTable.tableId}
          tableType={selectedTable.tableType}
          scores={selectedTable.scores}
        />
      )}
    </>
  )
}
