import { useImperativeHandle, type Ref } from 'react'
import { animate, motion, useMotionValue, useTransform, type PanInfo } from 'motion/react'
import { Brain, Info, MapPin, Briefcase } from 'lucide-react'
import type { Profile, SwipeDir } from '../lib/types'
import { Photo } from './ui'

export interface SwipeCardHandle {
  swipe: (dir: SwipeDir) => void
}

interface Props {
  profile: Profile
  index: number
  looks: number
  xray: boolean
  sharedInterests: string[]
  likesYou: boolean
  onSwiped: (dir: SwipeDir) => void
  onInfo: () => void
  ref?: Ref<SwipeCardHandle>
}

export function SwipeCard({ profile: p, index, looks, xray, sharedInterests, likesYou, onSwiped, onInfo, ref }: Props) {
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rotate = useTransform(x, [-320, 320], [-16, 16])
  const likeO = useTransform(x, [25, 110], [0, 1])
  const nopeO = useTransform(x, [-110, -25], [1, 0])
  const superO = useTransform(y, [-130, -40], [1, 0])
  const isTop = index === 0

  const fly = (dir: SwipeDir) => {
    const w = typeof window !== 'undefined' ? window.innerWidth : 800
    const opts = { duration: 0.32, ease: [0.2, 0.7, 0.4, 1] as const }
    if (dir === 'super') {
      animate(y, -900, opts)
      animate(x, 0, opts)
    } else animate(x, dir === 'like' ? w : -w, opts)
    setTimeout(() => onSwiped(dir), 260)
  }

  useImperativeHandle(ref, () => ({ swipe: fly }))

  const onDragEnd = (_: unknown, info: PanInfo) => {
    const { offset, velocity } = info
    if (offset.y < -130 && Math.abs(offset.x) < 110) return fly('super')
    if (offset.x > 110 || velocity.x > 700) return fly('like')
    if (offset.x < -110 || velocity.x < -700) return fly('pass')
    animate(x, 0, { type: 'spring', stiffness: 400, damping: 30 })
    animate(y, 0, { type: 'spring', stiffness: 400, damping: 30 })
  }

  return (
    <motion.div
      className="absolute inset-0 select-none-all touch-none"
      style={{ x, y, rotate, zIndex: 10 - index }}
      drag={isTop}
      dragElastic={0.9}
      dragMomentum={false}
      onDragEnd={onDragEnd}
      initial={false}
      animate={{ scale: 1 - index * 0.045, translateY: index * 14, opacity: index > 2 ? 0 : 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      whileTap={isTop ? { cursor: 'grabbing' } : undefined}
    >
      <div className="relative h-full w-full overflow-hidden rounded-[28px] bg-ink-800 shadow-2xl shadow-black/60 ring-1 ring-white/10">
        <Photo src={p.photo} name={p.name} className="absolute inset-0 h-full w-full scale-[1.02]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-black/20" />

        {/* Stamps */}
        <motion.div style={{ opacity: likeO }} className="absolute top-10 left-6 -rotate-12 rounded-xl border-4 border-emerald-400 px-3 py-1 text-4xl font-black tracking-wider text-emerald-400">
          LIKE
        </motion.div>
        <motion.div style={{ opacity: nopeO }} className="absolute top-10 right-6 rotate-12 rounded-xl border-4 border-rose-500 px-3 py-1 text-4xl font-black tracking-wider text-rose-500">
          NOPE
        </motion.div>
        <motion.div style={{ opacity: superO }} className="absolute bottom-48 left-1/2 -translate-x-1/2 -rotate-6 rounded-xl border-4 border-sky-400 px-3 py-1 text-3xl font-black tracking-wider whitespace-nowrap text-sky-400">
          SUPER LIKE
        </motion.div>

        <div className="absolute top-4 left-4 flex flex-wrap gap-2">
          {likesYou && <span className="rounded-full bg-amber-400/90 px-2.5 py-1 text-xs font-bold text-black">Likes you</span>}
          {xray && (
            <span className="rounded-full bg-black/60 px-2.5 py-1 font-mono text-xs text-pink-200 ring-1 ring-pink-300/40 backdrop-blur">
              ELO {Math.round(looks)}
            </span>
          )}
        </div>

        <div className="absolute inset-x-0 bottom-0 p-5">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <h2 className="truncate text-3xl font-extrabold">{p.name}</h2>
                <span className="text-2xl font-light">{p.age}</span>
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-sm text-white/80">
                <Briefcase className="h-3.5 w-3.5" /> <span className="truncate">{p.job}</span>
              </div>
              <div className="mt-0.5 flex items-center gap-1.5 text-sm text-white/70">
                <MapPin className="h-3.5 w-3.5" /> {p.distanceKm} km away
              </div>
            </div>
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={onInfo}
              className="shrink-0 rounded-full bg-white/15 p-2 backdrop-blur hover:bg-white/25"
              aria-label="More info"
            >
              <Info className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/30 px-2.5 py-1 text-xs font-semibold text-violet-100 ring-1 ring-violet-300/40 backdrop-blur">
              <Brain className="h-3.5 w-3.5" /> IQ {p.iq}
            </span>
            {p.interests.slice(0, 3).map((i) => (
              <span
                key={i}
                className={`rounded-full px-2.5 py-1 text-xs backdrop-blur ${sharedInterests.includes(i) ? 'bg-brand/40 font-semibold text-white ring-1 ring-brand' : 'bg-white/15 text-white/90'}`}
              >
                {i}
              </span>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
