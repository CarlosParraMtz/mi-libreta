import { BookOpen, House, PackageCheck, Settings, ShieldCheck, ShoppingBag, Users, WalletCards } from 'lucide-react'
import { useAtomValue } from 'jotai'
import { NavLink, Outlet } from 'react-router-dom'
import { isPlatformAdminAtom, ledgerAtom } from '../state/store'
import { BusinessSwitcher } from './BusinessSwitcher'

const links = [
  { to: '/dashboard', label: 'Hoy', icon: House, end: true },
  { to: '/dashboard/fiados', label: 'Fiados', icon: BookOpen, module: 'credits' },
  { to: '/dashboard/apartados', label: 'Apartados', icon: PackageCheck, module: 'layaways' },
  { to: '/dashboard/caja', label: 'Caja', icon: WalletCards, module: 'cash' },
  { to: '/dashboard/pedidos', label: 'Pedidos', icon: ShoppingBag, module: 'orders' },
  { to: '/dashboard/clientes', label: 'Clientes', icon: Users },
]

const navClass = ({ isActive }: { isActive: boolean }) => `flex items-center gap-3 rounded-2xl px-4 py-3 font-extrabold transition ${isActive ? 'bg-ink text-white shadow-soft' : 'text-ink/50 hover:bg-white/70 hover:text-ink'}`

export function AppShell() {
  const ledger = useAtomValue(ledgerAtom)
  const isPlatformAdmin = useAtomValue(isPlatformAdminAtom)
  const visibleLinks = links.filter((link) => !('module' in link) || ledger.enabledModules.includes(link.module as 'credits' | 'layaways' | 'cash' | 'orders'))
  return (
    <div className="min-h-screen bg-cream text-ink">
      <div className="mx-auto min-h-screen max-w-[1180px] md:grid md:grid-cols-[230px_1fr]">
        <aside className="sticky top-0 hidden h-screen border-r border-ink/8 px-5 py-7 md:flex md:flex-col">
          <NavLink to="/dashboard" className="px-3 text-2xl font-black tracking-tight"><span className="text-coral">Mi</span> Libreta</NavLink>
          <p className="mt-1 truncate px-3 text-xs font-black text-ink/50">{ledger.ledgerName}</p>
          {ledger.ledgerName !== ledger.businessName && <p className="truncate px-3 text-[10px] font-semibold text-ink/30">{ledger.businessName}</p>}
          <BusinessSwitcher />
          <nav className="mt-10 space-y-2">
            {visibleLinks.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} className={navClass}><Icon size={20} /><span>{label}</span></NavLink>)}
            {isPlatformAdmin && <NavLink to="/admin" className={navClass}><ShieldCheck size={20} /><span>Administración</span></NavLink>}
          </nav>
          <NavLink to="/dashboard/configuracion" className="mt-auto flex items-center gap-3 rounded-2xl bg-white p-3 shadow-soft">
            <span className="grid size-10 place-items-center rounded-full bg-lime font-black">{ledger.ownerName.charAt(0)}</span>
            <span className="min-w-0"><span className="block truncate text-sm font-extrabold">{ledger.ownerName}</span><span className="text-xs text-ink/40">Configuración</span></span>
          </NavLink>
        </aside>

        <div className="min-w-0 pb-24 md:pb-0"><Outlet /></div>
      </div>

      <nav className="no-scrollbar fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-xl justify-start overflow-x-auto border-t border-black/5 bg-white/92 px-2 pb-[max(0.7rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl md:hidden">
        {visibleLinks.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `flex min-w-16 flex-col items-center gap-1 rounded-xl py-1 text-[11px] font-extrabold transition ${isActive ? 'text-coral' : 'text-ink/35'}`}>
            <Icon size={21} strokeWidth={2.5} /><span>{label}</span>
          </NavLink>
        ))}
        {isPlatformAdmin && <NavLink to="/admin" className={({ isActive }) => `flex min-w-16 flex-col items-center gap-1 rounded-xl py-1 text-[11px] font-extrabold ${isActive ? 'text-coral' : 'text-ink/35'}`}><ShieldCheck size={21} /><span>Admin</span></NavLink>}
        <NavLink to="/dashboard/configuracion" className={({ isActive }) => `flex min-w-16 flex-col items-center gap-1 rounded-xl py-1 text-[11px] font-extrabold ${isActive ? 'text-coral' : 'text-ink/35'}`}><Settings size={21} /><span>Ajustes</span></NavLink>
      </nav>
    </div>
  )
}
