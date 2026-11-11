import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Delete } from 'lucide-react'
import { generateMath } from './generators'
import type { GameProps } from './types'

const DURATION = 90

export default function MentalMath({ seed, onSolved, startedAt }: GameProps) {
  const questions = useMemo(() => generateMath(seed), [seed])
  const [idx, setIdx] = useState(0)
  const [value, setValue] = useState('')
  const [left, setLeft] = useState(() => Math.max(0, DURATION - Math.floor((Date.now() - startedAt) / 1000)))
  const [flash, setFlash] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const scoreRef = useRef(0)
  const finished = useRef(false)
  const solvedRef = useRef(onSolved)
  solvedRef.current = onSolved
  const isTouch = typeof window !== 'undefined' && matchMedia('(pointer: coarse)').matches

  useEffect(() => {
    const id = setInterval(() => {
      const remaining = Math.max(0, DURATION - Math.floor((Date.now() - startedAt) / 1000))
      setLeft(remaining)
      if (remaining === 0 && !finished.current) {
        finished.current = true
        clearInterval(id)
        solvedRef.current(scoreRef.current)
      }
    }, 200)
    return () => clearInterval(id)
  }, [startedAt])

  const q = questions[idx % questions.length]

  const change = (v: string) => {
    if (finished.current) return
    const clean = v.replace(/[^0-9]/g, '').slice(0, 5)
    if (clean !== '' && +clean === q.answer) {
      scoreRef.current++
      setIdx((i) => i + 1)
      setValue('')
      setFlash(true)
      setTimeout(() => setFlash(false), 150)
    } else setValue(clean)
  }

  const pct = left / DURATION

  return (
    <div className="flex flex-col items-center">
      <div className="flex w-full max-w-[380px] items-center justify-between text-sm">
        <span className="font-semibold text-white/60">
          Score <span className="text-xl font-black text-white tabular-nums">{scoreRef.current}</span>
        </span>
        <span className={`text-xl font-black tabular-nums ${left <= 10 ? 'text-rose-400' : ''}`}>{left}s</span>
      </div>
      <div className="mt-2 h-1.5 w-full max-w-[380px] overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-[width] duration-200" style={{ width: `${pct * 100}%` }} />
      </div>

      <div className={`mt-8 flex h-36 w-full max-w-[380px] items-center justify-center rounded-3xl ring-1 transition-colors ${flash ? 'bg-emerald-500/20 ring-emerald-400/50' : 'bg-white/5 ring-white/10'}`}>
        <AnimatePresence mode="popLayout">
          <motion.div key={idx} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }} transition={{ duration: 0.12 }} className="text-5xl font-black tabular-nums">
            {q.text}
          </motion.div>
        </AnimatePresence>
      </div>

      <input
        ref={input}
        autoFocus={!isTouch}
        readOnly={isTouch}
        inputMode="numeric"
        value={value}
        onChange={(e) => change(e.target.value)}
        onBlur={() => !isTouch && setTimeout(() => input.current?.focus(), 0)}
        placeholder="="
        className="mt-4 w-full max-w-[380px] rounded-2xl bg-white/5 py-4 text-center text-3xl font-bold tabular-nums outline-none ring-2 ring-violet-500/40 placeholder:text-white/20 focus:ring-violet-400"
      />

      {isTouch ? (
        <div className="mt-4 grid w-full max-w-[380px] grid-cols-3 gap-2">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((k) => (
            <button
              key={k}
              onClick={() => change(k === 'C' ? '' : k === '⌫' ? value.slice(0, -1) : value + k)}
              className="flex h-14 items-center justify-center rounded-2xl bg-white/8 text-2xl font-bold ring-1 ring-white/10 active:bg-white/20"
            >
              {k === '⌫' ? <Delete className="h-6 w-6" /> : k}
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-4 max-w-xs text-center text-xs text-white/45">Type the answer — it advances automatically when correct. As many as you can in {DURATION} seconds.</p>
      )}
    </div>
  )
}
