import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { PROFILES, PROFILE_BY_ID } from './data/profiles'
import { opener, replyTo } from './lib/chat'
import {
  STARTING_ELO,
  STARTING_IQ,
  appealBonus,
  eloAfterSwipe,
  inBracket,
  looksK,
  mockLikeProbability,
  scoreGame,
  showMeIncludes,
} from './lib/engine'
import { gaussian, mulberry32, todayKey } from './lib/rng'
import type { GameId, GameResult, HistoryPoint, Match, Profile, SwipeDir, UserProfile } from './lib/types'

export type Tab = 'discover' | 'dailies' | 'matches' | 'profile'

const rng = mulberry32((Date.now() ^ (Math.random() * 1e9)) >>> 0)
const uid = () => Math.random().toString(36).slice(2, 10)

interface State {
  user: UserProfile | null
  /** Hidden "ground truth" of how mock users perceive you. Never shown directly. */
  trueAppeal: number
  looksElo: number
  looksHistory: HistoryPoint[]
  impressions: number
  likesReceived: number
  iq: number
  iqGames: number
  iqHistory: HistoryPoint[]
  profileElo: Record<string, number>
  swipes: Record<string, SwipeDir>
  /** Profiles that already swiped right on you (shown as "Likes you"). */
  likedYou: Record<string, number>
  matches: Match[]
  dailies: Record<string, Partial<Record<GameId, GameResult>>>
  /** When each daily was started ("day:game" -> ms). Persisted so a reload doesn't reset the clock. */
  gameStarts: Record<string, number>
  superLikesLeft: number
  superLikeDay: string
  lastImpressionDay: string
  xray: boolean

  tab: Tab
  openChat: string | null
  newMatch: string | null
  toast: string | null
  typing: Record<string, boolean>
}

interface Actions {
  completeOnboarding: (u: UserProfile) => void
  updateUser: (u: Partial<UserProfile>) => void
  setTab: (t: Tab) => void
  setOpenChat: (id: string | null) => void
  dismissMatch: () => void
  showToast: (msg: string | null) => void
  swipe: (id: string, dir: SwipeDir) => boolean
  rewindPasses: () => void
  simulateImpressions: (n: number) => void
  dailyTick: () => void
  sendMessage: (profileId: string, text: string) => void
  markRead: (profileId: string) => void
  startGame: (game: GameId) => number
  recordGame: (game: GameId, metric: number, dnf: boolean) => GameResult
  toggleXray: () => void
  resetAll: () => void
}

const initial: State = {
  user: null,
  trueAppeal: STARTING_ELO,
  looksElo: STARTING_ELO,
  looksHistory: [],
  impressions: 0,
  likesReceived: 0,
  iq: STARTING_IQ,
  iqGames: 0,
  iqHistory: [],
  profileElo: {},
  swipes: {},
  likedYou: {},
  matches: [],
  dailies: {},
  gameStarts: {},
  superLikesLeft: 1,
  superLikeDay: '',
  lastImpressionDay: '',
  xray: false,
  tab: 'discover',
  openChat: null,
  newMatch: null,
  toast: null,
  typing: {},
}

export const profileLooks = (s: Pick<State, 'profileElo'>, p: Profile) => s.profileElo[p.id] ?? p.looksElo

/** Everyone you could be shown to / see right now, ignoring swipe history. */
export function bracketPool(s: State): Profile[] {
  if (!s.user) return []
  const me = { iq: s.iq, looks: s.looksElo }
  return PROFILES.filter(
    (p) => showMeIncludes(s.user!.showMe, p.gender) && inBracket(me, { iq: p.iq, looks: profileLooks(s, p) }),
  )
}

/** Deck order is stable for a given day so cards don't jump around while swiping. */
export function deck(s: State): Profile[] {
  const pool = bracketPool(s).filter((p) => !s.swipes[p.id])
  const day = todayKey()
  const keyed = pool.map((p) => {
    let h = 0
    for (const c of day + p.id) h = (h * 31 + c.charCodeAt(0)) | 0
    // Profiles that already like you are surfaced a little earlier, like the real thing.
    return { p, k: (h >>> 0) / 4294967296 - (s.likedYou[p.id] ? 0.25 : 0) }
  })
  return keyed.sort((a, b) => a.k - b.k).map((x) => x.p)
}

const delay = (min: number, max: number) => min + rng() * (max - min)

export const useStore = create<State & Actions>()(
  persist(
    (set, get) => {
      /** A mock profile evaluates the user: updates the user's hidden Looks Elo and returns whether they liked. */
      const evaluateUser = (p: Profile, superLike = false) => {
        const s = get()
        if (!s.user) return false
        const theirLooks = profileLooks(s, p)
        const prob = mockLikeProbability({
          appeal: s.trueAppeal + appealBonus(s.user),
          userIq: s.iq,
          userGender: s.user.gender,
          profile: p,
          profileLooks: theirLooks,
          superLike,
        })
        if (prob === 0) return false // not interested in your gender: doesn't count as a rating
        const liked = rng() < prob
        const newElo = eloAfterSwipe(s.looksElo, theirLooks, liked, looksK(s.impressions))
        set({
          looksElo: Math.round(newElo * 10) / 10,
          impressions: s.impressions + 1,
          likesReceived: s.likesReceived + (liked ? 1 : 0),
          looksHistory: [...s.looksHistory, { t: Date.now(), v: Math.round(newElo) }].slice(-200),
        })
        return liked
      }

      const scheduleReply = (profileId: string, text: string | null) => {
        const p = PROFILE_BY_ID[profileId]
        const setTyping = (v: boolean) => set((s) => ({ typing: { ...s.typing, [profileId]: v } }))
        if (text !== null) setTimeout(() => setTyping(true), 600)
        setTimeout(
          () => {
            // If you already broke the ice, they answer you instead of sending a generic opener.
            const convo = get().matches.find((m) => m.profileId === profileId)
            if (!convo || (text === null && convo.messages.length > 0)) return
            const msg = text === null ? opener(rng, p) : replyTo(rng, p, text)
            set((s) => ({
              typing: { ...s.typing, [profileId]: false },
              matches: s.matches.map((m) =>
                m.profileId === profileId
                  ? {
                      ...m,
                      messages: [...m.messages, { id: uid(), from: 'them', text: msg, at: Date.now() }],
                      unread: s.openChat === profileId ? 0 : m.unread + 1,
                    }
                  : m,
              ),
            }))
          },
          text === null ? delay(2500, 9000) : delay(1400, 4200),
        )
      }

      return {
        ...initial,

        completeOnboarding: (u) => {
          set({
            ...initial,
            user: u,
            // Hidden truth about how attractive mock users find you. The app has to *discover* this.
            trueAppeal: Math.round(STARTING_ELO + gaussian(rng) * 140),
            looksHistory: [{ t: Date.now(), v: STARTING_ELO }],
            iqHistory: [{ t: Date.now(), v: STARTING_IQ }],
          })
          get().dailyTick()
        },

        updateUser: (u) => set((s) => (s.user ? { user: { ...s.user, ...u } } : {})),
        setTab: (tab) => set({ tab, openChat: null }),
        setOpenChat: (openChat) => {
          set({ openChat })
          if (openChat) get().markRead(openChat)
        },
        dismissMatch: () => set({ newMatch: null }),
        showToast: (toast) => set({ toast }),
        toggleXray: () => set((s) => ({ xray: !s.xray })),

        swipe: (id, dir) => {
          const s = get()
          const p = PROFILE_BY_ID[id]
          if (!p || !s.user) return false
          if (dir === 'super' && s.superLikesLeft <= 0) return false

          // 1. Your swipe is a vote on *their* looks Elo.
          const theirLooks = profileLooks(s, p)
          const theirNew = eloAfterSwipe(theirLooks, s.looksElo, dir !== 'pass', 16)
          set({
            swipes: { ...s.swipes, [id]: dir },
            profileElo: { ...s.profileElo, [id]: Math.round(theirNew * 10) / 10 },
            superLikesLeft: dir === 'super' ? s.superLikesLeft - 1 : s.superLikesLeft,
          })
          if (dir === 'pass') {
            if (rng() < 0.35) get().simulateImpressions(1)
            return false
          }

          // 2. They (eventually) see you too — their decision is a vote on *your* looks Elo.
          const alreadyLiked = !!s.likedYou[id]
          const liked = alreadyLiked || evaluateUser(p, dir === 'super')
          if (rng() < 0.35) get().simulateImpressions(1)
          if (!liked) return false

          const { [id]: _, ...rest } = get().likedYou
          set((st) => ({
            likedYou: rest,
            matches: [{ profileId: id, createdAt: Date.now(), messages: [], unread: 0, superLiked: dir === 'super' }, ...st.matches],
            newMatch: id,
          }))
          if (rng() < 0.55) scheduleReply(id, null)
          return true
        },

        rewindPasses: () =>
          set((s) => ({
            swipes: Object.fromEntries(Object.entries(s.swipes).filter(([, d]) => d !== 'pass')),
          })),

        simulateImpressions: (n) => {
          for (let i = 0; i < n; i++) {
            const s = get()
            if (!s.user) return
            // You're only shown to people whose brackets include you.
            const candidates = bracketPool(s).filter((p) => !s.swipes[p.id] && !s.likedYou[p.id])
            if (!candidates.length) return
            const p = candidates[Math.floor(rng() * candidates.length)]
            if (evaluateUser(p)) set((st) => ({ likedYou: { ...st.likedYou, [p.id]: Date.now() } }))
          }
        },

        dailyTick: () => {
          const s = get()
          const day = todayKey()
          if (!s.user) return
          if (s.superLikeDay !== day) set({ superLikesLeft: 3, superLikeDay: day })
          if (s.lastImpressionDay !== day) {
            set({ lastImpressionDay: day })
            // Overnight, a batch of people saw your profile.
            get().simulateImpressions(s.impressions === 0 ? 14 : 8)
          }
        },

        sendMessage: (profileId, text) => {
          set((s) => ({
            matches: s.matches.map((m) =>
              m.profileId === profileId
                ? { ...m, messages: [...m.messages, { id: uid(), from: 'me', text, at: Date.now() }] }
                : m,
            ),
          }))
          if (rng() < 0.92) scheduleReply(profileId, text)
        },

        markRead: (profileId) =>
          set((s) => ({ matches: s.matches.map((m) => (m.profileId === profileId ? { ...m, unread: 0 } : m)) })),

        startGame: (game) => {
          const key = `${todayKey()}:${game}`
          const existing = get().gameStarts[key]
          if (existing) return existing
          const now = Date.now()
          set((s) => ({ gameStarts: { ...s.gameStarts, [key]: now } }))
          return now
        },

        recordGame: (game, metric, dnf) => {
          const s = get()
          const day = todayKey()
          const existing = s.dailies[day]?.[game]
          if (existing) return existing
          const res = scoreGame({ dateKey: day, game, metric, dnf, iq: s.iq, gamesPlayed: s.iqGames })
          const result: GameResult = { metric, dnf, ...res, iqBefore: s.iq, iqAfter: res.iqAfter, at: Date.now() }
          set({
            iq: res.iqAfter,
            iqGames: s.iqGames + 1,
            iqHistory: [...s.iqHistory, { t: Date.now(), v: res.iqAfter }].slice(-200),
            dailies: { ...s.dailies, [day]: { ...s.dailies[day], [game]: result } },
          })
          return result
        },

        resetAll: () => set({ ...initial }),
      }
    },
    {
      name: 'iqupid-v1',
      partialize: ({ tab: _t, openChat: _o, newMatch: _n, toast: _to, typing: _ty, ...rest }) => rest,
    },
  ),
)

