import { BookOpen, ChevronRight, RefreshCw, Search, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiRequest } from '../lib/api'

interface BusinessSummary {
  id: string
  businessName: string
  ownerName: string
  businessType: string
  createdAt?: string
  subscription: { status: string; accessOverride?: string | null }
  counts: { customers: number; orders: number; credits: number; layaways: number }
}

export function Admin() {
  const [businesses, setBusinesses] = useState<BusinessSummary[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const load = () => { setLoading(true); setError(''); void apiRequest<{ businesses: BusinessSummary[] }>('/admin/businesses').then((result) => setBusinesses(result.businesses)).catch((issue) => setError(issue instanceof Error ? issue.message : 'No pudimos cargar las libretas.')).finally(() => setLoading(false)) }
  useEffect(() => {
    let active = true
    void apiRequest<{ businesses: BusinessSummary[] }>('/admin/businesses')
      .then((result) => { if (active) setBusinesses(result.businesses) })
      .catch((issue) => { if (active) setError(issue instanceof Error ? issue.message : 'No pudimos cargar las libretas.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])
  const visible = businesses.filter((business) => `${business.businessName} ${business.ownerName} ${business.businessType}`.toLowerCase().includes(query.toLowerCase()))
  return <main className="min-h-screen bg-cream px-4 py-6 text-ink sm:px-8 lg:px-12"><div className="mx-auto max-w-6xl"><header className="flex items-center justify-between"><div><p className="flex items-center gap-2 text-xs font-black uppercase tracking-[.16em] text-coral"><ShieldCheck size={16} /> Administración</p><h1 className="mt-2 text-4xl font-black tracking-tight">Libretas registradas</h1><p className="mt-1 font-semibold text-ink/40">Configura negocios y supervisa sus suscripciones.</p></div><div className="flex gap-2"><button onClick={load} className="grid size-11 place-items-center rounded-full bg-white shadow-soft" aria-label="Actualizar"><RefreshCw size={19} /></button><Link to="/dashboard" className="rounded-full bg-ink px-5 py-3 text-sm font-black text-white">Mi dashboard</Link></div></header><div className="relative mt-7"><Search size={19} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/35" /><input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full rounded-2xl bg-white py-3.5 pl-11 pr-4 font-bold shadow-soft outline-none" placeholder="Buscar libreta, dueño o giro" /></div>{error && <p className="mt-5 rounded-2xl bg-peach/55 p-4 font-bold">{error}</p>}<div className="mt-5 grid gap-4 lg:grid-cols-2">{visible.map((business) => <Link to={`/admin/libretas/${business.id}`} key={business.id} className="rounded-[1.8rem] bg-white p-5 shadow-soft transition hover:-translate-y-0.5"><div className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-lime"><BookOpen size={20} /></span><div className="min-w-0 flex-1"><p className="truncate text-lg font-black">{business.businessName || 'Sin nombre'}</p><p className="truncate text-sm font-semibold text-ink/40">{business.ownerName} · {business.businessType}</p></div><ChevronRight className="text-ink/25" /></div><div className="mt-5 grid grid-cols-4 gap-2 text-center">{[['Clientes', business.counts.customers], ['Pedidos', business.counts.orders], ['Fiados', business.counts.credits], ['Apartados', business.counts.layaways]].map(([label, count]) => <div key={label} className="rounded-xl bg-cream p-2"><p className="font-black">{count}</p><p className="text-[10px] font-bold text-ink/35">{label}</p></div>)}</div><div className="mt-4 flex items-center justify-between border-t border-ink/8 pt-4"><span className={`rounded-full px-3 py-1 text-xs font-black ${business.subscription.accessOverride === 'suspended' ? 'bg-peach' : business.subscription.status === 'active' || business.subscription.status === 'trialing' ? 'bg-lime' : 'bg-cream'}`}>{business.subscription.accessOverride === 'suspended' ? 'Suspendida' : business.subscription.status || 'none'}</span>{business.createdAt && <span className="text-xs font-semibold text-ink/35">{new Intl.DateTimeFormat('es-MX').format(new Date(business.createdAt))}</span>}</div></Link>)}{loading && <p className="col-span-full py-12 text-center font-black text-ink/35">Cargando libretas…</p>}{!loading && !visible.length && <p className="col-span-full py-12 text-center font-black text-ink/35">No hay libretas que coincidan.</p>}</div></div></main>
}
