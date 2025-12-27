import { describe, expect, it } from 'vitest'
import {
  STARTING_CHIPS,
  cardPoints,
  computeScores,
  createGame,
  passCard,
  takeCard,
} from './engine'

const makeState = () =>
  createGame([
    { id: 'p1', name: 'A', isHuman: true },
    { id: 'p2', name: 'B', isHuman: false },
    { id: 'p3', name: 'C', isHuman: false },
  ])

describe('engine', () => {
  it('removes 9 unknown cards and shuffles the rest', () => {
    const game = makeState()
    expect(game.removed).toHaveLength(9)
    expect(game.deck).toHaveLength(23) // 24 total cards, 1 is the active card
    expect(game.activeCard).not.toBeNull()
  })

  it('pass spends a chip and moves to next player', () => {
    const game = makeState()
    const after = passCard(game)
    expect(after.players[0].chips).toBe(STARTING_CHIPS - 1)
    expect(after.chipsOnCard).toBe(1)
    expect(after.currentPlayerIndex).toBe(1)
  })

  it('take collects chips and keeps same player', () => {
    const game = makeState()
    const withChips = { ...game, chipsOnCard: 2 }
    const after = takeCard(withChips)
    expect(after.players[0].chips).toBe(STARTING_CHIPS + 2)
    expect(after.players[0].cards.length).toBe(1)
    expect(after.currentPlayerIndex).toBe(0)
  })

  it('scores only the lowest card in a run', () => {
    const { total, runs } = cardPoints([27, 28, 29, 30, 10])
    expect(total).toBe(37) // 27 + 10
    expect(runs.length).toBe(2)
  })

  it('computes final scores when deck is exhausted', () => {
    let game = makeState()
    // force a tiny deck
    game.deck = []
    game.activeCard = 10
    game.chipsOnCard = 3
    const done = takeCard(game)
    expect(done.status).toBe('done')
    expect(done.scores?.[0].total).toBeLessThanOrEqual(done.scores?.[1].total ?? 999)
  })

  it('treats runs as free for added higher cards', () => {
    const { total: base } = cardPoints([10])
    const { total: withHigh } = cardPoints([10, 11, 12])
    expect(withHigh).toBe(base)
  })

  it('chip count reduces final score', () => {
    const scores = computeScores([
      { id: 'p1', name: 'A', isHuman: true, chips: 12, cards: [10, 11] },
    ])
    expect(scores[0].total).toBe(-2)
  })
})
