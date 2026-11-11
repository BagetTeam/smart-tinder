export type Gender = 'man' | 'woman' | 'nonbinary'
export type ShowMe = 'men' | 'women' | 'everyone'

export interface Prompt {
  q: string
  a: string
}

export interface Profile {
  id: string
  name: string
  age: number
  gender: Gender
  /** Which genders this mock profile is open to. */
  interestedIn: Gender[]
  photo: string
  bio: string
  job: string
  school: string
  distanceKm: number
  heightCm: number
  interests: string[]
  prompt: Prompt
  /** Starting hidden desirability rating (mutated copies live in the store). */
  looksElo: number
  /** Estimated IQ of the mock user. */
  iq: number
  /** How selective this person is when swiping (-1 = easy, +1 = picky). */
  pickiness: number
  /** Personality used for chat replies. */
  vibe: 'witty' | 'warm' | 'nerdy' | 'chill' | 'intense'
}

export interface UserProfile {
  name: string
  age: number
  gender: Gender
  showMe: ShowMe
  bio: string
  job: string
  school: string
  photo: string | null
  interests: string[]
  prompt: Prompt
}

export type SwipeDir = 'like' | 'pass' | 'super'

export interface Message {
  id: string
  from: 'me' | 'them'
  text: string
  at: number
}

export interface Match {
  profileId: string
  createdAt: number
  messages: Message[]
  unread: number
  superLiked?: boolean
}

export type GameId = 'queens' | 'zip' | 'tango' | 'mental'

export interface GameResult {
  /** Seconds to solve for puzzles, correct answers for mental math. */
  metric: number
  dnf: boolean
  percentile: number
  perfIq: number
  iqBefore: number
  iqAfter: number
  rank: number
  total: number
  at: number
}

export interface HistoryPoint {
  t: number
  v: number
}
