import { useEffect, useState } from 'react'

export function useDeadlineClock(deadline?: string) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!deadline) return
    const remaining = new Date(deadline).getTime() - now
    if (remaining <= 0) return
    const timer = window.setTimeout(() => setNow(Date.now()), Math.min(remaining + 50, 2_147_483_647))
    return () => window.clearTimeout(timer)
  }, [deadline, now])
  return now
}
