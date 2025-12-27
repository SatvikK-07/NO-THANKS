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

const cardSrc = (value: number) => `/cards/${value}.png`

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
    <div className="panel setup-panel">
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
          Start playing
        </button>
      </div>
    </div>
  )
}

const CenterArea = ({
  activeCard,
  chipsOnCard,
  deckCount,
}: {
  activeCard: number | null
  chipsOnCard: number
  deckCount: number
}) => (
  <div className="center-area">
    <div className="deck-stack">
      {[2, 1, 0].map((i) => (
        <div key={i} className="deck-card" style={{ transform: `translate(${i * 6}px, ${i * -6}px)` }}>
          <div className="deck-back" />
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

const PlayerOrbit = ({
  player,
  index,
  total,
  isActive,
}: {
  player: SetupPlayer & { chips: number; cards: number[] }
  index: number
  total: number
  isActive: boolean
}) => {
  const angleDeg = -90 + (360 / total) * index
  const angleRad = (angleDeg * Math.PI) / 180
  const radiusX = total >= 5 ? 34 : 36
  const radiusY = total >= 5 ? 24 : 26
  const left = 50 + radiusX * Math.cos(angleRad)
  const top = 50 + radiusY * Math.sin(angleRad)
  const sortedCards = [...player.cards].sort((a, b) => a - b)

  return (
    <div className="player-orbit" style={{ left: `${left}%`, top: `${top}%` }}>
      <div className="player-rot" style={{ transform: `translate(-50%, -50%) rotate(${angleDeg}deg)` }}>
        <div className={`player-card ${isActive ? 'active' : ''}`} style={{ transform: `rotate(${-angleDeg}deg)` }}>
          <div className="player-header">
            <span className="eyebrow">{player.isHuman ? 'Human' : 'Bot'}</span>
            <strong>{player.name}</strong>
          </div>
          <div className="player-fan">
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
    </div>
  )
}

const RemovedPile = ({ animating, runKey }: { animating: boolean; runKey: number }) => (
  <>
    <div className="removed-pile">
      <div className="pile-stack">
        {[2, 1, 0].map((i) => (
          <div key={i} className="deck-card tiny" style={{ transform: `translate(${i * 4}px, ${i * -4}px)` }}>
            <div className="deck-back tiny" />
          </div>
        ))}
      </div>
      <span className="muted">9 removed</span>
    </div>
    {animating && (
      <div className="removal-layer" key={runKey}>
        {Array.from({ length: 9 }).map((_, i) => (
          <div className="removal-card" style={{ animationDelay: `${i * 0.08}s` }} key={i}>
            <div className="deck-back" />
          </div>
        ))}
      </div>
    )}
  </>
)

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
  const [removalActive, setRemovalActive] = useState(false)
  const [removalRunKey, setRemovalRunKey] = useState(0)

  const startGame = (setups: SetupPlayer[]) => {
    setLastSetups(setups)
    setGame(createGame(setups))
    setStage('playing')
    setHandOpenFor(null)
    setRemovalActive(false)
    setRemovalRunKey(0)
  }

  const handlePass = () => setGame((prev) => (prev ? passCard(prev) : prev))
  const handleTake = () => setGame((prev) => (prev ? takeCard(prev) : prev))

  const activePlayer = useMemo(
    () => (game ? getActivePlayer(game) : null),
    [game?.currentPlayerIndex, game?.players, game],
  )

  useEffect(() => {
    if (!game || game.status !== 'playing') return
    setRemovalRunKey(Date.now())
    setRemovalActive(true)
    const stop = setTimeout(() => setRemovalActive(false), 9 * 110 + 500)
    return () => clearTimeout(stop)
  }, [game?.removed])

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
        <SetupScreen onStart={startGame} />
      </div>
    )
  }

  if (!game) return null

  const isActiveHuman = !!activePlayer?.isHuman && game.status === 'playing'
  const passEnabled = isActiveHuman && canPass(game)
  const takeEnabled = isActiveHuman && canTake(game)

  return (
    <div className="app-shell">
      <div className="table-board">
        <div className="table-ring" />
        <RemovedPile animating={removalActive} runKey={removalRunKey} />
        <CenterArea
          activeCard={game.activeCard}
          chipsOnCard={game.chipsOnCard}
          deckCount={game.deck.length}
        />
        {game.players.map((p, idx) => (
          <PlayerOrbit
            key={p.id}
            player={p}
            index={idx}
            total={game.players.length}
            isActive={idx === game.currentPlayerIndex && game.status === 'playing'}
          />
        ))}
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
