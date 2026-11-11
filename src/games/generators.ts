/**
 * Puzzle generators. All are deterministic for a given seed key so everyone gets the same daily puzzle.
 */
import { randInt, seeded, shuffle, type Rng } from '../lib/rng'

/* ============================================================================ Crowns (Queens) */

export interface QueensPuzzle {
  n: number
  /** regions[r][c] = region index */
  regions: number[][]
  /** solution[row] = column */
  solution: number[]
}

function randomNonAdjacentPermutation(rng: Rng, n: number): number[] {
  const cols: number[] = []
  const used = new Set<number>()
  const go = (r: number): boolean => {
    if (r === n) return true
    for (const c of shuffle(rng, [...Array(n).keys()])) {
      if (used.has(c)) continue
      if (r > 0 && Math.abs(cols[r - 1] - c) <= 1) continue
      cols.push(c)
      used.add(c)
      if (go(r + 1)) return true
      cols.pop()
      used.delete(c)
    }
    return false
  }
  go(0)
  return cols
}

const DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const

function growRegions(rng: Rng, n: number, sol: number[]): number[][] {
  const g = Array.from({ length: n }, () => Array<number>(n).fill(-1))
  sol.forEach((c, r) => (g[r][c] = r))
  // Per-region growth bias gives a natural mix of big and small regions.
  const bias = sol.map(() => 0.35 + rng() * 1.3)
  let remaining = n * n - n
  while (remaining > 0) {
    const options: { r: number; c: number; reg: number; w: number }[] = []
    let total = 0
    for (let r = 0; r < n; r++)
      for (let c = 0; c < n; c++) {
        if (g[r][c] !== -1) continue
        for (const [dr, dc] of DIRS) {
          const rr = r + dr
          const cc = c + dc
          if (rr < 0 || rr >= n || cc < 0 || cc >= n || g[rr][cc] === -1) continue
          const reg = g[rr][cc]
          options.push({ r, c, reg, w: bias[reg] })
          total += bias[reg]
        }
      }
    let x = rng() * total
    let k = 0
    while ((x -= options[k].w) > 0 && k < options.length - 1) k++
    const o = options[k]
    g[o.r][o.c] = o.reg
    remaining--
  }
  return g
}

export function countQueensSolutions(regions: number[][], cap = 2): number {
  const n = regions.length
  const colUsed = Array(n).fill(false)
  const regUsed = Array(n).fill(false)
  let count = 0
  const go = (r: number, prev: number) => {
    if (count >= cap) return
    if (r === n) {
      count++
      return
    }
    for (let c = 0; c < n; c++) {
      if (colUsed[c] || regUsed[regions[r][c]]) continue
      if (r > 0 && Math.abs(prev - c) <= 1) continue
      colUsed[c] = regUsed[regions[r][c]] = true
      go(r + 1, c)
      colUsed[c] = regUsed[regions[r][c]] = false
    }
  }
  go(0, -10)
  return count
}

export function generateQueens(key: string): QueensPuzzle {
  const rng = seeded(`queens:${key}`)
  const n = [7, 8, 8, 9][randInt(rng, 0, 3)]
  let best: QueensPuzzle | null = null
  for (let attempt = 0; attempt < 1500; attempt++) {
    const solution = randomNonAdjacentPermutation(rng, n)
    const regions = growRegions(rng, n, solution)
    best = { n, regions, solution }
    if (countQueensSolutions(regions) === 1) return best
  }
  return best!
}

/* ============================================================================ Thread (Zip) */

export interface ZipPuzzle {
  n: number
  /** The generator's Hamiltonian path (cell indices). Any valid path is accepted. */
  path: number[]
  /** cell index -> checkpoint number (1-based) */
  numbers: Record<number, number>
  /** walls between cells, as "a-b" with a < b */
  walls: string[]
}

export const wallKey = (a: number, b: number) => (a < b ? `${a}-${b}` : `${b}-${a}`)

function backbitePath(rng: Rng, n: number): number[] {
  // Start with a serpentine, then apply many random "backbite" moves (uniform-ish random Hamiltonian path).
  let path: number[] = []
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) path.push(r * n + (r % 2 ? n - 1 - c : c))
  const neighbours = (cell: number) => {
    const r = Math.floor(cell / n)
    const c = cell % n
    const out: number[] = []
    for (const [dr, dc] of DIRS) {
      const rr = r + dr
      const cc = c + dc
      if (rr >= 0 && rr < n && cc >= 0 && cc < n) out.push(rr * n + cc)
    }
    return out
  }
  const iters = n * n * 60
  for (let k = 0; k < iters; k++) {
    if (rng() < 0.5) path.reverse()
    const L = path.length
    const end = path[L - 1]
    const nb = neighbours(end)
    const target = nb[Math.floor(rng() * nb.length)]
    const i = path.indexOf(target)
    if (i === L - 2) continue
    path = [...path.slice(0, i + 1), ...path.slice(i + 1).reverse()]
  }
  return path
}

export function generateZip(key: string): ZipPuzzle {
  const rng = seeded(`zip:${key}`)
  const n = [6, 6, 7][randInt(rng, 0, 2)]
  const path = backbitePath(rng, n)
  const L = path.length
  const count = n === 6 ? randInt(rng, 7, 10) : randInt(rng, 9, 12)
  // Spread checkpoints along the path with jitter.
  const idxs = new Set<number>([0, L - 1])
  for (let k = 1; k < count - 1; k++) {
    const base = Math.round((k * (L - 1)) / (count - 1))
    idxs.add(Math.min(L - 2, Math.max(1, base + randInt(rng, -1, 1))))
  }
  const sorted = [...idxs].sort((a, b) => a - b)
  const numbers: Record<number, number> = {}
  sorted.forEach((pi, k) => (numbers[path[pi]] = k + 1))
  // A few walls between adjacent cells that are NOT consecutive on the path.
  const onPath = new Set<string>()
  for (let i = 0; i < L - 1; i++) onPath.add(wallKey(path[i], path[i + 1]))
  const candidates: string[] = []
  for (let cell = 0; cell < n * n; cell++) {
    const r = Math.floor(cell / n)
    const c = cell % n
    if (c < n - 1 && !onPath.has(wallKey(cell, cell + 1))) candidates.push(wallKey(cell, cell + 1))
    if (r < n - 1 && !onPath.has(wallKey(cell, cell + n))) candidates.push(wallKey(cell, cell + n))
  }
  const walls = shuffle(rng, candidates).slice(0, randInt(rng, 3, 6))
  return { n, path, numbers, walls }
}

/* ============================================================================ Sun & Moon (Tango) */

export type TangoCell = 0 | 1 | null // 0 = sun, 1 = moon
export interface TangoConstraint {
  a: number
  b: number
  kind: '=' | 'x'
}
export interface TangoPuzzle {
  n: number
  solution: (0 | 1)[]
  givens: Record<number, 0 | 1>
  constraints: TangoConstraint[]
}

/** Returns true if the (partial) grid violates any rule. */
export function tangoViolations(n: number, g: TangoCell[], constraints: TangoConstraint[]): Set<number> {
  const bad = new Set<number>()
  const half = n / 2
  for (let line = 0; line < n; line++) {
    for (const horiz of [true, false]) {
      const cells = [...Array(n).keys()].map((k) => (horiz ? line * n + k : k * n + line))
      for (const v of [0, 1] as const) {
        if (cells.filter((c) => g[c] === v).length > half) cells.forEach((c) => g[c] === v && bad.add(c))
      }
      for (let k = 0; k + 2 < n; k++) {
        const [a, b, c] = [cells[k], cells[k + 1], cells[k + 2]]
        if (g[a] !== null && g[a] === g[b] && g[b] === g[c]) [a, b, c].forEach((x) => bad.add(x))
      }
    }
  }
  for (const { a, b, kind } of constraints) {
    if (g[a] === null || g[b] === null) continue
    if ((kind === '=') !== (g[a] === g[b])) {
      bad.add(a)
      bad.add(b)
    }
  }
  return bad
}

function solveTango(n: number, givens: Record<number, 0 | 1>, constraints: TangoConstraint[], cap: number, rng?: Rng) {
  const g: TangoCell[] = Array(n * n).fill(null)
  for (const [k, v] of Object.entries(givens)) g[+k] = v
  const half = n / 2
  const rowCount = Array.from({ length: n }, () => [0, 0])
  const colCount = Array.from({ length: n }, () => [0, 0])
  for (let i = 0; i < n * n; i++) if (g[i] !== null) {
    rowCount[Math.floor(i / n)][g[i]!]++
    colCount[i % n][g[i]!]++
  }
  const byCell: TangoConstraint[][] = Array.from({ length: n * n }, () => [])
  for (const c of constraints) {
    byCell[c.a].push(c)
    byCell[c.b].push(c)
  }
  const ok = (i: number, v: 0 | 1) => {
    const r = Math.floor(i / n)
    const c = i % n
    if (rowCount[r][v] >= half || colCount[c][v] >= half) return false
    const at = (rr: number, cc: number) => (rr >= 0 && rr < n && cc >= 0 && cc < n ? g[rr * n + cc] : null)
    // triples in row & column, all windows containing (r, c)
    for (const [dr, dc] of [[0, 1], [1, 0]]) {
      for (let s = -2; s <= 0; s++) {
        let same = 0
        for (let k = 0; k < 3; k++) {
          const rr = r + (s + k) * dr
          const cc = c + (s + k) * dc
          if (rr === r && cc === c) same++
          else if (at(rr, cc) === v) same++
        }
        if (same === 3) return false
      }
    }
    for (const con of byCell[i]) {
      const other = con.a === i ? con.b : con.a
      if (g[other] === null) continue
      if ((con.kind === '=') !== (g[other] === v)) return false
    }
    return true
  }
  let count = 0
  let first: (0 | 1)[] | null = null
  const go = (i: number) => {
    if (count >= cap) return
    while (i < n * n && g[i] !== null) i++
    if (i === n * n) {
      count++
      if (!first) first = g.slice() as (0 | 1)[]
      return
    }
    const order: (0 | 1)[] = rng && rng() < 0.5 ? [1, 0] : [0, 1]
    for (const v of order) {
      if (!ok(i, v)) continue
      g[i] = v
      rowCount[Math.floor(i / n)][v]++
      colCount[i % n][v]++
      go(i + 1)
      g[i] = null
      rowCount[Math.floor(i / n)][v]--
      colCount[i % n][v]--
    }
  }
  go(0)
  return { count, first: first as (0 | 1)[] | null }
}

export function generateTango(key: string): TangoPuzzle {
  const rng = seeded(`tango:${key}`)
  const n = 6
  const solution = solveTango(n, {}, [], 1, rng).first!
  // Random edge constraints taken from the solution.
  const edges: TangoConstraint[] = []
  for (let i = 0; i < n * n; i++) {
    const r = Math.floor(i / n)
    const c = i % n
    if (c < n - 1) edges.push({ a: i, b: i + 1, kind: solution[i] === solution[i + 1] ? '=' : 'x' })
    if (r < n - 1) edges.push({ a: i, b: i + n, kind: solution[i] === solution[i + n] ? '=' : 'x' })
  }
  const constraints = shuffle(rng, edges).slice(0, randInt(rng, 6, 9))
  // Remove givens greedily while the solution stays unique.
  const givens: Record<number, 0 | 1> = Object.fromEntries(solution.map((v, i) => [i, v]))
  for (const cell of shuffle(rng, [...Array(n * n).keys()])) {
    const v = givens[cell]
    delete givens[cell]
    if (solveTango(n, givens, constraints, 2).count !== 1) givens[cell] = v
  }
  return { n, solution, givens, constraints }
}

/* ============================================================================ Quick Maths */

export interface MathQuestion {
  text: string
  answer: number
}

export function generateMath(key: string, count = 250): MathQuestion[] {
  const rng = seeded(`mental:${key}`)
  const out: MathQuestion[] = []
  for (let i = 0; i < count; i++) {
    const kind = randInt(rng, 0, 3)
    if (kind === 0) {
      const a = randInt(rng, 2, 100)
      const b = randInt(rng, 2, 100)
      out.push({ text: `${a} + ${b}`, answer: a + b })
    } else if (kind === 1) {
      const a = randInt(rng, 2, 100)
      const b = randInt(rng, 2, 100)
      out.push({ text: `${a + b} − ${a}`, answer: b })
    } else if (kind === 2) {
      const a = randInt(rng, 2, 12)
      const b = randInt(rng, 2, 100)
      out.push({ text: `${a} × ${b}`, answer: a * b })
    } else {
      const a = randInt(rng, 2, 12)
      const b = randInt(rng, 2, 100)
      out.push({ text: `${a * b} ÷ ${a}`, answer: b })
    }
  }
  return out
}
