export type BotStyle = 'easy' | 'standard' | 'greedy'

export type SetupPlayer = {
  id: string
  name: string
  isHuman: boolean
  botStyle?: BotStyle
}

export type Player = SetupPlayer & {
  chips: number
  cards: number[]
}

export type ScoreEntry = {
  playerId: string
  name: string
  total: number
  cardPoints: number
  chipPoints: number
  runs: number[][]
}

export type GameState = {
  players: Player[]
  deck: number[]
  removed: number[]
  activeCard: number | null
  chipsOnCard: number
  currentPlayerIndex: number
  status: 'playing' | 'done'
  scores?: ScoreEntry[]
}

export const MIN_CARD = 3
export const MAX_CARD = 35
export const UNKNOWN_CARDS = 9
export const STARTING_CHIPS = 11

const range = (start: number, endInclusive: number) =>
  Array.from({ length: endInclusive - start + 1 }, (_, i) => start + i)

const shuffle = (cards: number[]) => {
  const deck = [...cards]
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[deck[i], deck[j]] = [deck[j], deck[i]]
  }
  return deck
}

export const makeDeck = () => range(MIN_CARD, MAX_CARD)

export const prepareDeck = () => {
  const deck = makeDeck()
  const removed: number[] = []
  for (let i = 0; i < UNKNOWN_CARDS; i += 1) {
    const idx = Math.floor(Math.random() * deck.length)
    removed.push(deck.splice(idx, 1)[0])
  }
  return { deck: shuffle(deck), removed }
}

const startPlayers = (setups: SetupPlayer[]): Player[] =>
  setups.map((p) => ({
    ...p,
    chips: STARTING_CHIPS,
    cards: [],
  }))

export const createGame = (setups: SetupPlayer[]): GameState => {
  const { deck, removed } = prepareDeck()
  const firstCard = deck.shift() ?? null
  return {
    players: startPlayers(setups),
    deck,
    removed,
    activeCard: firstCard,
    chipsOnCard: 0,
    currentPlayerIndex: 0,
    status: 'playing',
  }
}

export const cardPoints = (cards: number[]) => {
  if (!cards.length) return { total: 0, runs: [] as number[][] }
  const sorted = [...cards].sort((a, b) => a - b)
  const runs: number[][] = []
  let currentRun: number[] = [sorted[0]]
  for (let i = 1; i < sorted.length; i += 1) {
    const card = sorted[i]
    const prev = sorted[i - 1]
    if (card === prev + 1) {
      currentRun.push(card)
    } else {
      runs.push(currentRun)
      currentRun = [card]
    }
  }
  runs.push(currentRun)
  const total = runs.reduce((acc, run) => acc + run[0], 0)
  return { total, runs }
}

export const computeScores = (players: Player[]): ScoreEntry[] =>
  players
    .map((p) => {
      const { total, runs } = cardPoints(p.cards)
      const chipPoints = p.chips
      const final = total - chipPoints
      return {
        playerId: p.id,
        name: p.name,
        total: final,
        cardPoints: total,
        chipPoints,
        runs,
      }
    })
    .sort((a, b) => a.total - b.total)

const nextPlayerIndex = (state: GameState) =>
  (state.currentPlayerIndex + 1) % state.players.length

export const passCard = (state: GameState): GameState => {
  if (state.status !== 'playing' || state.activeCard === null) return state
  const player = state.players[state.currentPlayerIndex]
  if (player.chips <= 0) return state
  const updatedPlayers = state.players.map((p, idx) =>
    idx === state.currentPlayerIndex ? { ...p, chips: p.chips - 1 } : p,
  )
  return {
    ...state,
    players: updatedPlayers,
    chipsOnCard: state.chipsOnCard + 1,
    currentPlayerIndex: nextPlayerIndex(state),
  }
}

const endStateIfNeeded = (state: GameState): GameState => {
  if (state.activeCard !== null) return state
  const scores = computeScores(state.players)
  return { ...state, status: 'done', scores }
}

export const takeCard = (state: GameState): GameState => {
  if (state.status !== 'playing' || state.activeCard === null) return state
  const card = state.activeCard
  const updatedPlayers = state.players.map((p, idx) => {
    if (idx !== state.currentPlayerIndex) return p
    const cards = [...p.cards, card].sort((a, b) => a - b)
    return { ...p, cards, chips: p.chips + state.chipsOnCard }
  })
  const nextCard = state.deck[0] ?? null
  const nextDeck = state.deck.slice(1)
  const updated: GameState = {
    ...state,
    players: updatedPlayers,
    activeCard: nextCard,
    deck: nextDeck,
    chipsOnCard: 0,
    currentPlayerIndex: state.currentPlayerIndex,
  }
  if (nextCard === null) {
    return endStateIfNeeded({ ...updated, activeCard: null })
  }
  return updated
}

export const getActivePlayer = (state: GameState) =>
  state.players[state.currentPlayerIndex]

export const canPass = (state: GameState) =>
  state.status === 'playing' &&
  state.activeCard !== null &&
  getActivePlayer(state).chips > 0

export const canTake = (state: GameState) =>
  state.status === 'playing' && state.activeCard !== null

export const addAndScore = (player: Player, card: number, chipsOnCard: number) => {
  const hand = [...player.cards, card]
  const { total } = cardPoints(hand)
  const chipPoints = player.chips + chipsOnCard
  return { projectedScore: total - chipPoints }
}
