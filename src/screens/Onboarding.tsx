import { useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, Brain, Camera, Flame, Sparkles } from 'lucide-react'
import { ALL_INTERESTS, ALL_PROMPTS } from '../data/profiles'
import { useStore } from '../store'
import type { Gender, ShowMe, UserProfile } from '../lib/types'
import { Button, Photo } from '../components/ui'
import { Logo } from '../components/Logo'

export async function resizeImage(file: File, max = 640): Promise<string> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image()
      i.onload = () => res(i)
      i.onerror = rej
      i.src = url
    })
    const scale = Math.min(1, max / Math.max(img.width, img.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.width * scale)
    canvas.height = Math.round(img.height * scale)
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', 0.82)
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function PhotoPicker({ value, name, onChange }: { value: string | null; name: string; onChange: (v: string | null) => void }) {
  const input = useRef<HTMLInputElement>(null)
  return (
    <div className="flex flex-col items-center gap-3">
      <button onClick={() => input.current?.click()} className="group relative h-56 w-44 overflow-hidden rounded-3xl ring-2 ring-dashed ring-white/20">
        {value ? (
          <Photo src={value} name={name || '?'} className="h-full w-full" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-white/5 text-white/50">
            <Camera className="h-8 w-8" />
            <span className="text-sm">Add a photo</span>
          </div>
        )}
        <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/60 to-transparent pb-3 opacity-0 transition group-hover:opacity-100">
          <span className="text-xs font-semibold">Change</span>
        </div>
      </button>
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0]
          if (f) onChange(await resizeImage(f))
          e.target.value = ''
        }}
      />
      {value && (
        <button onClick={() => onChange(null)} className="text-xs text-white/50 underline">
          Remove photo
        </button>
      )}
    </div>
  )
}

const field = 'w-full rounded-2xl bg-white/5 px-4 py-3 text-[15px] outline-none ring-1 ring-white/10 placeholder:text-white/30 focus:ring-2 focus:ring-brand/60'

export function Segmented<T extends string>({ options, value, onChange }: { options: { v: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex gap-1 rounded-2xl bg-white/5 p-1 ring-1 ring-white/10">
      {options.map((o) => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition ${value === o.v ? 'bg-white text-ink-950' : 'text-white/60 hover:text-white'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function InterestPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {ALL_INTERESTS.map((i) => {
        const on = value.includes(i)
        return (
          <button
            key={i}
            onClick={() => onChange(on ? value.filter((x) => x !== i) : value.length >= 5 ? value : [...value, i])}
            className={`rounded-full px-3 py-1.5 text-sm transition ${on ? 'grad-brand font-semibold text-white' : 'bg-white/5 text-white/70 ring-1 ring-white/10 hover:bg-white/10'}`}
          >
            {i}
          </button>
        )
      })}
    </div>
  )
}

export function Label({ children }: { children: React.ReactNode }) {
  return <div className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wider text-white/45">{children}</div>
}

export default function Onboarding() {
  const complete = useStore((s) => s.completeOnboarding)
  const [step, setStep] = useState(0)
  const [u, setU] = useState<UserProfile>({
    name: '',
    age: 25,
    gender: 'man',
    showMe: 'women',
    bio: '',
    job: '',
    school: '',
    photo: null,
    interests: [],
    prompt: { q: ALL_PROMPTS[0], a: '' },
  })
  const patch = (p: Partial<UserProfile>) => setU((x) => ({ ...x, ...p }))
  const canNext = [true, u.name.trim().length > 0 && u.age >= 18 && u.age <= 99, true, u.interests.length >= 1, true][step]

  const steps = [
    <div key="0" className="flex h-full flex-col items-center justify-center text-center">
      <Logo className="h-20 w-20" />
      <h1 className="mt-6 text-4xl font-black tracking-tight">
        IQ<span className="text-grad">upid</span>
      </h1>
      <p className="mt-3 max-w-xs text-white/60">Dating for people who are easy on the eyes and quick on their feet.</p>
      <div className="mt-10 w-full space-y-3 text-left">
        {[
          { icon: <Flame className="h-5 w-5 text-brand" />, t: 'Hidden Looks Elo', d: 'Every swipe on you is a rated "game". Likes from sought-after people count more.' },
          { icon: <Brain className="h-5 w-5 text-violet-400" />, t: 'Estimated IQ', d: 'Play 4 daily brain games. Beat the field and your estimate climbs.' },
          { icon: <Sparkles className="h-5 w-5 text-cyan-300" />, t: 'Double-bracket matching', d: 'You only see people in your IQ range and your looks range.' },
        ].map((x) => (
          <div key={x.t} className="flex gap-3 rounded-2xl bg-white/5 p-4 ring-1 ring-white/5">
            <div className="mt-0.5">{x.icon}</div>
            <div>
              <div className="font-semibold">{x.t}</div>
              <div className="text-sm text-white/55">{x.d}</div>
            </div>
          </div>
        ))}
      </div>
    </div>,

    <div key="1">
      <h2 className="text-3xl font-bold">The basics</h2>
      <Label>First name</Label>
      <input autoFocus className={field} placeholder="Your name" value={u.name} maxLength={20} onChange={(e) => patch({ name: e.target.value })} />
      <Label>Age</Label>
      <input className={field} type="number" min={18} max={99} value={u.age} onChange={(e) => patch({ age: +e.target.value })} />
      <Label>I am a</Label>
      <Segmented<Gender>
        options={[
          { v: 'man', label: 'Man' },
          { v: 'woman', label: 'Woman' },
          { v: 'nonbinary', label: 'Non-binary' },
        ]}
        value={u.gender}
        onChange={(gender) => patch({ gender })}
      />
      <Label>Show me</Label>
      <Segmented<ShowMe>
        options={[
          { v: 'women', label: 'Women' },
          { v: 'men', label: 'Men' },
          { v: 'everyone', label: 'Everyone' },
        ]}
        value={u.showMe}
        onChange={(showMe) => patch({ showMe })}
      />
    </div>,

    <div key="2" className="text-center">
      <h2 className="text-3xl font-bold">Add a photo</h2>
      <p className="mx-auto mt-2 mb-8 max-w-xs text-sm text-white/55">Profiles with a photo do much better in the looks algorithm. It stays on your device.</p>
      <PhotoPicker value={u.photo} name={u.name} onChange={(photo) => patch({ photo })} />
    </div>,

    <div key="3">
      <h2 className="text-3xl font-bold">About you</h2>
      <Label>Bio</Label>
      <textarea className={`${field} h-24 resize-none`} maxLength={200} placeholder="Something that makes people swipe right…" value={u.bio} onChange={(e) => patch({ bio: e.target.value })} />
      <div className="mt-3 grid grid-cols-2 gap-2">
        <input className={field} placeholder="Job" value={u.job} onChange={(e) => patch({ job: e.target.value })} />
        <input className={field} placeholder="School" value={u.school} onChange={(e) => patch({ school: e.target.value })} />
      </div>
      <Label>Interests ({u.interests.length}/5)</Label>
      <InterestPicker value={u.interests} onChange={(interests) => patch({ interests })} />
      <Label>Prompt</Label>
      <select className={field} value={u.prompt.q} onChange={(e) => patch({ prompt: { ...u.prompt, q: e.target.value } })}>
        {ALL_PROMPTS.map((q) => (
          <option key={q} value={q} className="bg-ink-900">
            {q}
          </option>
        ))}
      </select>
      <input className={`${field} mt-2`} placeholder="Your answer" maxLength={120} value={u.prompt.a} onChange={(e) => patch({ prompt: { ...u.prompt, a: e.target.value } })} />
    </div>,

    <div key="4" className="flex h-full flex-col items-center justify-center text-center">
      <div className="text-6xl">🧠💘</div>
      <h2 className="mt-6 text-3xl font-bold">You're in, {u.name || 'friend'}.</h2>
      <p className="mt-3 max-w-xs text-white/60">Everyone starts at the same place. The algorithm will figure out the rest.</p>
      <div className="mt-8 grid w-full grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
          <div className="text-xs uppercase tracking-wider text-white/45">Est. IQ</div>
          <div className="text-grad-brain text-3xl font-black">100</div>
          <div className="text-xs text-white/45">unverified</div>
        </div>
        <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
          <div className="text-xs uppercase tracking-wider text-white/45">Looks Elo</div>
          <div className="text-grad text-3xl font-black">1200</div>
          <div className="text-xs text-white/45">provisional</div>
        </div>
      </div>
      <p className="mt-6 text-sm text-white/45">Tip: play today's dailies to calibrate your IQ bracket.</p>
    </div>,
  ]

  return (
    <div className="flex h-full flex-col px-6 pt-6 pb-6">
      <div className="flex h-10 items-center gap-3">
        {step > 0 && (
          <button onClick={() => setStep(step - 1)} className="rounded-full p-2 hover:bg-white/10" aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        {step > 0 && (
          <div className="flex flex-1 gap-1.5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={`h-1 flex-1 rounded-full transition ${i <= step ? 'grad-brand' : 'bg-white/10'}`} />
            ))}
          </div>
        )}
      </div>
      <div className="relative min-h-0 flex-1 overflow-y-auto no-scrollbar py-4">
        <AnimatePresence mode="wait">
          <motion.div key={step} className="h-full" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.2 }}>
            {steps[step]}
          </motion.div>
        </AnimatePresence>
      </div>
      <Button className="w-full py-4 text-base" disabled={!canNext} onClick={() => (step < 4 ? setStep(step + 1) : complete(u))}>
        {step === 0 ? 'Create my profile' : step === 2 && !u.photo ? 'Skip for now' : step === 4 ? 'Start swiping' : 'Continue'}
      </Button>
    </div>
  )
}
