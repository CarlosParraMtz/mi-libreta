import { useAtomValue } from 'jotai'
import { Link, Outlet } from 'react-router-dom'
import { auth } from '../lib/firebase'
import { adminClaimStatusAtom, adminClaimUserIdAtom, isPlatformAdminAtom } from '../state/store'

export function AdminGate() {
  const isAdmin = useAtomValue(isPlatformAdminAtom)
  const status = useAtomValue(adminClaimStatusAtom)
  const claimUserId = useAtomValue(adminClaimUserIdAtom)
  if (status === 'loading' || claimUserId !== auth?.currentUser?.uid) return <div className="grid min-h-screen place-items-center bg-cream font-black text-ink/40">Verificando permisos…</div>
  if (isAdmin) return <Outlet />
  return <main className="grid min-h-screen place-items-center bg-cream p-4 text-ink"><section className="w-full max-w-lg rounded-[2rem] bg-white p-7 text-center shadow-card"><p className="text-xs font-black uppercase tracking-[.16em] text-coral">Acceso restringido</p><h1 className="mt-2 text-3xl font-black">Tu cuenta todavía no es administradora</h1><p className="mt-3 font-semibold text-ink/45">Agrega este UID a <code>ADMIN_USER_IDS</code> en la Lambda y vuelve a iniciar sesión.</p><code className="mt-5 block break-all rounded-2xl bg-cream p-4 text-sm font-black">{auth?.currentUser?.uid || 'UID no disponible'}</code><Link to="/dashboard" className="mt-5 block rounded-2xl bg-ink px-5 py-3.5 font-black text-white">Volver</Link></section></main>
}
