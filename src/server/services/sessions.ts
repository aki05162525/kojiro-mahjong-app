import type { Wind } from '@/src/schemas/sessions'
import { BadRequestError } from '../middleware/error-handler'
import {
  createSessionTransaction,
  findPlayersByLeagueId,
  findPreviousSession,
  findSessionsByLeagueId,
  getNextSessionNumber,
} from '../repositories/sessions'
import * as leaguesService from './leagues'

/**
 * Fisher-Yates シャッフルアルゴリズム
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

/**
 * 風（座順）の配列
 */
const WINDS: Wind[] = ['east', 'south', 'west', 'north']

/**
 * 第1節のマッチング（ランダム）
 */
function matchPlayersForFirstSession(players: Array<{ id: string; name: string }>) {
  const shuffled = shuffleArray(players)
  const tables = []

  // 4名ずつ4つの卓に割り当て
  for (let i = 0; i < 4; i++) {
    const tableNumber = i + 1
    const tablePlayers = shuffled.slice(i * 4, (i + 1) * 4)

    tables.push({
      tableNumber,
      tableType: 'first' as const,
      scores: tablePlayers.map((player, index) => ({
        playerId: player.id,
        wind: WINDS[index],
      })),
    })
  }

  return tables
}

/**
 * 第2節以降のマッチング（昇降級）
 */
function matchPlayersForNextSession(
  previousSession: NonNullable<Awaited<ReturnType<typeof findPreviousSession>>>,
) {
  // 各卓のスコアを順位でソート
  const upperPlayers: string[] = []
  const lowerPlayers: string[] = []

  for (const table of previousSession.tables) {
    // 順位でソート（rank が null の場合は除外）
    const sortedScores = table.scores
      .filter((score): score is typeof score & { rank: number } => score.rank !== null)
      .sort((a, b) => a.rank - b.rank)

    // 上位2名（1位・2位）
    if (sortedScores[0]) {
      upperPlayers.push(sortedScores[0].playerId)
    }
    if (sortedScores[1]) {
      upperPlayers.push(sortedScores[1].playerId)
    }

    // 下位2名（3位・4位）
    if (sortedScores[2]) {
      lowerPlayers.push(sortedScores[2].playerId)
    }
    if (sortedScores[3]) {
      lowerPlayers.push(sortedScores[3].playerId)
    }
  }

  // シャッフル
  const shuffledUpper = shuffleArray(upperPlayers)
  const shuffledLower = shuffleArray(lowerPlayers)

  const tables = []

  // 上位卓（2卓）
  for (let i = 0; i < 2; i++) {
    const tableNumber = i + 1
    const tablePlayers = shuffledUpper.slice(i * 4, (i + 1) * 4)

    tables.push({
      tableNumber,
      tableType: 'upper' as const,
      scores: tablePlayers.map((playerId, index) => ({
        playerId,
        wind: WINDS[index],
      })),
    })
  }

  // 下位卓（2卓）
  for (let i = 0; i < 2; i++) {
    const tableNumber = i + 3 // 3, 4
    const tablePlayers = shuffledLower.slice(i * 4, (i + 1) * 4)

    tables.push({
      tableNumber,
      tableType: 'lower' as const,
      scores: tablePlayers.map((playerId, index) => ({
        playerId,
        wind: WINDS[index],
      })),
    })
  }

  return tables
}

/**
 * セッション作成
 */
export async function createSession(leagueId: string, userId: string) {
  // 管理者権限をチェック
  await leaguesService.findLeagueAndVerifyAdmin(leagueId, userId)

  // 次のセッション番号を取得
  const sessionNumber = await getNextSessionNumber(leagueId)

  let tables: Array<{
    tableNumber: number
    tableType: 'first' | 'upper' | 'lower'
    scores: Array<{
      playerId: string
      wind: Wind
    }>
  }>

  if (sessionNumber === 1) {
    // 第1節の場合：全プレイヤーをランダムマッチング
    const players = await findPlayersByLeagueId(leagueId)

    if (players.length !== 16) {
      throw new BadRequestError('第1節の作成にはプレイヤーが16名必要です')
    }

    tables = matchPlayersForFirstSession(players)
  } else {
    // 第2節以降：前節の結果に基づいて昇降級
    const previousSession = await findPreviousSession(leagueId, sessionNumber)

    if (!previousSession) {
      throw new BadRequestError('前節の情報が見つかりません')
    }

    // 前節のスコアがすべて入力されているかチェック
    const allScoresEntered = previousSession.tables.every((table) =>
      table.scores.every((score) => score.rank !== null),
    )

    if (!allScoresEntered) {
      throw new BadRequestError('前節のスコアがすべて入力されていません')
    }

    tables = matchPlayersForNextSession(previousSession)
  }

  // トランザクションでセッション作成
  const session = await createSessionTransaction({
    leagueId,
    sessionNumber,
    tables,
  })

  return session
}

/**
 * リーグの節一覧を取得
 */
export async function getSessionsByLeagueId(leagueId: string, userId: string) {
  // リーグメンバーであることをチェック
  await leaguesService.getLeagueById(leagueId, userId)

  return await findSessionsByLeagueId(leagueId)
}
