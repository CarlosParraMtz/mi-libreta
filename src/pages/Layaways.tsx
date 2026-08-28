import { CalendarClock, Check, MessageCircle, Plus } from 'lucide-react'
import { useAtomValue, useSetAtom } from 'jotai'
import { useState, type FormEvent } from 'react'
import { PageHeader } from '../components/PageHeader'
import { money, shortDate, whatsappUrl } from '../lib/format'
import { addLayawayPaymentAtom, entryModalAtom, ledgerAtom, toastAtom } from '../state/store'

export function Layaways() {
  const ledger = useAtomValue(ledgerAtom)
  const openEntry = useSetAtom(entryModalAtom)
  const addPayment = useSetAtom(addLayawayPaymentAtom)
  const showToast = useSetAtom(toastAtom)
  const [paying, setPaying] = useState<string | null>(null)
  const totalPending = ledger.layaways.reduce((sum, item) => sum + Math.max(0, item.total - item.payments.reduce((value, payment) => value + payment.amount, 0)), 0)
  const submit = (event: FormEvent<HTMLFormElement>, layawayId: string, pending: number) => { event.preventDefault(); const amount = Number(new FormData(event.currentTarget).get('amount')); addPayment({ layawayId, amount: Math.min(amount, pending) }); showToast('Abono registrado'); setPaying(null) }

  return (
    <main className="px-4 pb-8 pt-6 sm:px-8 sm:pt-9 lg:px-12"><div className="mx-auto max-w-4xl">
      <PageHeader eyebrow="Mercancía separada" title="Apartados" action={<button onClick={() => openEntry('layaway')} className="flex items-center gap-2 rounded-full bg-ink px-4 py-3 text-sm font-black text-white shadow-soft"><Plus size={18} /><span className="hidden sm:inline">Nuevo apartado</span></button>} />
      <section className="mt-6 rounded-[2rem] bg-lilac p-6 sm:flex sm:items-end sm:justify-between sm:p-7"><div><p className="text-sm font-bold text-ink/50">Falta por cobrar</p><p className="mt-1 text-4xl font-black tracking-tight">{money(totalPending)}</p></div><p className="mt-3 text-sm font-semibold text-ink/50 sm:mt-0">{ledger.layaways.length} productos separados</p></section>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {ledger.layaways.map((item) => {
          const customer = ledger.customers.find((person) => person.id === item.customerId)!
          const paid = item.payments.reduce((sum, payment) => sum + payment.amount, 0)
          const pending = Math.max(0, item.total - paid)
          const complete = pending <= 0
          const percent = Math.min(100, Math.round((paid / item.total) * 100))
          return <article key={item.id} className="rounded-[1.7rem] bg-white p-5 shadow-soft"><div className="flex items-start gap-3"><span className={`grid size-11 shrink-0 place-items-center rounded-2xl ${complete ? 'bg-lime' : 'bg-lilac'}`}>{complete ? <Check size={20} /> : <CalendarClock size={20} />}</span><div className="min-w-0 flex-1"><p className="truncate font-black">{item.product}</p><p className="text-sm font-semibold text-ink/45">{customer.name}</p></div><p className="font-black">{complete ? 'Pagado' : money(pending)}</p></div><div className="mt-5 h-2 overflow-hidden rounded-full bg-cream"><div className="h-full rounded-full bg-coral transition-all" style={{ width: `${percent}%` }} /></div><div className="mt-2 flex justify-between text-xs font-bold text-ink/40"><span>Pagó {money(paid)}</span><span>{percent}%</span></div>{item.dueDate && <p className="mt-4 text-xs font-extrabold text-ink/45">Fecha límite: {shortDate(item.dueDate)}</p>} {!complete && <div className="mt-4 flex gap-2"><button onClick={() => setPaying(paying === item.id ? null : item.id)} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-ink px-3 py-2.5 text-sm font-black text-white"><Plus size={16} /> Abono</button>{customer.phone && <a href={whatsappUrl(customer.phone, `Hola, ${customer.name.split(' ')[0]}. De tu apartado de ${item.product} quedan ${money(pending)} pendientes en ${ledger.businessName}.`)} target="_blank" rel="noreferrer" className="grid size-10 place-items-center rounded-xl bg-[#dff7e9] text-[#168c5b]" aria-label="Recordar por WhatsApp"><MessageCircle size={18} /></a>}</div>}{paying === item.id && <form onSubmit={(event) => submit(event, item.id, pending)} className="mt-3 flex gap-2"><input name="amount" autoFocus type="number" min="1" max={pending} className="min-w-0 flex-1 rounded-xl bg-cream px-3 py-2.5 font-black outline-none" placeholder="$0" required /><button className="rounded-xl bg-coral px-4 text-sm font-black text-white">Guardar</button></form>}</article>
        })}
      </div>
    </div></main>
  )
}
