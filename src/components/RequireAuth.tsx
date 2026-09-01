import { onAuthStateChanged, type User } from 'firebase/auth'
import { useAtomValue } from 'jotai'
import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { auth, isFirebaseConfigured } from '../lib/firebase'
import { useDeadlineClock } from '../lib/use-deadline-clock'
import { activeBusinessIdAtom, adminClaimStatusAtom, adminClaimUserIdAtom, isPlatformAdminAtom, ledgerAtom, syncedUserIdAtom, syncStatusAtom } from '../state/store'

function Redirect({ to }: { to: string }) {
  const navigate = useNavigate()
  useEffect(() => {
    navigate(to, { replace: true })
  }, [navigate, to])
  return <div className="grid min-h-screen place-items-center bg-cream font-black text-ink/40">Abriendo…</div>
}

export function RequireAuth({ requireOnboarding = false, ignoreOnboarding = false }: { requireOnboarding?: boolean; ignoreOnboarding?: boolean }) {
  const location = useLocation()
  const ledger = useAtomValue(ledgerAtom)
  const isPlatformAdmin = useAtomValue(isPlatformAdminAtom)
  const adminStatus = useAtomValue(adminClaimStatusAtom)
  const adminClaimUserId = useAtomValue(adminClaimUserIdAtom)
  const syncStatus = useAtomValue(syncStatusAtom)
  const syncedUserId = useAtomValue(syncedUserIdAtom)
  const activeBusinessId = useAtomValue(activeBusinessIdAtom)
  const [user, setUser] = useState<User | null>(auth?.currentUser || null)
  const [loading, setLoading] = useState(isFirebaseConfigured)
  const accessDeadline = ledger.subscription.accessOverride === 'until' ? ledger.subscription.accessUntil : ledger.subscription.currentPeriodEnd || ledger.subscription.trialEndsAt
  const now = useDeadlineClock(accessDeadline)

  useEffect(() => {
    if (!auth) return
    return onAuthStateChanged(auth, (nextUser) => { setUser(nextUser); setLoading(false) })
  }, [])

  if (loading) return <div className="grid min-h-screen place-items-center bg-cream font-black text-ink/40">Abriendo tu libreta…</div>
  if (!isFirebaseConfigured || !user) return <Redirect to={`/iniciar-sesion?returnTo=${encodeURIComponent(location.pathname + location.search)}`} />
  if (adminStatus === 'loading' || adminClaimUserId !== user.uid) return <div className="grid min-h-screen place-items-center bg-cream font-black text-ink/40">Verificando permisos…</div>
  if (isPlatformAdmin && !location.pathname.startsWith('/admin')) return <Redirect to="/admin" />
  if (isPlatformAdmin) return <Outlet />
  if (syncStatus === 'error') return <main className="grid min-h-screen place-items-center bg-cream p-4 text-ink"><section className="w-full max-w-lg rounded-[2rem] bg-white p-7 text-center shadow-card"><p className="text-xs font-black uppercase tracking-[.16em] text-coral">No pudimos cargar tu cuenta</p><h1 className="mt-2 text-3xl font-black">Revisa la conexión e inténtalo otra vez</h1><button type="button" onClick={() => window.location.reload()} className="mt-5 w-full rounded-2xl bg-ink px-5 py-3.5 font-black text-white">Volver a cargar</button></section></main>
  if (syncStatus === 'loading' || syncStatus === 'idle' || syncedUserId !== user.uid) return <div className="grid min-h-screen place-items-center bg-cream font-black text-ink/40">Cargando tu libreta…</div>
  if (ignoreOnboarding) return <Outlet />
  if (requireOnboarding) return activeBusinessId ? <Redirect to="/dashboard" /> : <Outlet />
  if (!activeBusinessId) return <Redirect to="/onboarding" />
  const trialEndsAt = ledger.subscription.trialEndsAtMs ?? (ledger.subscription.trialEndsAt ? new Date(ledger.subscription.trialEndsAt).getTime() : 0)
  const currentPeriodEnd = ledger.subscription.currentPeriodEndMs ?? (ledger.subscription.currentPeriodEnd ? new Date(ledger.subscription.currentPeriodEnd).getTime() : 0)
  const accessUntil = ledger.subscription.accessUntilMs ?? (ledger.subscription.accessUntil ? new Date(ledger.subscription.accessUntil).getTime() : 0)
  const trialActive = trialEndsAt > now
  const paidPeriodActive = currentPeriodEnd > now
  const subscriptionStatusActive = ledger.subscription.status === 'trialing'
    || Boolean(ledger.subscription.stripeSubscriptionId && ['active', 'past_due'].includes(ledger.subscription.status))
  const datedAccessActive = accessUntil > now
  const hasAccess = ledger.subscription.accessOverride === 'unlimited'
    || (ledger.subscription.accessOverride === 'until' ? datedAccessActive : ledger.subscription.accessOverride !== 'suspended' && (trialActive || paidPeriodActive || subscriptionStatusActive))
  const hasExplicitRestriction = ledger.subscription.accessOverride === 'suspended'
    || ledger.subscription.accessOverride === 'until'
    || trialEndsAt > 0
    || Boolean(ledger.subscription.stripeSubscriptionId)
  if (!hasAccess && hasExplicitRestriction && location.pathname !== '/dashboard/configuracion') {
    return <main className="grid min-h-screen place-items-center bg-cream p-4 text-ink"><section className="w-full max-w-lg rounded-[2rem] bg-white p-7 text-center shadow-card"><p className="text-xs font-black uppercase tracking-[.16em] text-coral">Acceso a la libreta</p><h1 className="mt-2 text-3xl font-black">Revisa tu suscripción</h1><p className="mt-3 font-semibold text-ink/45">Tu libreta está creada y tus datos siguen guardados. Revisa el estado de acceso para continuar.</p><Link to="/dashboard/configuracion" className="mt-5 block rounded-2xl bg-ink px-5 py-3.5 font-black text-white">Ir a configuración</Link></section></main>
  }
  return <Outlet />
}
