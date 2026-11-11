import { useEffect, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Brain, Flame, MessageCircle, User } from 'lucide-react'
import { useStore, type Tab } from './store'
import { todayKey } from './lib/rng'
import { GAMES } from './lib/engine'
import { Logo } from './components/Logo'
import { MatchModal } from './components/MatchModal'
import Onboarding from './screens/Onboarding'
import Discover from './screens/Discover'
import Dailies from './screens/Dailies'
import Matches from './screens/Matches'
import Profile from './screens/Profile'

function Frame({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-[100dvh] w-full items-center justify-center sm:p-6">
      <div className="relative flex h-full w-full max-w-[440px] flex-col overflow-hidden bg-ink-900 sm:h-[min(900px,100%)] sm:rounded-[40px] sm:shadow-2xl sm:shadow-black/70 sm:ring-1 sm:ring-white/10">
        {children}
      </div>
    </div>
  )
}

export default function App() {
  const user = useStore((s) => s.user)
  const tab = useStore((s) => s.tab)
  const dailyTick = useStore((s) => s.dailyTick)
  const simulateImpressions = useStore((s) => s.simulateImpressions)

  useEffect(() => {
    if (!user) return
    dailyTick()
    // Other people keep swiping on you in the background while you use the app.
    const id = setInterval(() => {
      dailyTick()
      simulateImpressions(1)
    }, 40_000)
    return () => clearInterval(id)
  }, [!!user]) // eslint-disable-line

  if (!user)
    return (
      <Frame>
        <Onboarding />
      </Frame>
    )

  const screens: Record<Tab, ReactNode> = {
    discover: <Discover />,
    dailies: <Dailies />,
    matches: <Matches />,
    profile: <Profile />,
  }

  return (
    <Frame>
      <Header />
      <main className="relative min-h-0 flex-1">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            className="absolute inset-0"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.16 }}
          >
            {screens[tab]}
          </motion.div>
        </AnimatePresence>
      </main>
      <BottomNav />
      <MatchModal />
      <Toast />
    </Frame>
  )
}

function Header() {
  const iq = useStore((s) => s.iq)
  const setTab = useStore((s) => s.setTab)
  return (
    <header className="flex h-14 shrink-0 items-center justify-between px-5">
      <button onClick={() => setTab('discover')} className="flex items-center gap-2">
        <Logo className="h-7 w-7" />
        <span className="text-xl font-black tracking-tight">
          IQ<span className="text-grad">upid</span>
        </span>
      </button>
      <button onClick={() => setTab('dailies')} className="flex items-center gap-1.5 rounded-full bg-violet-500/15 px-3 py-1.5 text-sm font-bold text-violet-200 ring-1 ring-violet-400/30">
        <Brain className="h-4 w-4" />
        <span className="tabular-nums">{iq.toFixed(1)}</span>
      </button>
    </header>
  )
}

function BottomNav() {
  const tab = useStore((s) => s.tab)
  const setTab = useStore((s) => s.setTab)
  const unread = useStore((s) => s.matches.reduce((n, m) => n + m.unread + (m.messages.length === 0 ? 1 : 0), 0))
  const dailiesLeft = useStore((s) => GAMES.filter((g) => !s.dailies[todayKey()]?.[g.id]).length)
  const items: { id: Tab; icon: typeof Flame; label: string; badge?: number }[] = [
    { id: 'discover', icon: Flame, label: 'Discover' },
    { id: 'dailies', icon: Brain, label: 'Dailies', badge: dailiesLeft },
    { id: 'matches', icon: MessageCircle, label: 'Matches', badge: unread },
    { id: 'profile', icon: User, label: 'Profile' },
  ]
  return (
    <nav className="flex shrink-0 border-t border-white/5 bg-ink-900/95 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur">
      {items.map(({ id, icon: Icon, label, badge }) => {
        const active = tab === id
        return (
          <button key={id} onClick={() => setTab(id)} className="relative flex flex-1 flex-col items-center gap-0.5 py-1">
            <Icon className={`h-6 w-6 transition ${active ? (id === 'dailies' ? 'text-violet-400' : 'text-brand') : 'text-white/35'}`} fill={active && id !== 'dailies' && id !== 'profile' ? 'currentColor' : 'none'} />
            <span className={`text-[10px] font-semibold ${active ? 'text-white' : 'text-white/35'}`}>{label}</span>
            {!!badge && (
              <span className={`absolute top-0 right-[calc(50%-20px)] flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white ${id === 'dailies' ? 'bg-violet-500' : 'bg-brand'}`}>
                {badge}
              </span>
            )}
          </button>
        )
      })}
    </nav>
  )
}

function Toast() {
  const toast = useStore((s) => s.toast)
  const showToast = useStore((s) => s.showToast)
  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => showToast(null), 2200)
    return () => clearTimeout(id)
  }, [toast, showToast])
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="absolute top-16 left-1/2 z-50 -translate-x-1/2 rounded-full bg-white px-4 py-2 text-sm font-semibold whitespace-nowrap text-ink-950 shadow-xl"
        >
          {toast}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
