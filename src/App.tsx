import { useEffect, useMemo, useState } from 'react'
import type { BotStyle, GameState, SetupPlayer } from './game/engine'
import {
  canPass,
  canTake,
  createGame,
  getActivePlayer,
  passCard,
  takeCard,
} from './game/engine'
import { decideBotAction } from './game/bots'
import './App.css'

type Stage = 'setup' | 'playing' | 'done'

const defaultPlayers: SetupPlayer[] = [
  { id: 'p1', name: 'You', isHuman: true },
  { id: 'p2', name: 'Friend', isHuman: true },
  { id: 'p3', name: 'Bot A', isHuman: false, botStyle: 'standard' },
]

const baseUrl = import.meta.env.BASE_URL
const cardSrc = (value: number) => `${baseUrl}cards/${value}.png`

const ChipCluster = ({ count }: { count: number }) => {
  const dots = Math.min(count, 12)
  return (
    <div className="chip-cluster" title={`${count} chips`}>
      <div className="chip-dots">
        {Array.from({ length: dots }).map((_, i) => (
          <span key={i} className="chip-dot" />
        ))}
      </div>
      <div className="chip-count">x{count}</div>
    </div>
  )
}

type HandModalProps = {
  open: boolean
  onClose: () => void
  playerName: string
  chips: number
  cards: number[]
}

const HandModal = ({ open, onClose, playerName, chips, cards }: HandModalProps) => {
  if (!open) return null
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        onClick={(e) => {
          e.stopPropagation()
        }}
      >
        <div className="modal-header">
          <h3>{playerName}&rsquo;s cards</h3>
          <button className="ghost" onClick={onClose}>
            Hide
          </button>
        </div>
        <p className="muted">Chips: {chips}</p>
        <div className="hand-grid">
          {cards.length === 0 && <p className="muted">No cards yet.</p>}
          {cards.map((c) => (
            <div key={c} className="mini-card">
              <img src={cardSrc(c)} alt={`Card ${c}`} />
              <span>{c}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

type ScoreboardProps = {
  state: GameState
  onRematch: () => void
  onNewGame: () => void
}

const Scoreboard = ({ state, onRematch, onNewGame }: ScoreboardProps) => {
  if (state.status !== 'done' || !state.scores) return null
  return (
    <div className="panel score-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Final scores</p>
          <h2>Lowest score wins</h2>
        </div>
        <div className="actions">
          <button className="ghost" onClick={onNewGame}>
            New setup
          </button>
          <button className="cta" onClick={onRematch}>
            Rematch
          </button>
        </div>
      </div>
      <div className="score-grid">
        {state.scores.map((s, idx) => (
          <div key={s.playerId} className="score-row">
            <div className="rank">{idx + 1}</div>
            <div className="score-name">
              <strong>{s.name}</strong>
              <p className="muted">
                Cards: {s.cardPoints} &mdash; Chips: -{s.chipPoints}
              </p>
            </div>
            <div className="total">{s.total}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

type SetupScreenProps = {
  onStart: (players: SetupPlayer[]) => void
}

type PlayerRow = SetupPlayer

const botLabel: Record<BotStyle, string> = {
  easy: 'Easy',
  standard: 'Standard',
  greedy: 'Greedy',
}

const SetupScreen = ({ onStart }: SetupScreenProps) => {
  const [playerCount, setPlayerCount] = useState(3)
  const [players, setPlayers] = useState<PlayerRow[]>(() => defaultPlayers)

  useEffect(() => {
    if (players.length === playerCount) return
    if (players.length < playerCount) {
      const toAdd = playerCount - players.length
      const startIdx = players.length + 1
      const additions = Array.from({ length: toAdd }, (_, i) => ({
        id: `p${startIdx + i}`,
        name: `Bot ${startIdx + i}`,
        isHuman: false,
        botStyle: 'standard' as BotStyle,
      }))
      setPlayers([...players, ...additions])
    } else {
      setPlayers(players.slice(0, playerCount))
    }
  }, [playerCount, players])

  const updatePlayer = (index: number, updates: Partial<PlayerRow>) => {
    setPlayers((prev) => prev.map((p, i) => (i === index ? { ...p, ...updates } : p)))
  }

  const canStart = players.every((p) => p.name.trim().length > 0)

  return (
    <div className="panel setup-panel" id="setup">
      <p className="eyebrow">No Thanks!</p>
      <h1>Quick table setup</h1>
      <p className="muted">
        Choose 3&ndash;5 seats, mark who&rsquo;s human, and set bot styles. Each player starts with
        11 chips and 9 random cards are removed from the deck.
      </p>
      <div className="controls-row">
        <label className="field">
          <span>Players</span>
          <select value={playerCount} onChange={(e) => setPlayerCount(Number(e.target.value))}>
            {[3, 4, 5].map((c) => (
              <option value={c} key={c}>
                {c} players
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="player-list">
        {players.map((p, idx) => (
          <div key={p.id} className="player-row">
            <div className="row-primary">
              <label className="field checkbox">
                <input
                  type="checkbox"
                  checked={p.isHuman}
                  onChange={(e) => updatePlayer(idx, { isHuman: e.target.checked })}
                />
                <span>Human?</span>
              </label>
              <input
                className="field"
                value={p.name}
                onChange={(e) => updatePlayer(idx, { name: e.target.value })}
              />
            </div>
            {!p.isHuman && (
              <label className="field">
                <span>Bot</span>
                <select
                  value={p.botStyle ?? 'standard'}
                  onChange={(e) =>
                    updatePlayer(idx, { botStyle: e.target.value as BotStyle, isHuman: false })
                  }
                >
                  {(['easy', 'standard', 'greedy'] as BotStyle[]).map((style) => (
                    <option key={style} value={style}>
                      {botLabel[style]}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
        ))}
      </div>
      <div className="actions">
        <button className="ghost" onClick={() => setPlayers(defaultPlayers)}>
          Reset
        </button>
        <button className="cta" disabled={!canStart} onClick={() => onStart(players)}>
          Start game
        </button>
      </div>
    </div>
  )
}

const CenterArea = ({
  activeCard,
  chipsOnCard,
  deckCount,
  deckBack,
}: {
  activeCard: number | null
  chipsOnCard: number
  deckCount: number
  deckBack: string
}) => (
  <div className="center-area">
    <div className="deck-stack">
      {[2, 1, 0].map((i) => (
        <div key={i} className="deck-card" style={{ transform: `translate(${i * 6}px, ${i * -6}px)` }}>
          <div className="deck-back" style={{ backgroundImage: `url(${deckBack})` }} />
        </div>
      ))}
      <div className="deck-count">{deckCount}</div>
    </div>
    <div className="active-card-spot">
      {activeCard ? (
        <img src={cardSrc(activeCard)} alt={`Card ${activeCard}`} />
      ) : (
        <div className="placeholder-card">No card</div>
      )}
      {chipsOnCard > 0 && (
        <div className="chips-on-card">
          <ChipCluster count={chipsOnCard} />
        </div>
      )}
    </div>
  </div>
)

const PlayerSpot = ({
  player,
  left,
  top,
  isActive,
  cardsPerRow = 4,
}: {
  player: SetupPlayer & { chips: number; cards: number[] }
  left: number
  top: number
  isActive: boolean
  cardsPerRow?: number
}) => {
  const sortedCards = [...player.cards].sort((a, b) => a - b)
  return (
    <div className="player-orbit" style={{ left: `${left}%`, top: `${top}%` }}>
      <div className={`player-card ${isActive ? 'active' : ''}`}>
        <div className="player-header">
          <span className="eyebrow">{player.isHuman ? 'Human' : 'Bot'}</span>
          <strong>{player.name}</strong>
        </div>
        <div className="player-fan" style={{ ['--cols' as string]: cardsPerRow }}>
          {sortedCards.map((c, i) => (
            <div
              key={c}
              className="fan-card"
              style={{ transform: `rotate(${(i - sortedCards.length / 2) * 4}deg)` }}
            >
              <img src={cardSrc(c)} alt={`Card ${c}`} />
            </div>
          ))}
          {sortedCards.length === 0 && <div className="muted">No cards</div>}
        </div>
      </div>
    </div>
  )
}

const getPlayerPositions = (count: number): { left: number; top: number }[] => {
  if (count === 3) {
    return [
      { left: 50, top: 8 }, // top
      { left: 15, top: 28 }, // left
      { left: 85, top: 28 }, // right
    ]
  }
  if (count === 4) {
    return [
      { left: 35, top: 12 },
      { left: 65, top: 12 },
      { left: 15, top: 32 },
      { left: 85, top: 32 },
    ]
  }
  if (count === 5) {
    return [
      { left: 35, top: 10 }, // top-left
      { left: 65, top: 10 }, // top-right
      { left: 15, top: 32 }, // mid-left
      { left: 85, top: 32 }, // mid-right
      { left: 50, top: 42 }, // center player (aligned with sides, slightly lower)
    ]
  }
  // default: simple circle
  return [0, 1, 2, 3, 4].slice(0, count).map((i) => {
    const angle = (-90 + (360 / count) * i) * (Math.PI / 180)
    const rx = 34
    const ry = 26
    return { left: 50 + rx * Math.cos(angle), top: 50 + ry * Math.sin(angle) }
  })
}

const RulesModal = ({ open, onClose, baseUrl }: { open: boolean; onClose: () => void; baseUrl: string }) => {
  if (!open) return null
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal rules-modal">
        <div className="modal-header">
          <h3>Rules</h3>
          <button className="ghost" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="rules-body">
          <div className="rules-text">
            <ul className="rules-list">
              <li>Deck has cards 3–35; 9 random cards are removed face-down and never shown.</li>
              <li>Each player starts with 11 chips. Goal: lowest total score wins.</li>
              <li>Your turn: either Pass (pay 1 chip onto the face-up card) or Take (take the card and all chips on it). If you have 0 chips, you must Take.</li>
              <li>After you Take, you immediately face the next card and decide again, so you can take multiple in a row.</li>
              <li>Scoring: Add card values, but consecutive runs only count the lowest card in that run. Subtract 1 point per chip you still have. Example: cards 27,28,29,30,10 with 5 chips → (27 + 10) – 5 = 32.</li>
              <li>Winner: the player with the lowest final score.</li>
            </ul>
          </div>
          <div className="rules-visuals">
            <div className="rules-card">
              <img src={`${baseUrl}no1.png`} alt="Setup" />
              <p className="muted">Setup</p>
            </div>
            <div className="rules-card">
              <img src={`${baseUrl}no2.png`} alt="Scoring" />
              <p className="muted">Scoring</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const RemovedPile = ({
  deckBack,
}: {
  deckBack: string
}) => (
  <div className="removed-pile">
    <div className="pile-stack">
      {[2, 1, 0].map((i) => (
        <div key={i} className="deck-card tiny" style={{ transform: `translate(${i * 4}px, ${i * -4}px)` }}>
          <div className="deck-back tiny" style={{ backgroundImage: `url(${deckBack})` }} />
        </div>
      ))}
    </div>
    <span className="muted">9 removed</span>
  </div>
)

const EndModal = ({
  game,
  onRematch,
  onHome,
}: {
  game: GameState
  onRematch: () => void
  onHome: () => void
}) => {
  if (game.status !== 'done' || !game.scores) return null
  const winner = game.scores[0]
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal score-modal">
        <div className="modal-header">
          <div>
            <p className="eyebrow">Game over</p>
            <h2>Winner: {winner.name}</h2>
            <p className="muted">
              Score {winner.total} (cards {winner.cardPoints} - chips {winner.chipPoints})
            </p>
          </div>
          <div className="actions">
            <button className="ghost" onClick={onHome} aria-label="Home">
              ⌂ Home
            </button>
            <button className="cta" onClick={onRematch}>
              Rematch
            </button>
          </div>
        </div>
        <div className="score-grid">
          {game.scores.map((s, idx) => (
            <div key={s.playerId} className="score-row">
              <div className="rank">{idx + 1}</div>
              <div className="score-name">
                <strong>{s.name}</strong>
                <p className="muted">
                  Cards: {s.cardPoints} — Chips: -{s.chipPoints}
                </p>
              </div>
              <div className="total">{s.total}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const ControlBar = ({
  activePlayer,
  passEnabled,
  takeEnabled,
  onPass,
  onTake,
  onShowHand,
  onRestart,
  onSetup,
}: {
  activePlayer: SetupPlayer | null
  passEnabled: boolean
  takeEnabled: boolean
  onPass: () => void
  onTake: () => void
  onShowHand: () => void
  onRestart: () => void
  onSetup: () => void
}) => (
  <div className="control-bar">
    <div>
      <p className="eyebrow">Active</p>
      <strong>{activePlayer?.name ?? 'None'}</strong>
    </div>
    <div className="actions">
      <button className="cta" disabled={!takeEnabled} onClick={onTake}>
        Take card
      </button>
      <button className="ghost" disabled={!passEnabled} onClick={onPass}>
        Pass (pay 1 chip)
      </button>
      <button className="outline" onClick={onShowHand} disabled={!activePlayer}>
        Show my cards
      </button>
    </div>
    <div className="actions">
      <button className="ghost" onClick={onRestart}>
        Restart
      </button>
      <button className="ghost" onClick={onSetup}>
        Change seats
      </button>
    </div>
  </div>
)

function App() {
  const [stage, setStage] = useState<Stage>('setup')
  const [game, setGame] = useState<GameState | null>(null)
  const [handOpenFor, setHandOpenFor] = useState<string | null>(null)
  const [lastSetups, setLastSetups] = useState<SetupPlayer[]>(defaultPlayers)
  const [rulesOpen, setRulesOpen] = useState(false)
  const [showSetup, setShowSetup] = useState(false)

  const startGame = (setups: SetupPlayer[]) => {
    setLastSetups(setups)
    setGame(createGame(setups))
    setStage('playing')
    setHandOpenFor(null)
  }

  const handlePass = () => setGame((prev) => (prev ? passCard(prev) : prev))
  const handleTake = () => setGame((prev) => (prev ? takeCard(prev) : prev))

  const activePlayer = useMemo(
    () => (game ? getActivePlayer(game) : null),
    [game?.currentPlayerIndex, game?.players, game],
  )

  useEffect(() => {
    if (!game || game.status !== 'playing') return
    const active = getActivePlayer(game)
    if (active.isHuman) return
    const choice = decideBotAction(game, active.botStyle ?? 'standard')
    const delay = 320 + Math.random() * 520
    const timer = setTimeout(() => {
      setGame((current) => {
        if (!current || current.status !== 'playing') return current
        const stillActive = getActivePlayer(current)
        if (stillActive.id !== active.id) return current
        const action = choice === 'pass' && !canPass(current) ? 'take' : choice
        return action === 'pass' ? passCard(current) : takeCard(current)
      })
    }, delay)
    return () => clearTimeout(timer)
  }, [game])

  useEffect(() => {
    if (game?.status === 'done') {
      setStage('done')
    }
  }, [game?.status])

  const reopenHand = () => {
    if (!activePlayer) return
    setHandOpenFor(activePlayer.id)
  }

  const rematch = () => {
    if (!lastSetups) return
    startGame(lastSetups)
  }

  if (stage === 'setup') {
    return (
      <div className="app-shell">
        <div className="hero">
          <div className="hero-text">
            <p className="eyebrow">Party card classic</p>
            <h1>No Thanks</h1>
            <p className="hero-subtitle">
              Pass chips, dodge disasters, and chain runs—keep your score minimum.
            </p>
            <button
              className="cta"
              onClick={() => {
                setShowSetup(true)
              }}
            >
              Play game
            </button>
          </div>
        </div>
        {showSetup && (
          <div className="modal-backdrop" role="dialog" aria-modal="true">
            <div className="modal setup-modal">
              <div className="modal-header">
                <h3>Quick table setup</h3>
                <button className="ghost" onClick={() => setShowSetup(false)}>Close</button>
              </div>
              <SetupScreen onStart={startGame} />
            </div>
          </div>
        )}
      </div>
    )
  }

  if (!game) return null

  const isActiveHuman = !!activePlayer?.isHuman && game.status === 'playing'
  const passEnabled = isActiveHuman && canPass(game)
  const takeEnabled = isActiveHuman && canTake(game)
  const positions = getPlayerPositions(game.players.length)

  return (
    <div className="app-shell">
      <div className="table-board">
        <button className="home-btn" onClick={() => setStage('setup')} aria-label="Home">
          ⌂ Home
        </button>
        <button className="rules-btn" onClick={() => setRulesOpen(true)} aria-label="Rules">
          Rules
        </button>
        <RemovedPile deckBack={`${baseUrl}back.png`} />
        <CenterArea
          activeCard={game.activeCard}
          chipsOnCard={game.chipsOnCard}
          deckCount={game.deck.length}
          deckBack={`${baseUrl}back.png`}
        />
        {game.players.map((p, idx) => {
          const pos = positions[idx] ?? { left: 50, top: 50 }
          let cardsPerRow = 4
          if (game.players.length === 5 && idx === 4) cardsPerRow = 5
          return (
            <PlayerSpot
              key={p.id}
              player={p}
              left={pos.left}
              top={pos.top}
              isActive={idx === game.currentPlayerIndex && game.status === 'playing'}
              cardsPerRow={cardsPerRow}
            />
          )
        })}
      </div>

      <ControlBar
        activePlayer={activePlayer}
        passEnabled={passEnabled}
        takeEnabled={takeEnabled}
        onPass={handlePass}
        onTake={handleTake}
        onShowHand={reopenHand}
        onRestart={rematch}
        onSetup={() => setStage('setup')}
      />

      {game.status === 'playing' && isActiveHuman && activePlayer && activePlayer.chips === 0 && (
        <p className="muted warning">No chips left: you must take.</p>
      )}

      <Scoreboard state={game} onRematch={rematch} onNewGame={() => setStage('setup')} />
      <EndModal game={game} onRematch={rematch} onHome={() => setStage('setup')} />
      <RulesModal open={rulesOpen} onClose={() => setRulesOpen(false)} baseUrl={baseUrl} />

      {activePlayer && (
        <HandModal
          open={handOpenFor === activePlayer.id}
          onClose={() => setHandOpenFor(null)}
          playerName={activePlayer.name}
          chips={activePlayer.chips}
          cards={[...activePlayer.cards].sort((a, b) => a - b)}
        />
      )}
    </div>
  )
}

export default App
