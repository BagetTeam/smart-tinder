import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Send } from 'lucide-react'
import { PROFILE_BY_ID } from '../data/profiles'
import { useStore } from '../store'
import { Photo } from './ui'

export function MatchModal() {
  const id = useStore((s) => s.newMatch)
  const user = useStore((s) => s.user)
  const dismiss = useStore((s) => s.dismissMatch)
  const send = useStore((s) => s.sendMessage)
  const setTab = useStore((s) => s.setTab)
  const setOpenChat = useStore((s) => s.setOpenChat)
  const [text, setText] = useState('')
  const p = id ? PROFILE_BY_ID[id] : null

  const submit = () => {
    if (!p) return
    if (text.trim()) {
      send(p.id, text.trim())
      setTab('matches')
      setOpenChat(p.id)
    }
    setText('')
    dismiss()
  }

  return (
    <AnimatePresence>
      {p && user && (
        <motion.div
          className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-brand/40 via-ink-950/95 to-ink-950 px-6 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.h2
            initial={{ scale: 0.4, rotate: -8, opacity: 0 }}
            animate={{ scale: 1, rotate: -4, opacity: 1 }}
            transition={{ type: 'spring', damping: 10, stiffness: 160, delay: 0.1 }}
            className="text-grad text-center text-5xl leading-tight font-black italic"
          >
            It's a Match!
          </motion.h2>
          <p className="mt-3 text-center text-white/70">You and {p.name} liked each other — and you're in the same bracket.</p>
          <div className="mt-10 flex items-center">
            <motion.div initial={{ x: -80, rotate: -20, opacity: 0 }} animate={{ x: 12, rotate: -8, opacity: 1 }} transition={{ type: 'spring', delay: 0.2 }}>
              <Photo src={user.photo} name={user.name} className="h-40 w-32 rounded-3xl ring-4 ring-white" rounded="rounded-3xl" />
            </motion.div>
            <motion.div initial={{ x: 80, rotate: 20, opacity: 0 }} animate={{ x: -12, rotate: 8, opacity: 1 }} transition={{ type: 'spring', delay: 0.25 }}>
              <Photo src={p.photo} name={p.name} className="h-40 w-32 rounded-3xl ring-4 ring-white" rounded="rounded-3xl" />
            </motion.div>
          </div>
          <div className="mt-10 flex w-full items-center gap-2 rounded-full bg-white/10 p-1.5 pl-4 ring-1 ring-white/15">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              placeholder={`Say something nice to ${p.name}…`}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-white/40"
            />
            <button onClick={submit} disabled={!text.trim()} className="grad-brand rounded-full p-2.5 disabled:opacity-40" aria-label="Send">
              <Send className="h-4 w-4" />
            </button>
          </div>
          <button onClick={dismiss} className="mt-5 text-sm font-semibold text-white/60 hover:text-white">
            Keep swiping
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
