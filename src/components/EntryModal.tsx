import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { useState, type FormEvent } from 'react'
import { addCashAtom, addCreditAtom, addLayawayAtom, entryModalAtom, ledgerAtom, toastAtom } from '../state/store'
import type { CashKind } from '../lib/types'

const labels = { sale: 'Nueva venta', expense: 'Nuevo gasto', withdrawal: 'Nuevo retiro', credit: 'Nuevo fiado', layaway: 'Nuevo apartado' }

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-sm font-extrabold text-ink/65">{label}</span>{children}</label>
}

const inputClass = 'w-full rounded-2xl border border-ink/10 bg-cream px-4 py-3.5 font-bold text-ink outline-none transition placeholder:text-ink/25 focus:border-coral focus:ring-4 focus:ring-coral/10'

export function EntryModal() {
  const [kind, setKind] = useAtom(entryModalAtom)
  const ledger = useAtomValue(ledgerAtom)
  const addCash = useSetAtom(addCashAtom)
  const addCredit = useSetAtom(addCreditAtom)
  const addLayaway = useSetAtom(addLayawayAtom)
  const showToast = useSetAtom(toastAtom)
  const [customerMode, setCustomerMode] = useState<'existing' | 'new'>('existing')

  const close = () => setKind(null)
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!kind) return
    const form = new FormData(event.currentTarget)
    const amount = Number(form.get('amount'))
    if (kind === 'sale' || kind === 'expense' || kind === 'withdrawal') {
      addCash({ kind: kind as CashKind, amount, note: String(form.get('note') || labels[kind]) })
    } else if (kind === 'credit') {
      addCredit({ customerId: customerMode === 'existing' ? String(form.get('customerId')) : undefined, name: String(form.get('name') || ''), phone: String(form.get('phone') || ''), amount, note: String(form.get('note') || 'Fiado') })
    } else {
      addLayaway({ customerId: customerMode === 'existing' ? String(form.get('customerId')) : undefined, name: String(form.get('name') || ''), phone: String(form.get('phone') || ''), product: String(form.get('product')), total: Number(form.get('total')), initialPayment: Number(form.get('initialPayment')), dueDate: String(form.get('dueDate') || '') })
    }
    showToast('Quedó apuntado')
    close()
  }

  return (
    <AnimatePresence>
      {kind && (
        <motion.div className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/45 p-0 backdrop-blur-sm sm:items-center sm:p-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={close}>
          <motion.div role="dialog" aria-modal="true" aria-label={labels[kind]} initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} transition={{ type: 'spring', damping: 28, stiffness: 320 }} onMouseDown={(event) => event.stopPropagation()} className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-[2rem] bg-white p-5 shadow-card sm:rounded-[2rem] sm:p-7">
            <div className="mb-6 flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-[0.15em] text-coral">Apuntar</p><h2 className="text-2xl font-black">{labels[kind]}</h2></div><button onClick={close} className="grid size-10 place-items-center rounded-full bg-cream" aria-label="Cerrar"><X size={20} /></button></div>
            <form onSubmit={submit} className="space-y-4">
              {(kind === 'credit' || kind === 'layaway') && (
                <>
                  <div className="grid grid-cols-2 rounded-2xl bg-cream p-1">
                    <button type="button" onClick={() => setCustomerMode('existing')} className={`rounded-xl px-3 py-2 text-sm font-extrabold ${customerMode === 'existing' ? 'bg-white shadow-soft' : 'text-ink/40'}`}>Ya es cliente</button>
                    <button type="button" onClick={() => setCustomerMode('new')} className={`rounded-xl px-3 py-2 text-sm font-extrabold ${customerMode === 'new' ? 'bg-white shadow-soft' : 'text-ink/40'}`}>Cliente nuevo</button>
                  </div>
                  {customerMode === 'existing' ? <Field label="Cliente"><select name="customerId" className={inputClass} required>{ledger.customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></Field> : <div className="grid gap-4 sm:grid-cols-2"><Field label="Nombre"><input name="name" className={inputClass} placeholder="Ej. Elena" required /></Field><Field label="WhatsApp"><input name="phone" className={inputClass} inputMode="tel" placeholder="10 dígitos" /></Field></div>}
                </>
              )}
              {kind === 'layaway' ? (
                <>
                  <Field label="Producto"><input name="product" className={inputClass} placeholder="Ej. Vestido negro M" required /></Field>
                  <div className="grid grid-cols-2 gap-4"><Field label="Precio total"><input name="total" type="number" min="1" step="1" className={inputClass} placeholder="$0" required /></Field><Field label="Primer abono"><input name="initialPayment" type="number" min="0" step="1" className={inputClass} placeholder="$0" required /></Field></div>
                  <Field label="Fecha límite (opcional)"><input name="dueDate" type="date" className={inputClass} /></Field>
                </>
              ) : (
                <>
                  <Field label="Cantidad"><div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-black text-ink/35">$</span><input autoFocus name="amount" type="number" min="1" step="1" className={`${inputClass} pl-9 text-xl`} placeholder="0" required /></div></Field>
                  <Field label={kind === 'credit' ? '¿Qué se llevó?' : 'Nota (opcional)'}><input name="note" className={inputClass} placeholder={kind === 'credit' ? 'Ej. Despensa' : 'Ej. Refrescos'} /></Field>
                </>
              )}
              <button className="mt-2 w-full rounded-2xl bg-ink px-5 py-4 font-black text-white shadow-soft transition hover:bg-ink/90 active:scale-[0.99]">Guardar en mi libreta</button>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
