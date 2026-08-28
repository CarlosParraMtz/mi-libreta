import { ArrowLeft, MessageCircle, Plus } from 'lucide-react'
import { useAtomValue, useSetAtom } from 'jotai'
import { useState, type FormEvent } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { creditBalance, money, shortDate, whatsappUrl } from '../lib/format'
import { addCreditPaymentAtom, ledgerAtom, toastAtom } from '../state/store'

export function CreditDetail() {
  const { id } = useParams()
  const ledger = useAtomValue(ledgerAtom)
  const addPayment = useSetAtom(addCreditPaymentAtom)
  const showToast = useSetAtom(toastAtom)
  const [showPayment, setShowPayment] = useState(false)
  const credit = ledger.credits.find((item) => item.id === id)
  if (!credit) return <Navigate to="/dashboard/fiados" replace />
  const customer = ledger.customers.find((item) => item.id === credit.customerId)!
  const balance = creditBalance(credit.movements)
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const amount = Number(new FormData(event.currentTarget).get('amount')); addPayment({ creditId: credit.id, amount: Math.min(amount, balance) }); showToast('Abono registrado'); setShowPayment(false) }

  return (
    <main className="px-4 pb-8 pt-6 sm:px-8 sm:pt-9 lg:px-12"><div className="mx-auto max-w-2xl">
      <Link to="/dashboard/fiados" className="mb-6 inline-flex items-center gap-2 text-sm font-extrabold text-ink/50"><ArrowLeft size={18} /> Volver a fiados</Link>
      <section className="rounded-[2rem] bg-ink p-6 text-white shadow-card sm:p-8"><div className="flex items-center gap-4"><span className="grid size-14 place-items-center rounded-full bg-sky text-xl font-black text-ink">{customer.name.charAt(0)}</span><div><p className="text-xl font-black">{customer.name}</p><p className="text-sm text-white/50">{credit.note}</p></div></div><div className="mt-8"><p className="text-sm font-semibold text-white/55">Saldo pendiente</p><p className="mt-1 text-5xl font-black tracking-tight">{money(Math.max(0, balance))}</p></div><div className="mt-7 flex flex-wrap gap-3"><button disabled={balance <= 0} onClick={() => setShowPayment(true)} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-lime px-4 py-3.5 font-black text-ink disabled:opacity-40"><Plus size={18} /> Registrar abono</button>{customer.phone && balance > 0 && <a href={whatsappUrl(customer.phone, `Hola, ${customer.name.split(' ')[0]}. Te recordamos que tienes ${money(balance)} pendientes en ${ledger.businessName}.`)} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 rounded-2xl border border-white/15 px-4 py-3.5 font-black"><MessageCircle size={18} /> Recordar</a>}</div></section>
      {showPayment && <form onSubmit={submit} className="mt-4 rounded-[1.7rem] bg-lime p-5 shadow-soft"><p className="font-black">¿Cuánto abonó?</p><div className="mt-3 flex gap-2"><input name="amount" autoFocus type="number" min="1" max={balance} className="min-w-0 flex-1 rounded-2xl bg-white px-4 py-3 font-black outline-none" placeholder="$0" required /><button className="rounded-2xl bg-ink px-5 font-black text-white">Guardar</button></div></form>}
      <section className="mt-8"><h2 className="text-xl font-black">Movimientos</h2><div className="mt-3 overflow-hidden rounded-[1.7rem] bg-white shadow-soft">{[...credit.movements].reverse().map((item, index) => <div key={item.id} className={`flex items-center justify-between p-4 sm:px-5 ${index ? 'border-t border-ink/7' : ''}`}><div><p className="font-extrabold">{item.kind === 'charge' ? item.note : 'Abono recibido'}</p><p className="text-xs font-semibold text-ink/40">{shortDate(item.createdAt)}</p></div><p className={`font-black ${item.kind === 'payment' ? 'text-[#168c5b]' : ''}`}>{item.kind === 'payment' ? '−' : '+'}{money(item.amount)}</p></div>)}</div></section>
    </div></main>
  )
}
