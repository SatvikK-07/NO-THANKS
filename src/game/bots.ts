import type { BotStyle, GameState } from './engine'
import { addAndScore, cardPoints, getActivePlayer } from './engine'

const formsRun = (card: number, cards: number[]) =>
  cards.includes(card - 1) || cards.includes(card + 1)

export const decideBotAction = (
  state: GameState,
  style: BotStyle = 'standard',
): 'pass' | 'take' => {
  if (state.activeCard === null) return 'take'
  const player = getActivePlayer(state)
  if (player.chips <= 0) return 'take'
  const card = state.activeCard
  const { total: baseCardPoints } = cardPoints(player.cards)
  const baseScore = baseCardPoints - player.chips
  const { projectedScore } = addAndScore(player, card, state.chipsOnCard)
  const delta = projectedScore - baseScore
  const runLink = formsRun(card, player.cards)

  if (style === 'greedy') {
    if (runLink) return 'take'
    if (delta <= 2) return 'take'
    if (state.chipsOnCard >= 4) return 'take'
    return 'pass'
  }

  if (style === 'easy') {
    if (runLink && delta <= 3) return 'take'
    const chance = Math.random()
    if (state.chipsOnCard >= 3 && chance > 0.3) return 'take'
    return chance > 0.5 ? 'pass' : 'take'
  }

  // standard
  if (delta <= 0) return 'take'
  if (runLink && delta <= 3) return 'take'
  if (state.deck.length < 6 && delta <= 4) return 'take'
  if (state.chipsOnCard >= 5 && delta <= 5) return 'take'
  return 'pass'
}
