import { useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import type { HistoryPoint } from '../lib/types'

const GRADS = [
  'from-rose-500 to-orange-400',
  'from-violet-500 to-cyan-400',
  'from-emerald-500 to-teal-400',
  'from-amber-500 to-pink-500',
  'from-sky-500 to-indigo-500',
]

/** Profile photo with a graceful gradient + initials fallback if the image can't load. */
export function Photo({ src, name, className = '', rounded = '' }: { src: string | null; name: string; className?: string; rounded?: string }) {
  const [failed, setFailed] = useState(false)
  const grad = GRADS[(name.charCodeAt(0) + name.length) % GRADS.length]
  if (!src || failed)
    return (
      <div className={`@container flex items-center justify-center bg-gradient-to-br ${grad} ${rounded} ${className}`}>
        <span className="text-[42cqw] leading-none font-black text-white/90 drop-shadow">{name.slice(0, 1).toUpperCase()}</span>
      </div>
    )
  return (
    <img
      src={src}
      alt={name}
      draggable={false}
      onError={() => setFailed(true)}
      className={`object-cover ${rounded} ${className}`}
    />
  )
}

export function Sparkline({ data, color = '#ff4f7b', height = 44, className = '' }: { data: HistoryPoint[]; color?: string; height?: number; className?: string }) {
  const pts = data.length === 1 ? [data[0], data[0]] : data
  if (!pts.length) return null
  const w = 200
  const vals = pts.map((p) => p.v)
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const span = max - min || 1
  const xy = pts.map((p, i) => [(i / (pts.length - 1)) * w, height - 4 - ((p.v - min) / span) * (height - 8)] as const)
  const d = xy.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const id = `sg${color.replace('#', '')}`
  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className={`w-full ${className}`} style={{ height }}>
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.35" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L${w},${height} L0,${height} Z`} fill={`url(#${id})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      <circle cx={xy[xy.length - 1][0]} cy={xy[xy.length - 1][1]} r="3" fill={color} />
    </svg>
  )
}

/** Slide-up overlay that lives inside the phone frame. */
export function Sheet({ open, onClose, children, full = false }: { open: boolean; onClose: () => void; children: ReactNode; full?: boolean }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="absolute inset-0 z-40 flex flex-col justify-end" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            className={`relative z-10 overflow-y-auto no-scrollbar rounded-t-3xl bg-ink-900 ring-1 ring-white/10 ${full ? 'h-full rounded-t-none' : 'max-h-[88%]'}`}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function Chip({ children, active = false, className = '' }: { children: ReactNode; active?: boolean; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
        active ? 'bg-brand/20 text-pink-200 ring-1 ring-brand/50' : 'bg-white/10 text-white/80'
      } ${className}`}
    >
      {children}
    </span>
  )
}

export function Button({
  children,
  onClick,
  variant = 'brand',
  className = '',
  disabled,
  type = 'button',
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'brand' | 'brain' | 'ghost' | 'danger'
  className?: string
  disabled?: boolean
  type?: 'button' | 'submit'
}) {
  const styles = {
    brand: 'grad-brand text-white shadow-lg shadow-brand/25',
    brain: 'grad-brain text-white shadow-lg shadow-violet-500/25',
    ghost: 'bg-white/8 text-white ring-1 ring-white/10 hover:bg-white/12',
    danger: 'bg-red-500/15 text-red-300 ring-1 ring-red-500/30 hover:bg-red-500/25',
  }[variant]
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`rounded-full px-5 py-3 text-sm font-semibold transition active:scale-[0.97] disabled:opacity-40 ${styles} ${className}`}
    >
      {children}
    </button>
  )
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="rounded-2xl bg-white/5 p-3 ring-1 ring-white/5">
      <div className="text-[11px] font-medium uppercase tracking-wider text-white/45">{label}</div>
      <div className="mt-0.5 text-xl font-bold tabular-nums">{value}</div>
      {sub && <div className="text-xs text-white/50">{sub}</div>}
    </div>
  )
}
