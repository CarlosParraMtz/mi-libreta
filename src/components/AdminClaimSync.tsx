import { onAuthStateChanged } from 'firebase/auth'
import { useSetAtom } from 'jotai'
import { useEffect } from 'react'
import { auth } from '../lib/firebase'
import { syncSession } from '../lib/session-routing'
import { adminClaimStatusAtom, adminClaimUserIdAtom, isPlatformAdminAtom } from '../state/store'

export function AdminClaimSync() {
  const setIsAdmin = useSetAtom(isPlatformAdminAtom)
  const setStatus = useSetAtom(adminClaimStatusAtom)
  const setClaimUserId = useSetAtom(adminClaimUserIdAtom)
  useEffect(() => {
    if (!auth) { setIsAdmin(false); setClaimUserId(null); setStatus('ready'); return }
    let requestId = 0
    return onAuthStateChanged(auth, async (user) => {
      const currentRequest = ++requestId
      setIsAdmin(false)
      setClaimUserId(null)
      if (!user) { setStatus('ready'); return }
      setStatus('loading')
      const { isAdmin } = await syncSession(user).catch(() => ({ isAdmin: false }))
      if (currentRequest !== requestId) return
      setIsAdmin(isAdmin)
      setClaimUserId(user.uid)
      setStatus('ready')
    })
  }, [setClaimUserId, setIsAdmin, setStatus])
  return null
}
