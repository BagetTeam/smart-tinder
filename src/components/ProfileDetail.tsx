import { Brain, Briefcase, GraduationCap, MapPin, Ruler, X } from 'lucide-react'
import { GAMES, formatMetric, iqTier, populationResults } from '../lib/engine'
import { todayKey } from '../lib/rng'
import type { Profile } from '../lib/types'
import { Chip, Photo } from './ui'

export function ProfileDetail({ profile: p, onClose, looks, xray, shared }: { profile: Profile; onClose: () => void; looks: number; xray: boolean; shared: string[] }) {
  const day = todayKey()
  return (
    <div className="pb-8">
      <div className="relative aspect-[4/5] w-full">
        <Photo src={p.photo} name={p.name} className="h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-900 via-transparent to-transparent" />
        <button onClick={onClose} className="absolute top-4 right-4 rounded-full bg-black/50 p-2 backdrop-blur" aria-label="Close">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="-mt-16 relative px-5">
        <div className="flex items-baseline gap-2">
          <h2 className="text-3xl font-extrabold">{p.name}</h2>
          <span className="text-2xl font-light text-white/80">{p.age}</span>
        </div>
        <div className="mt-2 space-y-1 text-sm text-white/70">
          <div className="flex items-center gap-2"><Briefcase className="h-4 w-4" /> {p.job}</div>
          <div className="flex items-center gap-2"><GraduationCap className="h-4 w-4" /> {p.school}</div>
          <div className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {p.distanceKm} km away</div>
          <div className="flex items-center gap-2"><Ruler className="h-4 w-4" /> {p.heightCm} cm</div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-violet-500/10 p-3 ring-1 ring-violet-400/20">
            <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-violet-200/70"><Brain className="h-3.5 w-3.5" /> Est. IQ</div>
            <div className="text-grad-brain text-2xl font-black">{p.iq}</div>
            <div className="text-xs text-white/50">{iqTier(p.iq)}</div>
          </div>
          <div className="rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
            <div className="text-xs font-medium uppercase tracking-wider text-white/45">Looks Elo</div>
            <div className={`text-2xl font-black ${xray ? 'text-grad' : 'text-white/25 blur-[5px] select-none'}`}>{xray ? Math.round(looks) : '1337'}</div>
            <div className="text-xs text-white/50">{xray ? 'X-ray mode' : 'hidden'}</div>
          </div>
        </div>

        <p className="mt-5 text-[15px] leading-relaxed text-white/90">{p.bio}</p>

        <div className="mt-5 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
          <div className="text-xs font-semibold text-white/50">{p.prompt.q}</div>
          <div className="mt-1 text-lg font-semibold">{p.prompt.a}</div>
        </div>

        <div className="mt-5 text-xs font-semibold uppercase tracking-wider text-white/45">Interests</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {p.interests.map((i) => (
            <Chip key={i} active={shared.includes(i)}>{i}</Chip>
          ))}
        </div>

        <div className="mt-6 text-xs font-semibold uppercase tracking-wider text-white/45">Today's dailies</div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {GAMES.map((g) => {
            const r = populationResults(day, g.id).find((e) => e.profileId === p.id)!
            return (
              <div key={g.id} className="rounded-xl bg-white/5 px-3 py-2 ring-1 ring-white/5">
                <div className="text-xs text-white/50">{g.name}</div>
                <div className="font-semibold tabular-nums">{formatMetric(g.id, r.metric, r.dnf)}</div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
