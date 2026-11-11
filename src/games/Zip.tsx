import { useMemo, useRef, useState } from 'react'
import { generateZip, wallKey } from './generators'
import type { GameProps } from './types'

export default function Zip({ seed, onSolved }: GameProps) {
  const puzzle = useMemo(() => generateZip(seed), [seed])
  const { n, numbers } = puzzle
  const walls = useMemo(() => new Set(puzzle.walls), [puzzle])
  const maxNum = Math.max(...Object.values(numbers))
  const startCell = +Object.keys(numbers).find((k) => numbers[+k] === 1)!
  const [path, setPath] = useState<number[]>([])
  const pathRef = useRef(path)
  const dragging = useRef(false)
  const done = useRef(false)

  const adjacent = (a: number, b: number) => {
    const [ra, ca, rb, cb] = [Math.floor(a / n), a % n, Math.floor(b / n), b % n]
    return Math.abs(ra - rb) + Math.abs(ca - cb) === 1 && !walls.has(wallKey(a, b))
  }

  const update = (next: number[]) => {
    pathRef.current = next
    setPath(next)
    if (!done.current && next.length === n * n && numbers[next[next.length - 1]] === maxNum) {
      done.current = true
      setTimeout(onSolved, 500)
    }
  }

  /** Try to move the head of the path onto `cell`. Returns the new path (or the same one if illegal). */
  const step = (p: number[], cell: number): number[] => {
    if (!p.length) return cell === startCell ? [cell] : p
    const end = p[p.length - 1]
    if (cell === end) return p
    const idx = p.indexOf(cell)
    if (idx >= 0) return p.slice(0, idx + 1) // backtrack
    if (!adjacent(end, cell)) return p
    if (numbers[end] === maxNum) return p
    if (numbers[cell] !== undefined) {
      const visited = p.filter((c) => numbers[c] !== undefined).length
      if (numbers[cell] !== visited + 1) return p
    }
    return [...p, cell]
  }

  /** Walk toward a cell in a straight line so fast drags don't skip cells. */
  const reach = (target: number) => {
    let p = pathRef.current
    for (let guard = 0; guard < n * 2; guard++) {
      const end = p[p.length - 1]
      if (end === undefined || end === target || p.includes(target)) {
        p = step(p, target)
        break
      }
      const [re, ce, rt, ct] = [Math.floor(end / n), end % n, Math.floor(target / n), target % n]
      if (re !== rt && ce !== ct) {
        p = step(p, target)
        break
      }
      const next = re === rt ? end + Math.sign(ct - ce) : end + n * Math.sign(rt - re)
      const q = step(p, next)
      if (q === p) break
      p = q
    }
    if (p !== pathRef.current) update(p)
  }

  const cellAt = (x: number, y: number) => {
    const el = document.elementFromPoint(x, y) as HTMLElement | null
    const v = el?.closest('[data-cell]')?.getAttribute('data-cell')
    return v == null ? null : +v
  }

  const onDown = (e: React.PointerEvent) => {
    ;(e.target as HTMLElement).releasePointerCapture?.(e.pointerId)
    const i = cellAt(e.clientX, e.clientY)
    if (i == null) return
    dragging.current = true
    if (!pathRef.current.length) {
      if (i === startCell) update([i])
    } else reach(i)
  }
  const onMove = (e: React.PointerEvent) => {
    if (!dragging.current) return
    const i = cellAt(e.clientX, e.clientY)
    if (i != null) reach(i)
  }

  const center = (c: number) => [(c % n) + 0.5, Math.floor(c / n) + 0.5]
  const inPath = new Set(path)
  const complete = path.length === n * n

  return (
    <div className="flex flex-col items-center">
      <div
        className="relative w-full max-w-[380px] touch-none select-none-all"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={() => (dragging.current = false)}
        onPointerLeave={() => (dragging.current = false)}
      >
        <div className="grid overflow-hidden rounded-2xl bg-white ring-2 ring-ink-950" style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }}>
          {Array.from({ length: n * n }, (_, i) => (
            <div
              key={i}
              data-cell={i}
              className={`aspect-square border-[0.5px] border-zinc-200 transition-colors ${inPath.has(i) ? (complete ? 'bg-emerald-200' : 'bg-orange-100') : 'bg-white'}`}
            />
          ))}
        </div>
        <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 ${n} ${n}`}>
          {path.length > 1 && (
            <polyline
              points={path.map((c) => center(c).join(',')).join(' ')}
              fill="none"
              stroke={complete ? '#10b981' : '#f97316'}
              strokeWidth={0.42}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          {puzzle.walls.map((w) => {
            const [a, b] = w.split('-').map(Number)
            const [ra, ca] = [Math.floor(a / n), a % n]
            const horizontalNeighbour = b === a + 1
            return horizontalNeighbour ? (
              <line key={w} x1={ca + 1} x2={ca + 1} y1={ra} y2={ra + 1} stroke="#0d0d16" strokeWidth={0.12} strokeLinecap="round" />
            ) : (
              <line key={w} x1={ca} x2={ca + 1} y1={ra + 1} y2={ra + 1} stroke="#0d0d16" strokeWidth={0.12} strokeLinecap="round" />
            )
          })}
          {Object.entries(numbers).map(([cell, k]) => {
            const [x, y] = center(+cell)
            return (
              <g key={cell}>
                <circle cx={x} cy={y} r={0.32} fill="#0d0d16" />
                <text x={x} y={y} dy="0.12" textAnchor="middle" fontSize="0.34" fontWeight="800" fill="#fff" fontFamily="Inter, sans-serif">
                  {k}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button onClick={() => update(path.slice(0, -1))} disabled={!path.length} className="rounded-full bg-white/5 px-4 py-2 text-sm font-semibold ring-1 ring-white/10 disabled:opacity-30">
          Undo
        </button>
        <button onClick={() => update([])} className="rounded-full bg-white/5 px-4 py-2 text-sm font-semibold ring-1 ring-white/10">
          Clear
        </button>
        <span className="text-sm text-white/45 tabular-nums">
          {path.length}/{n * n}
        </span>
      </div>
      <p className="mt-3 max-w-xs text-center text-xs text-white/45">
        Start at 1 and drag through the numbers in order. Fill every cell exactly once and finish on {maxNum}. Thick bars are walls.
      </p>
    </div>
  )
}
