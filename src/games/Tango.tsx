import { useMemo, useState } from 'react'
import { generateTango, tangoViolations, type TangoCell } from './generators'
import type { GameProps } from './types'

function Sun({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <circle cx="12" cy="12" r="7.5" fill="#fbbf24" stroke="#d97706" strokeWidth="1.5" />
    </svg>
  )
}
function Moon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path d="M15.5 3.5a8.5 8.5 0 1 0 5 13.6A7 7 0 0 1 15.5 3.5z" fill="#60a5fa" stroke="#2563eb" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

export default function Tango({ seed, onSolved }: GameProps) {
  const puzzle = useMemo(() => generateTango(seed), [seed])
  const { n, givens, constraints } = puzzle
  const [grid, setGrid] = useState<TangoCell[]>(() => Array.from({ length: n * n }, (_, i) => givens[i] ?? null))
  const [history, setHistory] = useState<TangoCell[][]>([])
  const [done, setDone] = useState(false)
  const bad = useMemo(() => tangoViolations(n, grid, constraints), [grid, n, constraints])

  const tap = (i: number) => {
    if (givens[i] !== undefined || done) return
    const next = grid.slice()
    next[i] = next[i] === null ? 0 : next[i] === 0 ? 1 : null
    setHistory((h) => [...h.slice(-50), grid])
    setGrid(next)
    if (next.every((c) => c !== null) && tangoViolations(n, next, constraints).size === 0) {
      setDone(true)
      setTimeout(onSolved, 500)
    }
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-full max-w-[380px] select-none-all">
        <div className="grid overflow-hidden rounded-2xl bg-zinc-100 ring-2 ring-ink-950" style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}>
          {grid.map((v, i) => {
            const given = givens[i] !== undefined
            return (
              <button
                key={i}
                onClick={() => tap(i)}
                className={`relative flex aspect-square items-center justify-center border-[0.5px] border-zinc-300 transition ${given ? 'bg-zinc-200' : 'bg-white hover:bg-zinc-50'}`}
              >
                {bad.has(i) && <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,rgba(220,38,38,.22)_0_4px,transparent_4px_8px)]" />}
                {v === 0 && <Sun className={`h-3/5 w-3/5 ${given ? '' : 'animate-pop'}`} />}
                {v === 1 && <Moon className={`h-3/5 w-3/5 ${given ? '' : 'animate-pop'}`} />}
              </button>
            )
          })}
        </div>
        {constraints.map(({ a, b, kind }) => {
          const horiz = b === a + 1
          const r = Math.floor(a / n)
          const c = a % n
          const left = horiz ? ((c + 1) / n) * 100 : ((c + 0.5) / n) * 100
          const top = horiz ? ((r + 0.5) / n) * 100 : ((r + 1) / n) * 100
          return (
            <div
              key={`${a}-${b}`}
              className="pointer-events-none absolute flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[13px] leading-none font-black text-zinc-700 ring-1 ring-zinc-300"
              style={{ left: `${left}%`, top: `${top}%` }}
            >
              {kind === '=' ? '=' : '×'}
            </div>
          )
        })}
      </div>
      <div className="mt-4 flex gap-2">
        <button
          onClick={() => history.length && (setGrid(history[history.length - 1]), setHistory((h) => h.slice(0, -1)))}
          disabled={!history.length || done}
          className="rounded-full bg-white/5 px-4 py-2 text-sm font-semibold ring-1 ring-white/10 disabled:opacity-30"
        >
          Undo
        </button>
        <button
          onClick={() => !done && (setHistory((h) => [...h, grid]), setGrid(Array.from({ length: n * n }, (_, i) => givens[i] ?? null)))}
          className="rounded-full bg-white/5 px-4 py-2 text-sm font-semibold ring-1 ring-white/10"
        >
          Clear
        </button>
      </div>
      <p className="mt-3 max-w-xs text-center text-xs text-white/45">
        Tap to cycle sun → moon → empty. Each row and column has {n / 2} of each, no more than 2 alike in a row. <b>=</b> means same, <b>×</b> means opposite.
      </p>
    </div>
  )
}
