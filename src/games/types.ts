export interface GameProps {
  /** Daily seed — everyone gets the same puzzle on the same day. */
  seed: string
  /** Epoch ms the attempt started (persisted, so reloading doesn't reset the clock). */
  startedAt: number
  /** Puzzle games call this when solved; mental math passes its score. */
  onSolved: (score?: number) => void
}
