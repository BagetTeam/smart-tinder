import { useMemo, useRef, useState } from 'react'
import { Crown, X } from 'lucide-react'
import { generateQueens } from './generators'
import type { GameProps } from './types'

const COLORS = ['#c4b5fd', '#fda4af', '#93c5fd', '#fcd34d', '#86efac', '#fdba74', '#a5f3fc', '#f0abfc', '#d9f99d', '#cbd5e1']

/** 0 = empty, 1 = cross, 2 = crown */
type Mark = 0 | 1 | 2

export default function Queens({ seed, onSolved }: GameProps) {
  const puzzle = useMemo(() => generateQueens(seed), [seed])
  const { n, regions } = puzzle
  const [marks, setMarks] = useState<Mark[]>(() => Array(n * n).fill(0))
  const [history, setHistory] = useState<Mark[][]>([])
  const drag = useRef<{ active: boolean; moved: boolean; start: number } | null>(null)
  const done = useRef(false)
  const marksRef = useRef(marks)
  marksRef.current = marks

  const conflicts = useMemo(() => {
    const bad = new Set<number>()
    const crowns = marks.flatMap((m, i) => (m === 2 ? [i] : []))
    for (let a = 0; a < crowns.length; a++)
      for (let b = a + 1; b < crowns.length; b++) {
        const [i, j] = [crowns[a], crowns[b]]
        const [ri, ci, rj, cj] = [Math.floor(i / n), i % n, Math.floor(j / n), j % n]
        const clash = ri === rj || ci === cj || regions[ri][ci] === regions[rj][cj] || (Math.abs(ri - rj) <= 1 && Math.abs(ci - cj) <= 1)
        if (clash) bad.add(i).add(j)
      }
    return bad
  }, [marks, n, regions])

  const commit = (next: Mark[]) => {
    const prev = marksRef.current
    setHistory((h) => [...h.slice(-50), prev])
    marksRef.current = next
    setMarks(next)
    const crowns = next.filter((m) => m === 2).length
    if (!done.current && crowns === n) {
      // verify with fresh conflict check
      const idx = next.flatMap((m, i) => (m === 2 ? [i] : []))
      const rows = new Set(idx.map((i) => Math.floor(i / n)))
      const cols = new Set(idx.map((i) => i % n))
      const regs = new Set(idx.map((i) => regions[Math.floor(i / n)][i % n]))
      const adj = idx.some((i) => idx.some((j) => i !== j && Math.abs(Math.floor(i / n) - Math.floor(j / n)) <= 1 && Math.abs((i % n) - (j % n)) <= 1))
      if (rows.size === n && cols.size === n && regs.size === n && !adj) {
        done.current = true
        setTimeout(onSolved, 500)
      }
    }
  }

  const cellAt = (x: number, y: number) => {
    const el = document.elementFromPoint(x, y) as HTMLElement | null
    const v = el?.closest('[data-cell]')?.getAttribute('data-cell')
    return v == null ? null : +v
  }

  const onDown = (i: number, e: React.PointerEvent) => {
    ;(e.target as HTMLElement).releasePointerCapture?.(e.pointerId)
    drag.current = { active: true, moved: false, start: i }
  }
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d?.active) return
    const i = cellAt(e.clientX, e.clientY)
    if (i == null) return
    if (i !== d.start || d.moved) {
      // Dragging paints crosses over empty cells (like the original).
      const next = marksRef.current.slice()
      let changed = false
      for (const c of d.moved ? [i] : [d.start, i])
        if (next[c] === 0) {
          next[c] = 1
          changed = true
        }
      d.moved = true
      if (changed) commit(next)
    }
  }
  const onUp = () => {
    const d = drag.current
    drag.current = null
    if (!d || d.moved) return
    const next = marksRef.current.slice()
    next[d.start] = ((next[d.start] + 1) % 3) as Mark
    commit(next)
  }

  const border = (r: number, c: number) => {
    const reg = regions[r][c]
    const thick = '3px solid #0d0d16'
    const thin = '1px solid rgba(13,13,22,.25)'
    return {
      borderTop: r === 0 || regions[r - 1][c] !== reg ? thick : thin,
      borderLeft: c === 0 || regions[r][c - 1] !== reg ? thick : thin,
      borderRight: c === n - 1 ? thick : undefined,
      borderBottom: r === n - 1 ? thick : undefined,
    }
  }

  return (
    <div className="flex flex-col items-center">
      <div
        className="grid w-full max-w-[380px] touch-none select-none-all overflow-hidden rounded-xl"
        style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={() => (drag.current = null)}
      >
        {regions.flatMap((row, r) =>
          row.map((reg, c) => {
            const i = r * n + c
            const m = marks[i]
            const bad = conflicts.has(i)
            return (
              <div
                key={i}
                data-cell={i}
                onPointerDown={(e) => onDown(i, e)}
                className="relative flex aspect-square cursor-pointer items-center justify-center transition-[filter] hover:brightness-95"
                style={{ background: COLORS[reg % COLORS.length], ...border(r, c) }}
              >
                {bad && <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,rgba(220,38,38,.35)_0_4px,transparent_4px_8px)]" />}
                {m === 1 && <X className="h-1/3 w-1/3 text-ink-950/45" strokeWidth={3} />}
                {m === 2 && <Crown className={`animate-pop h-3/5 w-3/5 ${bad ? 'text-red-600' : 'text-ink-950'}`} fill="currentColor" />}
              </div>
            )
          }),
        )}
      </div>
      <div className="mt-4 flex gap-2">
        <button
          onClick={() => history.length && (setMarks(history[history.length - 1]), setHistory((h) => h.slice(0, -1)))}
          disabled={!history.length}
          className="rounded-full bg-white/5 px-4 py-2 text-sm font-semibold ring-1 ring-white/10 disabled:opacity-30"
        >
          Undo
        </button>
        <button onClick={() => commit(Array(n * n).fill(0))} className="rounded-full bg-white/5 px-4 py-2 text-sm font-semibold ring-1 ring-white/10">
          Clear
        </button>
      </div>
      <p className="mt-3 max-w-xs text-center text-xs text-white/45">
        Tap once for ✕, twice for a crown. Drag to cross out cells. Exactly one crown per row, column and colour — and crowns can't touch, not even diagonally.
      </p>
    </div>
  )
}
