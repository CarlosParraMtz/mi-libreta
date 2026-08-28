import { useAtomValue } from 'jotai'
import { Navigate, Outlet } from 'react-router-dom'
import { adminClaimStatusAtom, isPlatformAdminAtom } from '../state/store'

export function AdminGate() {
  const isAdmin = useAtomValue(isPlatformAdminAtom)
  const status = useAtomValue(adminClaimStatusAtom)
  if (status === 'loading') return <div className="grid min-h-screen place-items-center bg-cream font-black text-ink/40">Verificando permisos…</div>
  return isAdmin ? <Outlet /> : <Navigate to="/dashboard" replace />
}
