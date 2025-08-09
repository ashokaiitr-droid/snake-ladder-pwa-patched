
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Dice1, Dice2, Dice3, Dice4, Dice5, Dice6, RotateCw, UserPlus, Swords } from 'lucide-react'

type Player = { id: number; name: string; color: string; isCPU?: boolean }

const BOARD_SIZE = 100
const BOARD_DIM = 10

const LADDERS: Record<number, number> = { 2:38, 7:14, 8:31, 15:26, 21:42, 28:84, 36:44, 51:67, 71:91, 78:98 }
const SNAKES: Record<number, number>  = { 16:6, 46:25, 49:11, 62:19, 64:60, 74:53, 89:68, 92:88, 95:75, 99:80 }

const DICE_ICONS = [Dice1, Dice2, Dice3, Dice4, Dice5, Dice6]

function cellToRowCol(cell: number) {
  const index = cell - 1
  const rowFromBottom = Math.floor(index / BOARD_DIM)
  const row = BOARD_DIM - 1 - rowFromBottom
  const isEvenRowFromBottom = rowFromBottom % 2 === 0
  let col = index % BOARD_DIM
  if (!isEvenRowFromBottom) col = BOARD_DIM - 1 - col
  return { row, col }
}
function cellToPercent(cell: number) {
  const { row, col } = cellToRowCol(cell)
  const step = 100 / BOARD_DIM
  return { top: row * step, left: col * step }
}
function randomInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min }
function randomNiceColor() {
  const palette = ['#0ea5e9','#22c55e','#eab308','#f97316','#ef4444','#8b5cf6','#06b6d4','#10b981']
  return palette[Math.floor(Math.random()*palette.length)]
}

export default function App() {
  const [players, setPlayers] = useState<Player[]>([
    { id: 1, name: 'Player 1', color: '#2563eb' },
    { id: 2, name: 'Player 2', color: '#16a34a', isCPU: true },
  ])
  const [positions, setPositions] = useState<number[]>(players.map(() => 0))
  const [current, setCurrent] = useState(0)
  const [dice, setDice] = useState<number | null>(null)
  const [isRolling, setIsRolling] = useState(false)
  const [log, setLog] = useState<string[]>([])
  const [winner, setWinner] = useState<number | null>(null)
  const rollingRef = useRef<number | null>(null)

  useEffect(() => {
    setPositions(prev => {
      if (prev.length === players.length) return prev
      const next = Array.from({ length: players.length }, (_, i) => prev[i] ?? 0)
      return next
    })
  }, [players.length])

  const boardCells = useMemo(() => Array.from({ length: BOARD_SIZE }, (_, i) => i + 1), [])
  const canRoll = !isRolling && winner === null
  const currentDiceIcon = dice ? DICE_ICONS[dice - 1] : Dice1

  function addLog(entry: string) { setLog(l => [entry, ...l].slice(0,40)) }
  function nextTurn() { setCurrent(c => (c + 1) % players.length) }

  function moveBySteps(pi: number, steps: number, onDone?: (finalPos:number)=>void) {
    const target = Math.min(positions[pi] + steps, BOARD_SIZE)
    let pos = positions[pi]
    const tick = () => {
      pos += 1
      setPositions(prev => { const copy = [...prev]; copy[pi] = pos; return copy })
      if (pos < target) window.setTimeout(tick, 200)
      else onDone?.(pos)
    }
    if (steps > 0) tick(); else onDone?.(pos)
  }

  function applySnakesLadders(startPos:number) {
    if (LADDERS[startPos]) return { to: LADDERS[startPos], kind: 'ladder' as const }
    if (SNAKES[startPos]) return { to: SNAKES[startPos], kind: 'snake' as const }
    return null
  }

  function rollDice() {
    if (!canRoll) return
    setIsRolling(true)
    let ticks = 12 + randomInt(0,6)
    if (rollingRef.current) window.clearInterval(rollingRef.current)
    rollingRef.current = window.setInterval(() => {
      setDice(d => (d ? ((d % 6) + 1) : 1))
      ticks -= 1
      if (ticks <= 0) {
        if (rollingRef.current) window.clearInterval(rollingRef.current)
        const final = randomInt(1,6)
        setDice(final)
        window.setTimeout(() => resolveMove(final), 300)
      }
    }, 70)
  }

  function resolveMove(roll:number) {
    const pi = current
    const p = players[pi]
    const start = positions[pi]
    if (start >= BOARD_SIZE) return
    const desired = start + roll
    if (desired > BOARD_SIZE) {
      addLog(`${p.name} rolled ${roll} but needs an exact roll to finish.`)
      setIsRolling(false)
      window.setTimeout(() => nextTurn(), 300)
      return
    }
    moveBySteps(pi, roll, (landed) => {
      const special = applySnakesLadders(landed)
      if (special) {
        const { to, kind } = special
        addLog(`${p.name} hit a ${kind === 'ladder' ? 'ladder ↑' : 'snake ↓'} from ${landed} to ${to}.`)
        window.setTimeout(() => {
          setPositions(prev => { const copy = [...prev]; copy[pi] = to; return copy })
          finalizeTurn(pi, to)
        }, 350)
      } else {
        finalizeTurn(pi, landed)
      }
    })
  }

  function finalizeTurn(pi:number, pos:number) {
    const p = players[pi]
    if (pos === BOARD_SIZE) {
      setWinner(pi)
      addLog(`${p.name} wins! ✨`)
      setIsRolling(false)
      return
    }
    setIsRolling(false)
    window.setTimeout(() => nextTurn(), 300)
  }

  function resetGame() {
    setPositions(players.map(() => 0))
    setCurrent(0)
    setDice(null)
    setLog([])
    setWinner(null)
  }

  useEffect(() => {
    if (winner !== null) return
    const p = players[current]
    if (p?.isCPU && !isRolling) {
      const t = window.setTimeout(() => rollDice(), 850)
      return () => window.clearTimeout(t)
    }
  }, [current, players, isRolling, winner])

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-6xl grid gap-6 md:grid-cols-[1fr_360px]">
        {/* Board */}
        <div className="rounded-2xl shadow-xl bg-white border border-slate-200">
          <div className="flex items-center justify-between p-4 border-b">
            <h1 className="text-2xl md:text-3xl font-semibold">Snake & Ladder</h1>
            <div className="text-sm text-slate-500">First to 100 wins</div>
          </div>
          <div className="p-4">
            <div className="relative aspect-square w-full rounded-xl bg-white overflow-hidden border border-slate-200">
              <div
                className="absolute inset-0 grid"
                style={{ gridTemplateColumns: `repeat(${BOARD_DIM}, 1fr)`, gridTemplateRows: `repeat(${BOARD_DIM}, 1fr)` }}
              >
                {boardCells.map((cell) => (
                  <div
                    key={cell}
                    className="relative flex items-start justify-end p-1 text-[10px] md:text-xs border border-slate-200/60"
                    style={{ background: (Math.floor((cell - 1) / 10) + (cell - 1)) % 2 ? '#f8fafc' : '#fff' }}
                  >
                    <span className="opacity-60 select-none">{cell}</span>
                    {LADDERS[cell] && (
                      <span className="absolute bottom-1 left-1 text-[9px] md:text-[10px] rounded px-1 bg-emerald-100 text-emerald-700">L→{LADDERS[cell]}</span>
                    )}
                    {SNAKES[cell] && (
                      <span className="absolute bottom-1 left-1 text-[9px] md:text-[10px] rounded px-1 bg-rose-100 text-rose-700">S→{SNAKES[cell]}</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Player tokens */}
              {players.map((pl, i) => {
                const cell = positions[i]
                if (cell === 0) return (
                  <motion.div key={pl.id} className="absolute -bottom-5 left-1/2 -translate-x-1/2"
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                    <Token player={pl} label="Start" />
                  </motion.div>
                )
                const { top, left } = cellToPercent(cell)
                const offset = (i - (players.length - 1) / 2) * 18
                return (
                  <motion.div
                    key={pl.id}
                    className="absolute"
                    animate={{ top: `calc(${top}% + 4px)`, left: `calc(${left}% + 4px)` }}
                    transition={{ type: 'spring', stiffness: 120, damping: 16 }}
                  >
                    <div style={{ transform: `translate(${offset}px, ${offset * -0.2}px)` }}>
                      <Token player={pl} />
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="rounded-2xl shadow-lg bg-white border">
            <div className="p-4 border-b">
              <div className="flex items-center gap-2 font-semibold"><Swords className="h-5 w-5"/> Controls</div>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <button onClick={() => canRoll && rollDice()} disabled={!canRoll} className="flex-1 h-11 text-base rounded-xl bg-slate-900 text-white disabled:opacity-40 flex items-center justify-center gap-2">
                  <span>Roll</span>
                  {React.createElement(currentDiceIcon, { className: 'h-5 w-5' })}
                </button>
                <button onClick={resetGame} className="h-11 px-3 rounded-xl border bg-white" title="Reset">
                  <RotateCw className="h-5 w-5" />
                </button>
              </div>

              <div className="rounded-xl border p-3 space-y-3">
                <div className="text-sm font-medium text-slate-600">Players</div>
                <div className="space-y-2">
                  {players.map((p, i) => (
                    <div key={p.id} className={`flex items-center justify-between gap-2 rounded-lg p-2 ${i===current ? 'bg-slate-100':'bg-white'}`}>
                      <div className="flex items-center gap-2">
                        <span className="inline-block h-3.5 w-3.5 rounded-full" style={{ background: p.color }} />
                        <input
                          className="bg-transparent outline-none rounded px-1 text-sm border-b border-dashed border-transparent focus:border-slate-300"
                          value={p.name}
                          onChange={(e) => {
                            const name = e.target.value
                            setPlayers(prev => prev.map(pl => pl.id===p.id ? { ...pl, name } : pl))
                          }}
                        />
                      </div>
                      <label className="text-xs flex items-center gap-1 select-none">
                        <input
                          type="checkbox"
                          className="accent-slate-700"
                          checked={!!p.isCPU}
                          onChange={(e) => setPlayers(prev => prev.map(pl => pl.id===p.id ? { ...pl, isCPU: e.target.checked } : pl))}
                        />
                        CPU
                      </label>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="flex-1 rounded-xl border bg-white h-10 flex items-center justify-center gap-2"
                    onClick={() => setPlayers(prev => prev.length>=4 ? prev : [...prev, { id: Date.now(), name: `Player ${prev.length+1}`, color: randomNiceColor(), isCPU: prev.length>=2 }])}
                  >
                    <UserPlus className="h-4 w-4" /> Add Player
                  </button>
                  {players.length > 2 && (
                    <button className="flex-1 rounded-xl border bg-white h-10" onClick={() => setPlayers(prev => prev.slice(0,-1))}>Remove</button>
                  )}
                </div>
              </div>

              <div className="rounded-xl border p-3">
                <div className="text-sm font-medium text-slate-600 mb-1">Turn</div>
                <div className="flex items-center gap-2 flex-wrap">
                  {players.map((p, i) => (
                    <span key={p.id} className={`px-2 py-1 rounded-full text-xs border ${i===current ? 'bg-black text-white' : 'bg-white'}`}>{p.name}</span>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border p-0 overflow-hidden">
                <div className="px-3 py-2 text-sm font-medium text-slate-600 bg-slate-50">Activity</div>
                <div className="max-h-60 overflow-auto text-sm divide-y">
                  <AnimatePresence initial={false}>
                    {winner !== null && (
                      <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="px-3 py-2 bg-yellow-50">
                        {players[winner].name} has reached 100! Game over.
                      </motion.div>
                    )}
                    {log.map((entry, i) => (
                      <motion.div key={i} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="px-3 py-2">
                        {entry}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

function Token({ player, label }: { player: Player; label?: string }) {
  return (
    <div className="flex items-center gap-2">
      <motion.div
        className="h-5 w-5 md:h-6 md:w-6 rounded-full ring-2 ring-black/10 shadow-md"
        style={{ background: player.color }}
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 240, damping: 12 }}
      />
      {label && <span className="text-[10px] md:text-xs text-slate-500">{label}</span>}
    </div>
  )
}
