import { onAuthStateChanged } from 'firebase/auth'
import { useSetAtom } from 'jotai'
import { useEffect } from 'react'
import { apiBaseUrl, apiRequest } from '../lib/api'
import { auth } from '../lib/firebase'
import { adminClaimStatusAtom, isPlatformAdminAtom } from '../state/store'

export function AdminClaimSync() {
  const setIsAdmin = useSetAtom(isPlatformAdminAtom)
  const setStatus = useSetAtom(adminClaimStatusAtom)
  useEffect(() => {
    if (!auth) { setIsAdmin(false); setStatus('ready'); return }
    return onAuthStateChanged(auth, async (user) => {
      if (!user) { setIsAdmin(false); setStatus('ready'); return }
      setStatus('loading')
      if (apiBaseUrl) {
        await apiRequest('/auth/sync-profile', { method: 'POST' }).catch(() => null)
        await apiRequest('/auth/sync-admin', { method: 'POST' }).catch(() => null)
      }
      const token = await user.getIdTokenResult(true)
      setIsAdmin(token.claims.admin === true)
      setStatus('ready')
    })
  }, [setIsAdmin, setStatus])
  return null
}
