import { onAuthStateChanged, type User } from 'firebase/auth'
import { useAtomValue } from 'jotai'
import { useEffect, useState } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { auth, isFirebaseConfigured } from '../lib/firebase'
import { isPlatformAdminAtom, ledgerAtom, syncStatusAtom } from '../state/store'

export function RequireAuth({ requireOnboarding = false, ignoreOnboarding = false }: { requireOnboarding?: boolean; ignoreOnboarding?: boolean }) {
  const location = useLocation()
  const ledger = useAtomValue(ledgerAtom)
  const isPlatformAdmin = useAtomValue(isPlatformAdminAtom)
  const syncStatus = useAtomValue(syncStatusAtom)
  const [user, setUser] = useState<User | null>(auth?.currentUser || null)
  const [loading, setLoading] = useState(isFirebaseConfigured)

  useEffect(() => {
    if (!auth) return
    return onAuthStateChanged(auth, (nextUser) => { setUser(nextUser); setLoading(false) })
  }, [])

  if (loading) return <div className="grid min-h-screen place-items-center bg-cream font-black text-ink/40">Abriendo tu libreta…</div>
  if (!isFirebaseConfigured || !user) return <Navigate to={`/iniciar-sesion?returnTo=${encodeURIComponent(location.pathname + location.search)}`} replace />
  if (syncStatus === 'loading' || syncStatus === 'idle') return <div className="grid min-h-screen place-items-center bg-cream font-black text-ink/40">Cargando tu libreta…</div>
  if (ignoreOnboarding) return <Outlet />
  if (requireOnboarding && ledger.onboardingComplete) return <Navigate to="/dashboard" replace />
  if (!requireOnboarding && !ledger.onboardingComplete) return <Navigate to="/onboarding" replace />
  if (!isPlatformAdmin && ledger.subscription.accessOverride === 'suspended' && location.pathname !== '/dashboard/configuracion') return <Navigate to="/dashboard/configuracion" replace />
  return <Outlet />
}
