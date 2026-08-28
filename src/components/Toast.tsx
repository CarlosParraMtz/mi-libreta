import { AnimatePresence, motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { useAtom } from 'jotai'
import { useEffect } from 'react'
import { toastAtom } from '../state/store'

export function Toast() {
  const [message, setMessage] = useAtom(toastAtom)
  useEffect(() => {
    if (!message) return
    const timer = window.setTimeout(() => setMessage(null), 2600)
    return () => window.clearTimeout(timer)
  }, [message, setMessage])
  return (
    <AnimatePresence>{message && <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="fixed left-1/2 top-5 z-[80] flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-ink px-4 py-3 text-sm font-bold text-white shadow-card"><Check size={18} className="text-lime" />{message}</motion.div>}</AnimatePresence>
  )
}
