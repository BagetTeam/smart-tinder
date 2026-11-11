/** Small deterministic PRNG utilities so that mock data and daily puzzles are reproducible. */

export type Rng = () => number

export function hashString(str: string): number {
  let h = 1779033703 ^ str.length
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507)
  h = Math.imul(h ^ (h >>> 13), 3266489909)
  return (h ^= h >>> 16) >>> 0
}

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const seeded = (key: string): Rng => mulberry32(hashString(key))

export const randInt = (rng: Rng, min: number, max: number) => min + Math.floor(rng() * (max - min + 1))

export const pick = <T,>(rng: Rng, arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)]

export function shuffle<T>(rng: Rng, arr: T[]): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function sample<T>(rng: Rng, arr: readonly T[], n: number): T[] {
  return shuffle(rng, arr.slice()).slice(0, n)
}

/** Standard normal via Box–Muller. */
export function gaussian(rng: Rng): number {
  let u = 0
  while (u === 0) u = rng()
  const v = rng()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

export const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x))

/** Local-date key, e.g. 2026-11-11 — the "daily" boundary. */
export function todayKey(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
