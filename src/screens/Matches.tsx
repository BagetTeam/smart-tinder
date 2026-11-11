import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, Brain, Heart, Send } from 'lucide-react'
import { PROFILE_BY_ID } from '../data/profiles'
import { profileLooks, useStore } from '../store'
import { ProfileDetail } from '../components/ProfileDetail'
import { Photo, Sheet } from '../components/ui'

function ago(t: number) {
  const s = Math.floor((Date.now() - t) / 1000)
  if (s < 60) return 'now'
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}d`
}

export default function Matches() {
  const matches = useStore((s) => s.matches)
  const likedYou = useStore((s) => s.likedYou)
  const openChat = useStore((s) => s.openChat)
  const setOpenChat = useStore((s) => s.setOpenChat)
  const setTab = useStore((s) => s.setTab)
  const fresh = matches.filter((m) => m.messages.length === 0)
  const convos = matches.filter((m) => m.messages.length > 0).sort((a, b) => b.messages[b.messages.length - 1].at - a.messages[a.messages.length - 1].at)
  const likeIds = Object.keys(likedYou)

  return (
    <div className="relative h-full overflow-y-auto no-scrollbar pb-6">
      <div className="px-5">
        <h2 className="mb-3 text-sm font-bold text-brand">New matches</h2>
        <div className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-2 no-scrollbar">
          <button onClick={() => setTab('discover')} className="flex w-20 shrink-0 flex-col items-center gap-1.5">
            <div className="relative h-28 w-20 overflow-hidden rounded-xl bg-gradient-to-br from-amber-400 to-pink-500 p-[2px]">
              <div className="flex h-full w-full flex-col items-center justify-center rounded-[10px] bg-ink-900/80">
                <Heart className="h-6 w-6 text-amber-300" fill="currentColor" />
                <span className="mt-1 text-lg font-black">{likeIds.length}</span>
              </div>
            </div>
            <span className="text-xs font-semibold">Likes you</span>
          </button>
          {fresh.map((m) => {
            const p = PROFILE_BY_ID[m.profileId]
            return (
              <button key={m.profileId} onClick={() => setOpenChat(m.profileId)} className="flex w-20 shrink-0 flex-col items-center gap-1.5">
                <div className={`relative h-28 w-20 overflow-hidden rounded-xl ${m.superLiked ? 'ring-2 ring-sky-400' : ''}`}>
                  <Photo src={p.photo} name={p.name} className="h-full w-full" />
                  <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-brand ring-2 ring-ink-900" />
                </div>
                <span className="w-full truncate text-xs font-semibold">{p.name}</span>
              </button>
            )
          })}
          {fresh.length === 0 && <div className="flex items-center text-sm text-white/40">Matches appear here. Keep swiping!</div>}
        </div>
        {likeIds.length > 0 && (
          <p className="mt-1 text-xs text-white/40">
            {likeIds.length} {likeIds.length === 1 ? 'person has' : 'people have'} already liked you. Find them in Discover — swiping right on them is an instant match.
          </p>
        )}

        <h2 className="mt-6 mb-2 text-sm font-bold text-brand">Messages</h2>
        {convos.length === 0 && <div className="py-8 text-center text-sm text-white/40">No conversations yet. Say hi to a new match!</div>}
        <div className="-mx-2">
          {convos.map((m) => {
            const p = PROFILE_BY_ID[m.profileId]
            const last = m.messages[m.messages.length - 1]
            return (
              <button key={m.profileId} onClick={() => setOpenChat(m.profileId)} className="flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left hover:bg-white/5">
                <Photo src={p.photo} name={p.name} className="h-14 w-14 shrink-0 rounded-full" rounded="rounded-full" />
                <div className="min-w-0 flex-1 border-b border-white/5 pb-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{p.name}</span>
                    <span className="text-xs text-white/35">{ago(last.at)}</span>
                  </div>
                  <div className={`truncate text-sm ${m.unread ? 'font-semibold text-white' : 'text-white/50'}`}>
                    {last.from === 'me' ? 'You: ' : ''}
                    {last.text}
                  </div>
                </div>
                {m.unread > 0 && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-brand" />}
              </button>
            )
          })}
        </div>
      </div>

      <AnimatePresence>
        {openChat && (
          <motion.div
            className="absolute inset-0 z-30 bg-ink-900"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
          >
            <Chat profileId={openChat} onBack={() => setOpenChat(null)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Chat({ profileId, onBack }: { profileId: string; onBack: () => void }) {
  const p = PROFILE_BY_ID[profileId]
  const match = useStore((s) => s.matches.find((m) => m.profileId === profileId))
  const send = useStore((s) => s.sendMessage)
  const markRead = useStore((s) => s.markRead)
  const xray = useStore((s) => s.xray)
  const looks = useStore((s) => profileLooks(s, p))
  const interests = useStore((s) => s.user?.interests ?? [])
  const [text, setText] = useState('')
  const [info, setInfo] = useState(false)
  const end = useRef<HTMLDivElement>(null)
  const msgs = match?.messages ?? []
  const typing = useStore((s) => !!s.typing[profileId])

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth' })
    if (match?.unread) markRead(profileId)
  }, [msgs.length, typing]) // eslint-disable-line

  const submit = () => {
    if (!text.trim()) return
    send(profileId, text.trim())
    setText('')
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-white/5 px-3 py-2">
        <button onClick={onBack} className="rounded-full p-2 hover:bg-white/10" aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <button onClick={() => setInfo(true)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <Photo src={p.photo} name={p.name} className="h-10 w-10 rounded-full" rounded="rounded-full" />
          <div className="min-w-0">
            <div className="font-semibold">{p.name}</div>
            <div className="flex items-center gap-1 text-xs text-violet-300">
              <Brain className="h-3 w-3" /> IQ {p.iq} · {p.job}
            </div>
          </div>
        </button>
      </div>
      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-4 py-4 no-scrollbar">
        <div className="mb-6 flex flex-col items-center text-center">
          <Photo src={p.photo} name={p.name} className="h-20 w-20 rounded-full" rounded="rounded-full" />
          <div className="mt-2 text-sm text-white/50">You matched with {p.name} {match ? new Date(match.createdAt).toLocaleDateString() : ''}</div>
        </div>
        {msgs.map((m, i) => {
          const mine = m.from === 'me'
          const nextSame = msgs[i + 1]?.from === m.from
          return (
            <motion.div key={m.id} initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[78%] px-4 py-2 text-[15px] leading-snug ${
                  mine ? `grad-brand text-white ${nextSame ? 'rounded-3xl rounded-br-lg' : 'rounded-3xl rounded-br-md'}` : `bg-white/10 ${nextSame ? 'rounded-3xl rounded-bl-lg' : 'rounded-3xl rounded-bl-md'}`
                }`}
              >
                {m.text}
              </div>
            </motion.div>
          )
        })}
        {typing && (
          <div className="flex justify-start pt-1">
            <div className="flex gap-1 rounded-3xl rounded-bl-md bg-white/10 px-4 py-3">
              {[0, 1, 2].map((i) => (
                <motion.span key={i} className="h-1.5 w-1.5 rounded-full bg-white/60" animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.9, delay: i * 0.15 }} />
              ))}
            </div>
          </div>
        )}
        <div ref={end} />
      </div>
      {msgs.length === 0 && (
        <div className="flex gap-2 overflow-x-auto px-4 pb-2 no-scrollbar">
          {[`Hey ${p.name}! 👋`, `IQ ${p.iq}, impressive 😏`, `Did you do today's Crowns?`, `${p.interests[0]}? Tell me more`].map((s) => (
            <button key={s} onClick={() => send(profileId, s)} className="shrink-0 rounded-full bg-white/5 px-3 py-1.5 text-sm ring-1 ring-white/10 hover:bg-white/10">
              {s}
            </button>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2 border-t border-white/5 p-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Type a message"
          className="min-w-0 flex-1 rounded-full bg-white/5 px-4 py-2.5 text-[15px] outline-none ring-1 ring-white/10 placeholder:text-white/35 focus:ring-brand/50"
        />
        <button onClick={submit} disabled={!text.trim()} className="grad-brand rounded-full p-3 transition active:scale-90 disabled:opacity-30" aria-label="Send">
          <Send className="h-4 w-4" />
        </button>
      </div>
      <Sheet open={info} onClose={() => setInfo(false)}>
        <ProfileDetail profile={p} onClose={() => setInfo(false)} looks={looks} xray={xray} shared={p.interests.filter((i) => interests.includes(i))} />
      </Sheet>
    </div>
  )
}
