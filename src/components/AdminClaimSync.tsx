import { onAuthStateChanged } from 'firebase/auth'
import { useSetAtom } from 'jotai'
import { useEffect } from 'react'
import { auth } from '../lib/firebase'
import { syncSession } from '../lib/session-routing'
import { adminClaimStatusAtom, isPlatformAdminAtom } from '../state/store'

export function AdminClaimSync() {
  const setIsAdmin = useSetAtom(isPlatformAdminAtom)
  const setStatus = useSetAtom(adminClaimStatusAtom)
  useEffect(() => {
    if (!auth) { setIsAdmin(false); setStatus('ready'); return }
    return onAuthStateChanged(auth, async (user) => {
      if (!user) { setIsAdmin(false); setStatus('ready'); return }
      setStatus('loading')
      const { isAdmin } = await syncSession(user).catch(() => ({ isAdmin: false }))
      setIsAdmin(isAdmin)
      setStatus('ready')
    })
  }, [setIsAdmin, setStatus])
  return null
}
