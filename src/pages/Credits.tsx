import { motion } from 'framer-motion'
import { ChevronRight, MessageCircle, Plus, Search } from 'lucide-react'
import { useAtomValue, useSetAtom } from 'jotai'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { creditBalance, daysSince, money, whatsappUrl } from '../lib/format'
import { entryModalAtom, ledgerAtom } from '../state/store'

export function Credits() {
  const ledger = useAtomValue(ledgerAtom)
  const openEntry = useSetAtom(entryModalAtom)
  const [query, setQuery] = useState('')
  const items = useMemo(() => ledger.credits.map((credit) => ({ credit, customer: ledger.customers.find((item) => item.id === credit.customerId)! })).filter(({ customer }) => customer.name.toLowerCase().includes(query.toLowerCase())).sort((a, b) => creditBalance(b.credit.movements) - creditBalance(a.credit.movements)), [ledger, query])
  const total = items.reduce((sum, item) => sum + Math.max(0, creditBalance(item.credit.movements)), 0)

  return (
    <main className="px-4 pb-8 pt-6 sm:px-8 sm:pt-9 lg:px-12">
      <div className="mx-auto max-w-4xl">
        <PageHeader eyebrow="Tu dinero" title="Fiados" action={<button onClick={() => openEntry('credit')} className="flex items-center gap-2 rounded-full bg-ink px-4 py-3 text-sm font-black text-white shadow-soft"><Plus size={18} /> <span className="hidden sm:inline">Nuevo fiado</span></button>} />
        <section className="mt-6 rounded-[2rem] bg-sky p-6 sm:flex sm:items-end sm:justify-between sm:p-7"><div><p className="text-sm font-bold text-ink/50">Te deben entre todos</p><p className="mt-1 text-4xl font-black tracking-tight">{money(total)}</p></div><p className="mt-3 max-w-xs text-sm font-semibold text-ink/55 sm:mt-0 sm:text-right">{items.filter(({ credit }) => creditBalance(credit.movements) > 0).length} personas tienen saldo pendiente</p></section>
        <div className="relative mt-5"><Search size={19} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/35" /><input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full rounded-2xl border-0 bg-white py-3.5 pl-11 pr-4 font-bold shadow-soft outline-none placeholder:text-ink/30 focus:ring-4 focus:ring-sky/40" placeholder="Buscar a un cliente" /></div>
        <div className="mt-4 overflow-hidden rounded-[1.7rem] bg-white shadow-soft">
          {items.map(({ credit, customer }, index) => {
            const balance = creditBalance(credit.movements)
            const last = credit.movements.at(-1)?.createdAt || credit.createdAt
            return <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: index * .025 }} key={credit.id} className={`flex items-center gap-3 p-4 sm:px-5 ${index ? 'border-t border-ink/7' : ''}`}><span className="grid size-11 shrink-0 place-items-center rounded-full bg-cream font-black">{customer.name.charAt(0)}</span><Link to={`/dashboard/fiados/${credit.id}`} className="min-w-0 flex-1"><p className="truncate font-extrabold">{customer.name}</p><p className="truncate text-xs font-semibold text-ink/40">{credit.note} · {daysSince(last)} días</p></Link><div className="text-right"><p className={`font-black ${balance <= 0 ? 'text-[#168c5b]' : ''}`}>{balance <= 0 ? 'Pagado' : money(balance)}</p>{customer.phone && balance > 0 && <a href={whatsappUrl(customer.phone, `Hola, ${customer.name.split(' ')[0]}. Te recordamos que tienes ${money(balance)} pendientes en ${ledger.businessName}.`)} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs font-black text-[#168c5b]"><MessageCircle size={13} /> WhatsApp</a>}</div><Link to={`/dashboard/fiados/${credit.id}`} aria-label={`Ver fiado de ${customer.name}`}><ChevronRight className="text-ink/20" size={20} /></Link></motion.div>
          })}
          {!items.length && <div className="p-10 text-center"><p className="font-black">No encontré a ese cliente</p><p className="mt-1 text-sm text-ink/40">Prueba con otro nombre.</p></div>}
        </div>
      </div>
    </main>
  )
}
