import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowDown, ArrowUp, Brain, ChevronRight, Clock, Crown, Flame, Grid2x2, Spline, Trophy, X, Calculator } from 'lucide-react'
import { PROFILE_BY_ID } from '../data/profiles'
import { BRACKET, GAMES, GAME_BY_ID, formatMetric, iqTier, populationResults, type GameMeta } from '../lib/engine'
import { todayKey } from '../lib/rng'
import type { GameId, GameResult } from '../lib/types'
import { useStore } from '../store'
import { Button, Photo, Sheet, Sparkline } from '../components/ui'

const GAME_COMPONENTS = {
  queens: lazy(() => import('../games/Queens')),
  zip: lazy(() => import('../games/Zip')),
  tango: lazy(() => import('../games/Tango')),
  mental: lazy(() => import('../games/MentalMath')),
}

const ICONS: Record<GameId, typeof Crown> = { queens: Crown, zip: Spline, tango: Grid2x2, mental: Calculator }
const ACCENTS: Record<GameId, string> = {
  queens: 'from-violet-500 to-fuchsia-500',
  zip: 'from-orange-500 to-amber-400',
  tango: 'from-sky-500 to-amber-300',
  mental: 'from-emerald-500 to-cyan-400',
}

function useCountdownToMidnight() {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(id)
  }, [])
  const end = new Date()
  end.setHours(24, 0, 0, 0)
  const mins = Math.max(0, Math.floor((end.getTime() - now) / 60000))
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

function streakOf(dailies: Record<string, Partial<Record<GameId, GameResult>>>) {
  let streak = 0
  const d = new Date()
  // Today counts if anything was played; otherwise start from yesterday.
  if (!Object.keys(dailies[todayKey(d)] ?? {}).length) d.setDate(d.getDate() - 1)
  while (Object.keys(dailies[todayKey(d)] ?? {}).length) {
    streak++
    d.setDate(d.getDate() - 1)
  }
  return streak
}

export default function Dailies() {
  const day = todayKey()
  const iq = useStore((s) => s.iq)
  const iqHistory = useStore((s) => s.iqHistory)
  const dailies = useStore((s) => s.dailies)
  const today = dailies[day] ?? {}
  const [playing, setPlaying] = useState<GameId | null>(null)
  const [viewing, setViewing] = useState<GameId | null>(null)
  const resets = useCountdownToMidnight()
  const doneCount = Object.keys(today).length
  const todayDelta = Object.values(today).reduce((s, r) => s + (r!.iqAfter - r!.iqBefore), 0)
  const streak = streakOf(dailies)
  const dateLabel = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })

  return (
    <div className="relative h-full">
      <div className="h-full overflow-y-auto no-scrollbar px-5 pb-8">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-white/40">{dateLabel}</div>
            <h1 className="text-2xl font-extrabold">Daily brain games</h1>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-orange-500/15 px-3 py-1 text-sm font-bold text-orange-300 ring-1 ring-orange-400/30">
            <Flame className="h-4 w-4" fill="currentColor" /> {streak}
          </div>
        </div>

        <section className="mt-4 rounded-3xl bg-gradient-to-br from-violet-600/30 via-violet-600/10 to-cyan-500/10 p-4 ring-1 ring-violet-400/20">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-violet-200/70">
                <Brain className="h-3.5 w-3.5" /> Your estimated IQ
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-grad-brain text-4xl font-black tabular-nums">{iq.toFixed(1)}</span>
                {doneCount > 0 && <Delta value={todayDelta} />}
              </div>
              <div className="text-sm text-white/55">
                {iqTier(iq)} · bracket {Math.round(iq - BRACKET.iq)}–{Math.round(iq + BRACKET.iq)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black">{doneCount}/4</div>
              <div className="text-xs text-white/45">done today</div>
            </div>
          </div>
          <Sparkline data={iqHistory} color="#a78bfa" className="mt-2" height={40} />
        </section>

        <div className="mt-4 space-y-3">
          {GAMES.map((g, i) => (
            <GameCard key={g.id} meta={g} index={i} result={today[g.id]} onPlay={() => setPlaying(g.id)} onView={() => setViewing(g.id)} />
          ))}
        </div>

        <div className="mt-5 flex items-center justify-center gap-1.5 text-xs text-white/40">
          <Clock className="h-3.5 w-3.5" /> New puzzles in {resets}
        </div>
        <p className="mt-3 text-center text-xs leading-relaxed text-white/35">
          Everyone gets the same puzzles each day. Your result is ranked against every player, turned into a performance IQ, and your estimate moves toward it — which shifts who you can match with.
        </p>
      </div>

      <AnimatePresence>
        {playing && (
          <motion.div
            className="absolute inset-0 z-30 bg-ink-900"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 300 }}
          >
            <GameRunner game={playing} onClose={() => setPlaying(null)} />
          </motion.div>
        )}
      </AnimatePresence>

      <Sheet open={!!viewing} onClose={() => setViewing(null)}>
        {viewing && today[viewing] && (
          <div className="p-5 pb-10">
            <ResultView game={viewing} result={today[viewing]!} />
          </div>
        )}
      </Sheet>
    </div>
  )
}

function Delta({ value, className = '' }: { value: number; className?: string }) {
  const up = value >= 0
  return (
    <span className={`inline-flex items-center gap-0.5 text-sm font-bold ${up ? 'text-emerald-400' : 'text-rose-400'} ${className}`}>
      {up ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />}
      {Math.abs(value).toFixed(1)}
    </span>
  )
}

function GameCard({ meta, index, result, onPlay, onView }: { meta: GameMeta; index: number; result?: GameResult; onPlay: () => void; onView: () => void }) {
  const Icon = ICONS[meta.id]
  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={result ? onView : onPlay}
      className="flex w-full items-center gap-4 rounded-3xl bg-white/5 p-3 pr-4 text-left ring-1 ring-white/10 transition hover:bg-white/8 active:scale-[0.99]"
    >
      <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${ACCENTS[meta.id]} shadow-lg`}>
        <Icon className="h-8 w-8 text-white" strokeWidth={2.2} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-bold">{meta.name}</div>
        <div className="truncate text-sm text-white/55">{meta.tagline}</div>
        {result && (
          <div className="mt-1 flex items-center gap-2 text-xs">
            <span className="font-semibold tabular-nums">{formatMetric(meta.id, result.metric, result.dnf)}</span>
            <span className="text-white/30">·</span>
            <span className="text-white/60">top {Math.max(1, Math.round((1 - result.percentile) * 100))}%</span>
            <Delta value={result.iqAfter - result.iqBefore} className="text-xs" />
          </div>
        )}
      </div>
      {result ? (
        <ChevronRight className="h-5 w-5 text-white/30" />
      ) : (
        <span className="grad-brain rounded-full px-4 py-2 text-sm font-bold">Play</span>
      )}
    </motion.button>
  )
}

function useElapsed(startedAt: number | null, running: boolean) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [running])
  return startedAt ? Math.floor((now - startedAt) / 1000) : 0
}

function GameRunner({ game, onClose }: { game: GameId; onClose: () => void }) {
  const meta = GAME_BY_ID[game]
  const day = todayKey()
  const startGame = useStore((s) => s.startGame)
  const recordGame = useStore((s) => s.recordGame)
  const existingStart = useStore((s) => s.gameStarts[`${day}:${game}`] ?? null)
  const [phase, setPhase] = useState<'intro' | 'playing' | 'result'>(existingStart ? 'playing' : 'intro')
  const [startedAt, setStartedAt] = useState<number | null>(existingStart)
  const [result, setResult] = useState<GameResult | null>(null)
  const [confirmQuit, setConfirmQuit] = useState(false)
  const elapsed = useElapsed(startedAt, phase === 'playing')
  const Comp = GAME_COMPONENTS[game]
  const players = populationResults(day, game).length

  const finish = useCallback(
    (score?: number, dnf = false) => {
      if (phase !== 'playing') return
      const metric = meta.unit === 'score' ? (score ?? 0) : Math.max(1, Math.round((Date.now() - (startedAt ?? Date.now())) / 1000))
      setResult(recordGame(game, metric, dnf))
      setPhase('result')
    },
    [phase, meta.unit, startedAt, recordGame, game],
  )

  // Puzzles have a hard time limit.
  useEffect(() => {
    if (phase === 'playing' && meta.unit === 'time' && elapsed >= meta.timeLimit) finish(undefined, true)
  }, [elapsed, phase, meta, finish])

  const start = () => {
    setStartedAt(startGame(game))
    setPhase('playing')
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 shrink-0 items-center justify-between px-3">
        <button
          onClick={() => (phase === 'playing' ? setConfirmQuit(true) : onClose())}
          className="rounded-full p-2 hover:bg-white/10"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="font-bold">{meta.name}</div>
        <div className="w-16 text-right font-mono text-sm font-bold tabular-nums">
          {phase === 'playing' && meta.unit === 'time' && formatMetric(game, elapsed)}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar px-5 pb-6">
        {phase === 'intro' && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className={`flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br ${ACCENTS[game]} shadow-2xl`}>
              {(() => {
                const Icon = ICONS[game]
                return <Icon className="h-12 w-12" />
              })()}
            </div>
            <h2 className="mt-6 text-3xl font-black">{meta.name}</h2>
            <p className="mt-2 text-white/60">{meta.tagline}</p>
            <p className="mt-1 text-xs text-white/35">Inspired by {meta.inspiredBy}</p>
            <div className="mt-6 w-full space-y-2 rounded-2xl bg-white/5 p-4 text-left text-sm text-white/70 ring-1 ring-white/10">
              <div className="flex justify-between"><span>Ranked against</span><b className="text-white">{players} players</b></div>
              <div className="flex justify-between"><span>Scored on</span><b className="text-white">{meta.unit === 'time' ? 'Solve time' : `Correct answers in ${meta.timeLimit}s`}</b></div>
              <div className="flex justify-between"><span>Attempts</span><b className="text-white">One per day</b></div>
            </div>
            <p className="mt-4 text-xs text-white/40">The clock starts when you tap Start and keeps running if you leave.</p>
            <Button variant="brain" className="mt-6 w-full py-4 text-base" onClick={start}>
              Start
            </Button>
          </div>
        )}

        {phase === 'playing' && (
          <Suspense fallback={<div className="py-20 text-center text-white/40">Loading…</div>}>
            <div className="pt-4">
              <Comp seed={day} startedAt={startedAt ?? Date.now()} onSolved={(score) => finish(score)} />
            </div>
          </Suspense>
        )}

        {phase === 'result' && result && (
          <div className="pt-2">
            <ResultView game={game} result={result} celebrate />
            <Button variant="ghost" className="mt-6 w-full" onClick={onClose}>
              Back to dailies
            </Button>
          </div>
        )}
      </div>

      <Sheet open={confirmQuit} onClose={() => setConfirmQuit(false)}>
        <div className="p-6 pb-10 text-center">
          <h3 className="text-xl font-bold">Give up?</h3>
          <p className="mt-2 text-sm text-white/55">You only get one attempt per day. Giving up records a DNF, which ranks last.</p>
          <div className="mt-6 flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => setConfirmQuit(false)}>
              Keep playing
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              onClick={() => {
                setConfirmQuit(false)
                finish(undefined, true)
              }}
            >
              Give up
            </Button>
          </div>
        </div>
      </Sheet>
    </div>
  )
}

function ResultView({ game, result, celebrate = false }: { game: GameId; result: GameResult; celebrate?: boolean }) {
  const meta = GAME_BY_ID[game]
  const user = useStore((s) => s.user!)
  const day = todayKey()
  const delta = result.iqAfter - result.iqBefore
  const beat = Math.round(result.percentile * 100)

  const board = useMemo(() => {
    const pop = populationResults(day, game)
    const rows = pop.map((e) => ({ id: e.profileId, metric: e.metric, dnf: e.dnf, me: false }))
    rows.push({ id: 'me', metric: result.metric, dnf: result.dnf, me: true })
    const val = (r: (typeof rows)[number]) => (r.dnf ? -Infinity : meta.lowerIsBetter ? -r.metric : r.metric)
    rows.sort((a, b) => val(b) - val(a) || (a.me ? -1 : b.me ? 1 : 0))
    return rows.map((r, i) => ({ ...r, rank: i + 1 }))
  }, [day, game, result, meta.lowerIsBetter])
  const myIdx = board.findIndex((r) => r.me)
  const shown = [...board.slice(0, 3), ...(myIdx > 5 ? [null] : []), ...board.slice(Math.max(3, myIdx - 2), myIdx + 3)]

  return (
    <div>
      <div className="text-center">
        <motion.div
          initial={celebrate ? { scale: 0.5, opacity: 0 } : false}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 12 }}
          className="mx-auto flex h-36 w-36 flex-col items-center justify-center rounded-full bg-gradient-to-br from-violet-500/30 to-cyan-400/20 ring-4 ring-violet-400/40"
        >
          {result.dnf ? (
            <span className="text-3xl font-black text-rose-300">DNF</span>
          ) : (
            <>
              <span className="text-xs font-semibold uppercase tracking-wider text-white/60">beat</span>
              <span className="text-5xl font-black tabular-nums">{beat}%</span>
              <span className="text-xs text-white/60">of players</span>
            </>
          )}
        </motion.div>
        <div className="mt-4 text-sm text-white/50">
          {meta.name} · {formatMetric(game, result.metric, result.dnf)} · rank #{result.rank} of {result.total}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-white/45">Performance IQ</div>
          <div className="text-2xl font-black tabular-nums">{result.perfIq}</div>
          <div className="text-xs text-white/45">today's game</div>
        </div>
        <div className="rounded-2xl bg-violet-500/10 p-3 ring-1 ring-violet-400/25">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-violet-200/60">Est. IQ</div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black tabular-nums">{result.iqAfter.toFixed(1)}</span>
            <Delta value={delta} />
          </div>
          <div className="text-xs text-white/45">was {result.iqBefore.toFixed(1)}</div>
        </div>
      </div>
      {Math.abs(delta) >= 0.5 && (
        <p className="mt-3 text-center text-xs text-white/45">
          Your matchmaking bracket is now IQ {Math.round(result.iqAfter - BRACKET.iq)}–{Math.round(result.iqAfter + BRACKET.iq)}.
          {delta > 0 ? ' Smarter people just entered your deck.' : ' Your deck shifted a little.'}
        </p>
      )}

      <div className="mt-6 flex items-center gap-2 text-sm font-bold">
        <Trophy className="h-4 w-4 text-amber-300" /> Today's leaderboard
      </div>
      <div className="mt-2 overflow-hidden rounded-2xl ring-1 ring-white/10">
        {shown.map((r, i) =>
          r === null ? (
            <div key={`gap${i}`} className="bg-white/[0.02] py-1 text-center text-xs text-white/30">
              ⋯
            </div>
          ) : (
            <div key={r.id} className={`flex items-center gap-3 px-3 py-2 ${r.me ? 'bg-violet-500/20' : i % 2 ? 'bg-white/[0.02]' : 'bg-white/[0.04]'}`}>
              <span className={`w-8 text-sm font-bold tabular-nums ${r.rank <= 3 ? 'text-amber-300' : 'text-white/50'}`}>#{r.rank}</span>
              <Photo
                src={r.me ? user.photo : PROFILE_BY_ID[r.id].photo}
                name={r.me ? user.name : PROFILE_BY_ID[r.id].name}
                className="h-8 w-8 rounded-full"
                rounded="rounded-full"
              />
              <span className={`flex-1 truncate text-sm ${r.me ? 'font-bold' : ''}`}>{r.me ? `${user.name} (you)` : PROFILE_BY_ID[r.id].name}</span>
              {!r.me && <span className="text-xs text-violet-300/70">IQ {PROFILE_BY_ID[r.id].iq}</span>}
              <span className="w-14 text-right font-mono text-sm tabular-nums">{formatMetric(game, r.metric, r.dnf)}</span>
            </div>
          ),
        )}
      </div>
    </div>
  )
}
