import { ArrowDownLeft, ArrowUpRight, Minus, Plus } from 'lucide-react'
import { useAtomValue, useSetAtom } from 'jotai'
import { PageHeader } from '../components/PageHeader'
import { isToday, money, shortDate } from '../lib/format'
import type { EntryKind } from '../lib/types'
import { entryModalAtom, ledgerAtom } from '../state/store'

export function Cash() {
  const ledger = useAtomValue(ledgerAtom)
  const openEntry = useSetAtom(entryModalAtom)
  const today = ledger.cash.filter((item) => isToday(item.createdAt))
  const income = today.filter((item) => item.kind === 'sale').reduce((sum, item) => sum + item.amount, 0)
  const output = today.filter((item) => item.kind !== 'sale').reduce((sum, item) => sum + item.amount, 0)
  const actions: Array<[string, EntryKind, string]> = [['Venta', 'sale', 'bg-lime'], ['Gasto', 'expense', 'bg-peach'], ['Retiro', 'withdrawal', 'bg-lilac']]
  return (
    <main className="px-4 pb-8 pt-6 sm:px-8 sm:pt-9 lg:px-12"><div className="mx-auto max-w-4xl">
      <PageHeader eyebrow="Entradas y salidas" title="Caja de hoy" />
      <section className="mt-6 rounded-[2rem] bg-ink p-6 text-white shadow-card sm:p-8"><p className="text-sm font-semibold text-white/55">Deberías tener</p><p className="mt-1 text-5xl font-black tracking-tight">{money(income - output)}</p><div className="mt-7 grid grid-cols-2 gap-4 border-t border-white/10 pt-5"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-full bg-mint/15 text-mint"><ArrowDownLeft size={19} /></span><div><p className="text-xs text-white/45">Entró</p><p className="font-black text-mint">{money(income)}</p></div></div><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-full bg-peach/15 text-peach"><ArrowUpRight size={19} /></span><div><p className="text-xs text-white/45">Salió</p><p className="font-black text-peach">{money(output)}</p></div></div></div></section>
      <div className="mt-4 grid grid-cols-3 gap-3">{actions.map(([label, kind, color]) => <button key={label} onClick={() => openEntry(kind)} className={`${color} rounded-2xl px-3 py-3.5 text-sm font-black shadow-soft`}><Plus size={17} className="mx-auto mb-1" />{label}</button>)}</div>
      <section className="mt-8"><h2 className="text-xl font-black">Movimientos</h2><div className="mt-3 overflow-hidden rounded-[1.7rem] bg-white shadow-soft">{ledger.cash.map((item, index) => <div key={item.id} className={`flex items-center gap-3 p-4 sm:px-5 ${index ? 'border-t border-ink/7' : ''}`}><span className={`grid size-10 place-items-center rounded-full ${item.kind === 'sale' ? 'bg-lime' : item.kind === 'expense' ? 'bg-peach' : 'bg-lilac'}`}>{item.kind === 'sale' ? <Plus size={18} /> : <Minus size={18} />}</span><div className="min-w-0 flex-1"><p className="truncate font-extrabold">{item.note}</p><p className="text-xs font-semibold text-ink/40">{shortDate(item.createdAt)} · {item.kind === 'sale' ? 'Venta' : item.kind === 'expense' ? 'Gasto' : 'Retiro'}</p></div><p className={`font-black ${item.kind === 'sale' ? 'text-[#168c5b]' : ''}`}>{item.kind === 'sale' ? '+' : '−'}{money(item.amount)}</p></div>)}</div></section>
    </div></main>
  )
}
