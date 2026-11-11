import { useState } from 'react'
import { Brain, Check, Eye, EyeOff, Flame, Pencil, RotateCcw, Users } from 'lucide-react'
import { useStore } from '../store'
import { BRACKET, STARTING_ELO, iqLearningRate, iqTier, looksK, looksTier, profileCompleteness } from '../lib/engine'
import { iqToPercentile } from '../lib/stats'
import { ALL_PROMPTS } from '../data/profiles'
import type { ShowMe, UserProfile } from '../lib/types'
import { Button, Photo, Sheet, Sparkline, Stat } from '../components/ui'
import { InterestPicker, Label, PhotoPicker, Segmented } from './Onboarding'

const field = 'w-full rounded-2xl bg-white/5 px-4 py-3 text-[15px] outline-none ring-1 ring-white/10 placeholder:text-white/30 focus:ring-2 focus:ring-brand/60'

export default function Profile() {
  const s = useStore()
  const user = s.user!
  const [editing, setEditing] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const { parts, score } = profileCompleteness(user)
  const tier = looksTier(s.looksElo)
  const likeRate = s.impressions ? Math.round((s.likesReceived / s.impressions) * 100) : 0
  const pct = iqToPercentile(s.iq)

  return (
    <div className="h-full overflow-y-auto no-scrollbar px-5 pb-8">
      <div className="flex flex-col items-center pt-2">
        <div className="relative">
          <div className="rounded-full bg-gradient-to-br from-brand to-brain p-[3px]">
            <Photo src={user.photo} name={user.name} className="h-28 w-28 rounded-full ring-4 ring-ink-900" rounded="rounded-full" />
          </div>
          <button onClick={() => setEditing(true)} className="absolute right-0 bottom-0 rounded-full bg-white p-2 text-ink-950 shadow-lg" aria-label="Edit profile">
            <Pencil className="h-4 w-4" />
          </button>
        </div>
        <h2 className="mt-3 text-2xl font-extrabold">
          {user.name}, <span className="font-light">{user.age}</span>
        </h2>
        <div className="text-sm text-white/50">{[user.job, user.school].filter(Boolean).join(' · ') || 'Add your job & school'}</div>
      </div>

      {/* IQ */}
      <section className="mt-6 overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600/25 to-cyan-500/10 p-4 ring-1 ring-violet-400/20">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-violet-200/70">
              <Brain className="h-3.5 w-3.5" /> Estimated IQ
            </div>
            <div className="text-grad-brain text-4xl font-black tabular-nums">{s.iq.toFixed(1)}</div>
            <div className="text-sm text-white/60">
              {iqTier(s.iq)} · smarter than {Math.round(pct * 100)}% of people
            </div>
          </div>
          <div className="text-right text-xs text-white/45">
            <div>{s.iqGames} games played</div>
            <div>confidence {s.iqGames < 4 ? 'low' : s.iqGames < 16 ? 'medium' : 'high'}</div>
          </div>
        </div>
        <Sparkline data={s.iqHistory} color="#a78bfa" className="mt-3" />
        <div className="mt-1 text-xs text-white/40">
          Each daily moves your estimate {Math.round(iqLearningRate(s.iqGames) * 100)}% of the way toward your performance that game.
        </div>
      </section>

      {/* Looks */}
      <section className="mt-3 overflow-hidden rounded-3xl bg-gradient-to-br from-brand/20 to-orange-400/5 p-4 ring-1 ring-brand/20">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-pink-200/70">
              <Flame className="h-3.5 w-3.5" /> Looks Elo {!s.xray && '(hidden)'}
            </div>
            {s.xray ? (
              <>
                <div className="text-grad text-4xl font-black tabular-nums">{Math.round(s.looksElo)}</div>
                <div className={`text-sm ${tier.color}`}>
                  {tier.label} · {s.looksElo >= STARTING_ELO ? '+' : ''}
                  {Math.round(s.looksElo - STARTING_ELO)} since joining
                </div>
              </>
            ) : (
              <>
                <div className="select-none text-4xl font-black text-white/30 blur-md">1234</div>
                <div className="text-sm text-white/50">Like on Tinder, this score is secret.</div>
              </>
            )}
          </div>
          <button
            onClick={s.toggleXray}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition ${s.xray ? 'bg-brand text-white ring-brand' : 'bg-white/5 text-white/70 ring-white/15'}`}
          >
            {s.xray ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />} X-ray
          </button>
        </div>
        {s.xray && <Sparkline data={s.looksHistory} color="#ff4f7b" className="mt-3" />}
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Stat label="Seen by" value={s.impressions} sub="people" />
          <Stat label="Like rate" value={`${likeRate}%`} />
          <Stat label="K-factor" value={Math.round(looksK(s.impressions))} sub={s.impressions < 30 ? 'provisional' : 'settled'} />
        </div>
        <p className="mt-3 text-xs leading-relaxed text-white/45">
          Every time someone swipes on you it's scored like a chess game against them. A like from someone rated above you is a big win; a pass from someone rated below you is a big loss.
          Your bracket covers ±{BRACKET.looks} Elo and ±{BRACKET.iq} IQ.
        </p>
      </section>

      {/* Completeness */}
      <section className="mt-3 rounded-3xl bg-white/5 p-4 ring-1 ring-white/10">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">Profile strength</div>
          <div className="text-sm font-bold text-emerald-300">{score}%</div>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 transition-all" style={{ width: `${score}%` }} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-1.5">
          {parts.map((p) => (
            <div key={p.label} className={`flex items-center gap-1.5 text-xs ${p.done ? 'text-white/80' : 'text-white/35'}`}>
              <Check className={`h-3.5 w-3.5 ${p.done ? 'text-emerald-400' : 'text-white/20'}`} /> {p.label}
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-white/40">Complete profiles get liked more, which quietly lifts your looks Elo.</p>
      </section>

      <section className="mt-3 rounded-3xl bg-white/5 p-4 ring-1 ring-white/10">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Users className="h-4 w-4" /> Activity
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Stat label="Swipes" value={Object.keys(s.swipes).length} />
          <Stat label="Matches" value={s.matches.length} />
          <Stat label="Likes you" value={Object.keys(s.likedYou).length} />
        </div>
      </section>

      <div className="mt-6 flex flex-col gap-2">
        <Button variant="ghost" onClick={() => setEditing(true)}>
          Edit profile
        </Button>
        <Button variant="danger" onClick={() => setConfirmReset(true)}>
          <span className="inline-flex items-center gap-2">
            <RotateCcw className="h-4 w-4" /> Reset account
          </span>
        </Button>
      </div>

      <Sheet open={editing} onClose={() => setEditing(false)}>
        <EditProfile initial={user} onDone={() => setEditing(false)} />
      </Sheet>
      <Sheet open={confirmReset} onClose={() => setConfirmReset(false)}>
        <div className="p-6 pb-10 text-center">
          <h3 className="text-xl font-bold">Start over?</h3>
          <p className="mt-2 text-sm text-white/55">This deletes your profile, scores, matches and daily results from this device.</p>
          <div className="mt-6 flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => setConfirmReset(false)}>
              Cancel
            </Button>
            <Button variant="danger" className="flex-1" onClick={s.resetAll}>
              Reset
            </Button>
          </div>
        </div>
      </Sheet>
    </div>
  )
}

function EditProfile({ initial, onDone }: { initial: UserProfile; onDone: () => void }) {
  const update = useStore((s) => s.updateUser)
  const [u, setU] = useState(initial)
  const patch = (p: Partial<UserProfile>) => setU((x) => ({ ...x, ...p }))
  return (
    <div className="p-6 pb-10">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold">Edit profile</h3>
        <Button
          className="px-4 py-2"
          onClick={() => {
            update(u)
            onDone()
          }}
        >
          Save
        </Button>
      </div>
      <div className="mt-5">
        <PhotoPicker value={u.photo} name={u.name} onChange={(photo) => patch({ photo })} />
      </div>
      <Label>Name</Label>
      <input className={field} value={u.name} maxLength={20} onChange={(e) => patch({ name: e.target.value })} />
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
      <Label>Bio</Label>
      <textarea className={`${field} h-24 resize-none`} maxLength={200} value={u.bio} onChange={(e) => patch({ bio: e.target.value })} />
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
    </div>
  )
}
