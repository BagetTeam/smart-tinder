/**
 * The "behind the scenes" engine:
 *  - Looks Elo: a desirability rating updated Tinder-style. Each time someone swipes on you it counts as a
 *    game between you and the swiper. Being liked by a highly-rated person is worth more than by a low-rated one;
 *    being passed on by a low-rated person costs more than by a high-rated one. Only the person being swiped on moves.
 *  - Estimated IQ: a running estimate updated after every daily game. Your score is ranked against everyone
 *    who played that day, the percentile is converted to a "performance IQ", and your estimate moves toward it
 *    (more aggressively while you have few games on record).
 *  - Matchmaking: you only see (and are only shown to) people inside BOTH brackets.
 */
import { PROFILES } from '../data/profiles'
import { clamp, gaussian, seeded } from './rng'
import { percentileToIq, sigmoid } from './stats'
import type { Gender, GameId, Profile, ShowMe, UserProfile } from './types'

export const BRACKET = { iq: 15, looks: 225 }
export const STARTING_ELO = 1200
export const STARTING_IQ = 100

/* ----------------------------------------------------------------------------- Looks Elo */

/** Probability that a player rated `a` "beats" a player rated `b`. */
export const expectedScore = (a: number, b: number) => 1 / (1 + 10 ** ((b - a) / 400))

/** K-factor shrinks as we gather more evidence about someone (provisional ratings move fast). */
export const looksK = (impressions: number) => Math.max(12, 48 / Math.sqrt(1 + impressions / 20))

export function eloAfterSwipe(target: number, voter: number, liked: boolean, k: number) {
  return target + k * ((liked ? 1 : 0) - expectedScore(target, voter))
}

export function looksTier(elo: number) {
  if (elo >= 1550) return { label: 'Top 5%', color: 'text-amber-300' }
  if (elo >= 1400) return { label: 'Top 15%', color: 'text-fuchsia-300' }
  if (elo >= 1250) return { label: 'Above average', color: 'text-sky-300' }
  if (elo >= 1100) return { label: 'Average', color: 'text-zinc-200' }
  return { label: 'Warming up', color: 'text-zinc-400' }
}

export function iqTier(iq: number) {
  if (iq >= 140) return 'Genius'
  if (iq >= 130) return 'Gifted'
  if (iq >= 120) return 'Superior'
  if (iq >= 110) return 'Bright'
  if (iq >= 90) return 'Average'
  return 'Developing'
}

/** Hidden appeal bonus for a complete profile — the algorithm rewards effort. */
export function profileCompleteness(u: UserProfile) {
  const parts = [
    { label: 'Photo', done: !!u.photo, weight: 40 },
    { label: 'Bio (40+ chars)', done: u.bio.trim().length >= 40, weight: 20 },
    { label: '3+ interests', done: u.interests.length >= 3, weight: 15 },
    { label: 'Prompt answered', done: u.prompt.a.trim().length >= 10, weight: 15 },
    { label: 'Job or school', done: !!(u.job.trim() || u.school.trim()), weight: 10 },
  ]
  const score = parts.reduce((s, p) => s + (p.done ? p.weight : 0), 0)
  return { parts, score }
}

export function appealBonus(u: UserProfile) {
  return (profileCompleteness(u).score - 60) * 2.2 // -132 .. +88
}

/* ----------------------------------------------------------------------------- Matchmaking */

export const showMeIncludes = (showMe: ShowMe, g: Gender) =>
  showMe === 'everyone' || (showMe === 'men' && g === 'man') || (showMe === 'women' && g === 'woman')

export function inBracket(me: { iq: number; looks: number }, them: { iq: number; looks: number }) {
  return Math.abs(me.iq - them.iq) <= BRACKET.iq && Math.abs(me.looks - them.looks) <= BRACKET.looks
}

/** Probability that a mock profile swipes right on the user. */
export function mockLikeProbability(opts: {
  appeal: number
  userIq: number
  userGender: Gender
  profile: Profile
  profileLooks: number
  superLike?: boolean
}) {
  const { appeal, userIq, userGender, profile, profileLooks, superLike } = opts
  if (!profile.interestedIn.includes(userGender)) return 0
  const looksTerm = (appeal - profileLooks) / 140
  const iqTerm = (userIq - profile.iq) / 45 - Math.abs(userIq - profile.iq) / 60
  const x = 0.15 + looksTerm + iqTerm - profile.pickiness * 0.6 + (superLike ? 0.8 : 0)
  return clamp(sigmoid(x), 0.04, 0.93)
}

/* ----------------------------------------------------------------------------- Daily games */

export interface GameMeta {
  id: GameId
  name: string
  tagline: string
  lowerIsBetter: boolean
  /** Typical solve time (s) of an IQ-100 player, or typical score for mental math. */
  base: number
  unit: 'time' | 'score'
  inspiredBy: string
  timeLimit: number
}

export const GAMES: GameMeta[] = [
  { id: 'queens', name: 'Crowns', tagline: 'One crown per row, column & colour', lowerIsBetter: true, base: 105, unit: 'time', inspiredBy: 'LinkedIn Queens', timeLimit: 600 },
  { id: 'zip', name: 'Thread', tagline: 'Connect the dots, fill every cell', lowerIsBetter: true, base: 75, unit: 'time', inspiredBy: 'LinkedIn Zip', timeLimit: 600 },
  { id: 'tango', name: 'Sun & Moon', tagline: 'Balance the grid, respect the signs', lowerIsBetter: true, base: 120, unit: 'time', inspiredBy: 'LinkedIn Tango', timeLimit: 600 },
  { id: 'mental', name: 'Quick Maths', tagline: '90 seconds of trading-floor arithmetic', lowerIsBetter: false, base: 26, unit: 'score', inspiredBy: 'Optiver 80-in-8', timeLimit: 90 },
]

export const GAME_BY_ID = Object.fromEntries(GAMES.map((g) => [g.id, g])) as Record<GameId, GameMeta>

export interface PopulationEntry {
  profileId: string
  metric: number
  dnf: boolean
}

const popCache = new Map<string, PopulationEntry[]>()

/** Deterministic results for every mock user on a given day — everyone plays the same puzzle. */
export function populationResults(dateKey: string, game: GameId): PopulationEntry[] {
  const key = `${dateKey}:${game}`
  const cached = popCache.get(key)
  if (cached) return cached
  const meta = GAME_BY_ID[game]
  const dayRng = seeded(`difficulty:${key}`)
  const difficulty = 0.8 + dayRng() * 0.45 // some days are harder for everyone
  const out = PROFILES.map((p) => {
    const rng = seeded(`pop:${key}:${p.id}`)
    const skill = (p.iq - 100) / 15
    const z = gaussian(rng)
    if (meta.lowerIsBetter) {
      const t = meta.base * difficulty * Math.exp(-0.32 * skill + 0.38 * z)
      const dnf = rng() < 0.03 + Math.max(0, -skill) * 0.03
      return { profileId: p.id, metric: Math.round(clamp(t, 12, meta.timeLimit)), dnf }
    }
    const s = meta.base / difficulty + 6.5 * skill + 4.5 * z
    return { profileId: p.id, metric: Math.max(2, Math.round(s)), dnf: false }
  })
  popCache.set(key, out)
  return out
}

/** Higher is better. DNFs always rank last. */
function perfValue(game: GameId, metric: number, dnf: boolean) {
  if (dnf) return -Infinity
  return GAME_BY_ID[game].lowerIsBetter ? -metric : metric
}

/** How fast the IQ estimate moves toward today's performance. */
export const iqLearningRate = (gamesPlayed: number) => Math.max(0.06, 0.3 / Math.sqrt(1 + gamesPlayed / 2))

export function scoreGame(opts: { dateKey: string; game: GameId; metric: number; dnf: boolean; iq: number; gamesPlayed: number }) {
  const { dateKey, game, metric, dnf, iq, gamesPlayed } = opts
  const pop = populationResults(dateKey, game)
  const mine = perfValue(game, metric, dnf)
  let worse = 0
  let ties = 0
  for (const e of pop) {
    const v = perfValue(game, e.metric, e.dnf)
    if (v < mine) worse++
    else if (v === mine) ties++
  }
  const total = pop.length + 1
  const percentile = clamp((worse + 0.5 * ties + 0.5) / total, 0.002, 0.998)
  const perfIq = clamp(Math.round(percentileToIq(percentile)), 55, 160)
  const rate = iqLearningRate(gamesPlayed)
  const iqAfter = clamp(Math.round((iq + rate * (perfIq - iq)) * 10) / 10, 60, 165)
  const rank = pop.length - worse - ties + 1
  return { percentile, perfIq, iqAfter, rank, total }
}

export function formatMetric(game: GameId, metric: number, dnf = false) {
  if (dnf) return 'DNF'
  if (GAME_BY_ID[game].unit === 'score') return `${metric} pts`
  const m = Math.floor(metric / 60)
  const s = metric % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
