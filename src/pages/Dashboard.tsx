import { motion } from 'framer-motion'
import { ArrowRight, BookOpen, HandCoins, MessageCircle, PackageCheck, Plus, ShoppingBag, WalletCards } from 'lucide-react'
import { useAtomValue, useSetAtom } from 'jotai'
import { Link } from 'react-router-dom'
import { creditBalance, daysSince, isToday, money, whatsappUrl } from '../lib/format'
import { entryModalAtom, ledgerAtom } from '../state/store'
import type { EntryKind, ProductModule } from '../lib/types'

const actions: Array<{ label: string; type: EntryKind; icon: typeof WalletCards; color: string; module: ProductModule; path?: string }> = [
  { label: 'Venta', type: 'sale', icon: WalletCards, color: 'bg-lime', module: 'cash' },
  { label: 'Gasto', type: 'expense', icon: HandCoins, color: 'bg-peach', module: 'cash' },
  { label: 'Fiado', type: 'credit', icon: BookOpen, color: 'bg-sky', module: 'credits' },
  { label: 'Apartado', type: 'layaway', icon: PackageCheck, color: 'bg-lilac', module: 'layaways' },
  { label: 'Pedido', type: null, icon: ShoppingBag, color: 'bg-peach', module: 'orders', path: '/dashboard/pedidos' },
]

export function Dashboard() {
  const ledger = useAtomValue(ledgerAtom)
  const openEntry = useSetAtom(entryModalAtom)
  const today = ledger.cash.filter((item) => isToday(item.createdAt))
  const income = today.filter((item) => item.kind === 'sale').reduce((sum, item) => sum + item.amount, 0)
  const expenses = today.filter((item) => item.kind !== 'sale').reduce((sum, item) => sum + item.amount, 0)
  const totalOwed = ledger.credits.reduce((sum, credit) => sum + Math.max(0, creditBalance(credit.movements)), 0)
  const totalLayaway = ledger.layaways.reduce((sum, item) => sum + Math.max(0, item.total - item.payments.reduce((value, payment) => value + payment.amount, 0)), 0)
  const activeOrders = ledger.orders.filter((order) => !['delivered', 'cancelled'].includes(order.status)).length
  const alerts = ledger.credits.filter((credit) => creditBalance(credit.movements) > 0).sort((a, b) => daysSince(b.movements.at(-1)?.createdAt || b.createdAt) - daysSince(a.movements.at(-1)?.createdAt || a.createdAt)).slice(0, 3)

  return (
    <main className="px-4 pb-8 pt-5 sm:px-8 sm:pt-8 lg:px-12">
      <div className="mx-auto max-w-4xl">
        <header className="mb-7 flex items-center justify-between">
          <div><p className="text-xs font-black uppercase tracking-[0.18em] text-coral">{ledger.businessName}</p><h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">Buenos días, {ledger.ownerName}</h1><p className="mt-1 text-sm font-semibold text-ink/40">Aquí está lo importante de hoy.</p></div>
          <Link to="/dashboard/configuracion" className="grid size-11 shrink-0 place-items-center rounded-full bg-white font-black shadow-soft md:hidden" aria-label="Abrir configuración">{ledger.ownerName.charAt(0)}</Link>
        </header>

        <div className="grid gap-4 lg:grid-cols-[1.25fr_.75fr]">
          <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-[2rem] bg-ink p-6 text-white shadow-card sm:p-8">
            <div className="absolute -right-10 -top-10 size-44 rounded-full bg-lime/10" />
            <p className="text-sm font-semibold text-white/60">Así va tu negocio hoy</p>
            <p className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">{money(income - expenses)}</p>
            <p className="mt-1 text-sm text-white/65">te quedaron antes de retiros</p>
            <div className="mt-7 grid grid-cols-2 gap-3 border-t border-white/10 pt-5">
              <div><p className="text-xs text-white/50">Entró</p><p className="mt-1 text-lg font-extrabold text-mint">+{money(income)}</p></div>
              <div><p className="text-xs text-white/50">Salió</p><p className="mt-1 text-lg font-extrabold text-peach">−{money(expenses)}</p></div>
            </div>
          </motion.section>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
            {ledger.enabledModules.includes('credits') && <Link to="/dashboard/fiados" className="rounded-[1.6rem] bg-white p-5 shadow-soft transition hover:-translate-y-0.5"><p className="text-xs font-extrabold text-ink/40">Te deben</p><p className="mt-1 text-2xl font-black">{money(totalOwed)}</p><p className="mt-3 flex items-center gap-1 text-xs font-black text-coral">Ver fiados <ArrowRight size={14} /></p></Link>}
            {ledger.enabledModules.includes('layaways') && <Link to="/dashboard/apartados" className="rounded-[1.6rem] bg-lilac p-5 shadow-soft transition hover:-translate-y-0.5"><p className="text-xs font-extrabold text-ink/45">Por cobrar en apartados</p><p className="mt-1 text-2xl font-black">{money(totalLayaway)}</p><p className="mt-3 flex items-center gap-1 text-xs font-black">Ver apartados <ArrowRight size={14} /></p></Link>}
            {ledger.enabledModules.includes('orders') && <Link to="/dashboard/pedidos" className="rounded-[1.6rem] bg-peach p-5 shadow-soft transition hover:-translate-y-0.5"><p className="text-xs font-extrabold text-ink/45">Pedidos activos</p><p className="mt-1 text-2xl font-black">{activeOrders}</p><p className="mt-3 flex items-center gap-1 text-xs font-black">Abrir pedidos <ArrowRight size={14} /></p></Link>}
          </div>
        </div>

        <section className="mt-8">
          <div className="mb-3"><p className="text-sm font-bold text-ink/40">Accesos rápidos</p><h2 className="text-xl font-black">¿Qué quieres apuntar?</h2></div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {actions.filter((action) => ledger.enabledModules.includes(action.module)).map(({ label, type, icon: Icon, color, path }, index) => path ? <Link to={path} key={label}><motion.span initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .05 * index }} whileTap={{ scale: 0.97 }} className={`${color} flex min-h-28 flex-col justify-between rounded-3xl p-4 text-left shadow-soft sm:min-h-32`}><span className="grid size-9 place-items-center rounded-full bg-white/70"><Icon size={18} strokeWidth={2.5} /></span><span className="flex items-center justify-between font-extrabold">{label}<Plus size={18} /></span></motion.span></Link> : (
              <motion.button initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .05 * index }} whileTap={{ scale: 0.97 }} onClick={() => openEntry(type)} key={label} className={`${color} flex min-h-28 flex-col justify-between rounded-3xl p-4 text-left shadow-soft sm:min-h-32`}>
                <span className="grid size-9 place-items-center rounded-full bg-white/70"><Icon size={18} strokeWidth={2.5} /></span>
                <span className="flex items-center justify-between font-extrabold">{label}<Plus size={18} /></span>
              </motion.button>
            ))}
          </div>
        </section>

        {ledger.enabledModules.includes('credits') && <section className="mt-9">
          <div className="mb-3 flex items-end justify-between"><div><p className="text-sm font-bold text-ink/40">Atención</p><h2 className="text-xl font-black">A quién cobrarle</h2></div><Link to="/dashboard/fiados" className="text-sm font-extrabold text-coral">Ver todos</Link></div>
          <div className="overflow-hidden rounded-[1.7rem] bg-white shadow-soft">
            {alerts.map((credit, index) => {
              const customer = ledger.customers.find((item) => item.id === credit.customerId)!
              const balance = creditBalance(credit.movements)
              const days = daysSince(credit.movements.at(-1)?.createdAt || credit.createdAt)
              return <div key={credit.id} className={`flex items-center gap-3 p-4 sm:px-5 ${index ? 'border-t border-ink/7' : ''}`}><span className="grid size-11 shrink-0 place-items-center rounded-full bg-peach font-black">{customer.name.charAt(0)}</span><Link to={`/dashboard/fiados/${credit.id}`} className="min-w-0 flex-1"><p className="truncate font-extrabold">{customer.name}</p><p className="text-xs font-semibold text-ink/40">{days ? `Sin abonar hace ${days} días` : 'Prometió pagar hoy'}</p></Link><div className="text-right"><p className="font-black">{money(balance)}</p>{customer.phone && <a href={whatsappUrl(customer.phone, `Hola, ${customer.name.split(' ')[0]}. Te recordamos que tienes ${money(balance)} pendientes en ${ledger.businessName}.`)} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs font-black text-[#168c5b]"><MessageCircle size={13} /> Cobrar</a>}</div></div>
            })}
          </div>
        </section>}
      </div>
    </main>
  )
}
