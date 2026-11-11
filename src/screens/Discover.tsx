import { useEffect, useMemo, useRef, useState } from 'react'
import { Heart, RotateCcw, Star, X, Brain, SlidersHorizontal } from 'lucide-react'
import { PROFILE_BY_ID } from '../data/profiles'
import { BRACKET } from '../lib/engine'
import { bracketPool, deck, profileLooks, useStore } from '../store'
import type { SwipeDir } from '../lib/types'
import { SwipeCard, type SwipeCardHandle } from '../components/SwipeCard'
import { ProfileDetail } from '../components/ProfileDetail'
import { Button, Sheet } from '../components/ui'

export default function Discover() {
  const s = useStore()
  const { user, swipe, xray, superLikesLeft, rewindPasses, setTab } = s
  const [queue, setQueue] = useState<string[]>(() => deck(useStore.getState()).slice(0, 4).map((p) => p.id))
  const [info, setInfo] = useState<string | null>(null)
  const [bracketOpen, setBracketOpen] = useState(false)
  const topRef = useRef<SwipeCardHandle>(null)
  const busy = useRef(false)

  // Keep a small stable queue so cards behind the top one don't reshuffle while the bracket moves.
  useEffect(() => {
    if (queue.length >= 3) return
    const st = useStore.getState()
    const more = deck(st)
      .map((p) => p.id)
      .filter((id) => !queue.includes(id))
    if (more.length) setQueue((q) => [...q, ...more.slice(0, 4 - q.length)])
  }, [queue, s.swipes, s.iq, s.looksElo])

  const onSwiped = (id: string, dir: SwipeDir) => {
    swipe(id, dir)
    setQueue((q) => q.filter((x) => x !== id))
    busy.current = false
  }

  const trigger = (dir: SwipeDir) => {
    if (busy.current || !queue.length) return
    if (dir === 'super' && superLikesLeft <= 0) {
      s.showToast('Out of Super Likes for today')
      return
    }
    busy.current = true
    topRef.current?.swipe(dir)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (info || (e.target as HTMLElement)?.tagName === 'INPUT') return
      if (e.key === 'ArrowLeft') trigger('pass')
      if (e.key === 'ArrowRight') trigger('like')
      if (e.key === 'ArrowUp') trigger('super')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const pool = useMemo(() => bracketPool(s), [s.iq, s.looksElo, user?.showMe, s.profileElo]) // eslint-disable-line
  const remainingPasses = Object.values(s.swipes).filter((d) => d === 'pass').length
  const infoProfile = info ? PROFILE_BY_ID[info] : null
  const shared = (ids: string[]) => ids.filter((i) => user?.interests.includes(i))

  return (
    <div className="flex h-full flex-col px-3 pb-3">
      <button
        onClick={() => setBracketOpen(true)}
        className="mx-auto mb-3 flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5 text-xs text-white/70 ring-1 ring-white/10 hover:bg-white/10"
      >
        <SlidersHorizontal className="h-3.5 w-3.5" />
        <span>
          IQ {Math.round(s.iq - BRACKET.iq)}–{Math.round(s.iq + BRACKET.iq)}
        </span>
        <span className="text-white/30">·</span>
        <span>{pool.length} in your bracket</span>
      </button>

      <div className="relative min-h-0 flex-1">
        {queue.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center rounded-[28px] bg-white/[0.03] px-8 text-center ring-1 ring-white/5">
            <div className="relative mb-6">
              <div className="absolute inset-0 animate-ping rounded-full bg-brand/30" />
              <div className="grad-brand relative rounded-full p-5">
                <Brain className="h-10 w-10" />
              </div>
            </div>
            <h3 className="text-xl font-bold">You've seen everyone in your bracket</h3>
            <p className="mt-2 text-sm text-white/55">
              Your deck only contains people within ±{BRACKET.iq} IQ points and a similar looks rating. Play the dailies to move your IQ estimate, or give the people you passed a second chance.
            </p>
            <div className="mt-6 flex w-full flex-col gap-2">
              <Button variant="brain" onClick={() => setTab('dailies')}>
                Play today's dailies
              </Button>
              {remainingPasses > 0 && (
                <Button variant="ghost" onClick={rewindPasses}>
                  <span className="inline-flex items-center gap-2">
                    <RotateCcw className="h-4 w-4" /> Revisit {remainingPasses} passed profiles
                  </span>
                </Button>
              )}
            </div>
          </div>
        ) : (
          [...queue]
            .slice(0, 3)
            .reverse()
            .map((id) => {
              const p = PROFILE_BY_ID[id]
              const index = queue.indexOf(id)
              return (
                <SwipeCard
                  key={id}
                  ref={index === 0 ? topRef : undefined}
                  profile={p}
                  index={index}
                  looks={profileLooks(s, p)}
                  xray={xray}
                  likesYou={xray && !!s.likedYou[id]}
                  sharedInterests={shared(p.interests)}
                  onSwiped={(dir) => onSwiped(id, dir)}
                  onInfo={() => setInfo(id)}
                />
              )
            })
        )}
      </div>

      <div className="mt-4 flex items-center justify-center gap-5">
        <ActionButton onClick={() => trigger('pass')} disabled={!queue.length} className="h-16 w-16 text-rose-500 ring-rose-500/30 hover:bg-rose-500/10" label="Pass">
          <X className="h-8 w-8" strokeWidth={3} />
        </ActionButton>
        <ActionButton onClick={() => trigger('super')} disabled={!queue.length} className="relative h-12 w-12 text-sky-400 ring-sky-400/30 hover:bg-sky-400/10" label="Super like">
          <Star className="h-6 w-6" fill="currentColor" />
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-sky-500 text-[10px] font-bold text-white">{superLikesLeft}</span>
        </ActionButton>
        <ActionButton onClick={() => trigger('like')} disabled={!queue.length} className="h-16 w-16 text-emerald-400 ring-emerald-400/30 hover:bg-emerald-400/10" label="Like">
          <Heart className="h-8 w-8" fill="currentColor" />
        </ActionButton>
      </div>

      <Sheet open={!!infoProfile} onClose={() => setInfo(null)}>
        {infoProfile && (
          <>
            <ProfileDetail profile={infoProfile} onClose={() => setInfo(null)} looks={profileLooks(s, infoProfile)} xray={xray} shared={shared(infoProfile.interests)} />
            {queue[0] === infoProfile.id && (
              <div className="sticky bottom-0 flex justify-center gap-5 bg-gradient-to-t from-ink-900 via-ink-900 to-transparent pt-6 pb-6">
                <ActionButton onClick={() => { setInfo(null); setTimeout(() => trigger('pass'), 250) }} className="h-14 w-14 text-rose-500 ring-rose-500/30" label="Pass">
                  <X className="h-7 w-7" strokeWidth={3} />
                </ActionButton>
                <ActionButton onClick={() => { setInfo(null); setTimeout(() => trigger('like'), 250) }} className="h-14 w-14 text-emerald-400 ring-emerald-400/30" label="Like">
                  <Heart className="h-7 w-7" fill="currentColor" />
                </ActionButton>
              </div>
            )}
          </>
        )}
      </Sheet>

      <Sheet open={bracketOpen} onClose={() => setBracketOpen(false)}>
        <BracketExplainer pool={pool.length} />
      </Sheet>
    </div>
  )
}

function ActionButton({ children, onClick, className, label, disabled }: { children: React.ReactNode; onClick: () => void; className: string; label: string; disabled?: boolean }) {
  return (
    <button
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`flex items-center justify-center rounded-full bg-ink-800 shadow-lg shadow-black/40 ring-2 transition hover:scale-105 active:scale-90 disabled:opacity-30 ${className}`}
    >
      {children}
    </button>
  )
}

function BracketExplainer({ pool }: { pool: number }) {
  const s = useStore()
  const rows = [
    { label: 'Estimated IQ', mine: s.iq.toFixed(1), lo: Math.round(s.iq - BRACKET.iq), hi: Math.round(s.iq + BRACKET.iq), color: 'text-grad-brain' },
    { label: 'Looks Elo', mine: s.xray ? Math.round(s.looksElo) : '????', lo: s.xray ? Math.round(s.looksElo - BRACKET.looks) : '?', hi: s.xray ? Math.round(s.looksElo + BRACKET.looks) : '?', color: 'text-grad' },
  ]
  return (
    <div className="p-6 pb-10">
      <h3 className="text-xl font-bold">Your matchmaking bracket</h3>
      <p className="mt-2 text-sm text-white/55">
        You are only shown to — and only see — people who fall inside <b>both</b> windows below. Moving either score changes who's in your deck.
      </p>
      <div className="mt-5 space-y-3">
        {rows.map((r) => (
          <div key={r.label} className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-white/60">{r.label}</span>
              <span className={`text-2xl font-black ${r.color}`}>{r.mine}</span>
            </div>
            <div className="mt-2 text-xs text-white/45">
              Window: {r.lo} – {r.hi}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-sm text-white/55">
        <b className="text-white">{pool}</b> people currently fit your bracket. {!s.xray && 'Your looks Elo is hidden — turn on X-ray mode in your profile to peek behind the curtain.'}
      </p>
    </div>
  )
}
