import { ArrowLeft, CalendarDays, Check, CreditCard, Infinity as InfinityIcon, RotateCcw, Save, ShieldAlert, Trash2, Users } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { authInputClass } from '../components/AuthLayout'
import { apiRequest } from '../lib/api'
import { normalizeLedger } from '../lib/empty-data'
import { moduleOptions } from '../lib/modules'
import type { LedgerData, ProductModule } from '../lib/types'

export function AdminBusiness() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [business, setBusiness] = useState<LedgerData | null>(null)
  const [modules, setModules] = useState<ProductModule[]>([])
  const [accessDate, setAccessDate] = useState('')
  const [minimumAccessDate] = useState(() => new Date(Date.now() + 86_400_000).toISOString().slice(0, 10))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const applyBusiness = (value: LedgerData) => {
    const normalized = normalizeLedger(value, id)
    setBusiness(normalized)
    setModules(normalized.enabledModules)
    setAccessDate(normalized.subscription.accessUntil?.slice(0, 10) || '')
  }

  const load = async () => {
    setLoading(true)
    try {
      const result = await apiRequest<{ business: LedgerData }>(`/admin/businesses/${id}`)
      applyBusiness(result.business)
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'No pudimos cargar la libreta.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    void apiRequest<{ business: LedgerData }>(`/admin/businesses/${id}`)
      .then((result) => {
        if (!active) return
        const normalized = normalizeLedger(result.business, id)
        setBusiness(normalized)
        setModules(normalized.enabledModules)
        setAccessDate(normalized.subscription.accessUntil?.slice(0, 10) || '')
      })
      .catch((issue) => { if (active) setError(issue instanceof Error ? issue.message : 'No pudimos cargar la libreta.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id])

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setLoading(true)
    setError('')
    try {
      await apiRequest(`/admin/businesses/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ ledgerName: form.get('ledgerName'), businessName: form.get('businessName'), ownerName: form.get('ownerName'), businessType: form.get('businessType'), phone: form.get('phone'), enabledModules: modules }),
      })
      await load()
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'No pudimos guardar.')
      setLoading(false)
    }
  }

  const subscriptionAction = async (action: string, values: Record<string, unknown> = {}) => {
    setLoading(true)
    setError('')
    try {
      await apiRequest(`/admin/businesses/${id}/subscription`, { method: 'POST', body: JSON.stringify({ action, ...values }) })
      await load()
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'No pudimos cambiar el acceso.')
      setLoading(false)
    }
  }

  const grantUntil = () => {
    if (!accessDate) { setError('Elige la fecha límite de acceso.'); return }
    const accessUntil = new Date(`${accessDate}T23:59:59.999`)
    if (!Number.isFinite(accessUntil.getTime()) || accessUntil.getTime() <= Date.now()) { setError('Elige una fecha futura.'); return }
    void subscriptionAction('grant-until', { accessUntil: accessUntil.toISOString() })
  }

  const deleteLedger = async () => {
    if (!business) return
    const confirmation = window.prompt(`Esta acción es definitiva y cancelará cualquier suscripción. Escribe "${business.ledgerName}" para borrar la libreta.`)
    if (confirmation !== business.ledgerName) return
    setLoading(true); setError('')
    try {
      await apiRequest(`/businesses/${id}`, { method: 'DELETE' })
      navigate('/admin', { replace: true })
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'No pudimos borrar la libreta.')
      setLoading(false)
    }
  }

  if (!business) return <main className="grid min-h-screen place-items-center bg-cream font-black text-ink/40">{error || 'Cargando libreta…'}</main>

  const subscription = business.subscription
  const accessLabel = subscription.accessOverride === 'unlimited'
    ? 'Acceso ilimitado'
    : subscription.accessOverride === 'until' && subscription.accessUntil
      ? `Acceso hasta ${new Intl.DateTimeFormat('es-MX').format(new Date(subscription.accessUntil))}`
      : subscription.accessOverride === 'suspended'
        ? 'Acceso suspendido'
        : 'Según prueba o suscripción'

  return <main className="min-h-screen bg-cream px-4 py-6 text-ink sm:px-8 lg:px-12"><div className="mx-auto max-w-6xl">
    <Link to="/admin" className="inline-flex items-center gap-2 text-sm font-black text-ink/45"><ArrowLeft size={18} /> Volver a libretas</Link>
    <header className="mt-5"><p className="text-xs font-black uppercase tracking-[.16em] text-coral">Administrar libreta</p><h1 className="mt-2 text-4xl font-black tracking-tight">{business.ledgerName}</h1><p className="mt-1 font-semibold text-ink/40">{business.businessName} · ID: {id}</p></header>
    {error && <p className="mt-5 rounded-2xl bg-peach/55 p-4 font-bold">{error}</p>}
    <div className="mt-6 grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
      <form onSubmit={save} className="rounded-[2rem] bg-white p-6 shadow-soft"><h2 className="text-xl font-black">Configuración del negocio</h2><div className="mt-5 grid gap-4 sm:grid-cols-2"><label><span className="mb-1.5 block text-sm font-bold text-ink/55">Nombre de la libreta</span><input name="ledgerName" defaultValue={business.ledgerName} className={authInputClass} /></label><label><span className="mb-1.5 block text-sm font-bold text-ink/55">Negocio</span><input name="businessName" defaultValue={business.businessName} className={authInputClass} /></label><label><span className="mb-1.5 block text-sm font-bold text-ink/55">Encargado</span><input name="ownerName" defaultValue={business.ownerName} className={authInputClass} /></label><label><span className="mb-1.5 block text-sm font-bold text-ink/55">Giro</span><input name="businessType" defaultValue={business.businessType} className={authInputClass} /></label><label className="sm:col-span-2"><span className="mb-1.5 block text-sm font-bold text-ink/55">WhatsApp</span><input name="phone" defaultValue={business.phone} className={authInputClass} /></label></div><p className="mt-6 text-sm font-black">Módulos activos</p><div className="mt-3 grid grid-cols-2 gap-3">{moduleOptions.map(({ id: moduleId, title, color, icon: Icon }) => { const selected = modules.includes(moduleId); return <button type="button" key={moduleId} onClick={() => setModules((items) => selected ? items.filter((item) => item !== moduleId) : [...items, moduleId])} className={`relative rounded-2xl border-2 p-4 text-left ${selected ? 'border-ink' : 'border-transparent bg-cream opacity-50'}`}><span className={`grid size-9 place-items-center rounded-xl ${color}`}><Icon size={17} /></span>{selected && <Check size={16} className="absolute right-3 top-3" />}<p className="mt-3 font-black">{title}</p></button> })}</div><button disabled={loading} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-ink px-5 py-3.5 font-black text-white disabled:opacity-50"><Save size={18} /> Guardar configuración</button></form>
      <div className="space-y-5">
        <section className="rounded-[2rem] bg-ink p-6 text-white shadow-card"><div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-2xl bg-lime text-ink"><CreditCard size={20} /></span><div><p className="text-xs font-bold text-white/45">Permiso administrativo</p><h2 className="text-xl font-black">{accessLabel}</h2></div></div><p className="mt-3 text-sm font-semibold text-white/45">La suscripción de Stripe conserva su estado; este permiso decide cuándo puede entrar la libreta.</p><div className="mt-5 grid gap-2"><button type="button" disabled={loading} onClick={() => void subscriptionAction('grant-unlimited')} className="flex items-center justify-center gap-2 rounded-xl bg-lime px-3 py-3 text-sm font-black text-ink disabled:opacity-50"><InfinityIcon size={17} /> Dar acceso ilimitado</button><div className="grid grid-cols-[1fr_auto] gap-2"><label className="relative"><CalendarDays size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" /><input type="date" value={accessDate} min={minimumAccessDate} onChange={(event) => setAccessDate(event.target.value)} className="w-full rounded-xl border-0 bg-white py-3 pl-10 pr-2 text-sm font-black text-ink outline-none" aria-label="Fecha límite de acceso" /></label><button type="button" disabled={loading || !accessDate} onClick={grantUntil} className="rounded-xl bg-sky px-4 text-sm font-black text-ink disabled:opacity-50">Aplicar fecha</button></div><div className="grid grid-cols-2 gap-2"><button type="button" disabled={loading} onClick={() => void subscriptionAction('restore')} className="flex items-center justify-center gap-2 rounded-xl bg-white/10 px-3 py-2.5 text-sm font-black disabled:opacity-50"><RotateCcw size={15} /> Usar suscripción</button><button type="button" disabled={loading} onClick={() => void subscriptionAction('suspend')} className="rounded-xl bg-coral px-3 py-2.5 text-sm font-black disabled:opacity-50">Suspender</button></div></div>{subscription.stripeSubscriptionId && <button type="button" disabled={loading} onClick={() => void subscriptionAction(subscription.cancelAtPeriodEnd ? 'resume' : 'cancel')} className="mt-3 w-full rounded-xl bg-white/10 px-3 py-2.5 text-sm font-black disabled:opacity-50">{subscription.cancelAtPeriodEnd ? 'Reanudar cobro en Stripe' : 'Cancelar Stripe al final'}</button>}</section>
        <section className="rounded-[2rem] bg-white p-6 shadow-soft"><div className="flex items-center gap-3"><Users size={21} /><h2 className="text-xl font-black">Administradores</h2></div><div className="mt-4 space-y-2">{business.administrators.map((administrator) => <div key={administrator.uid} className="rounded-xl bg-cream px-3 py-2"><p className="text-sm font-black">{administrator.displayName || administrator.email}</p><p className="text-xs font-semibold text-ink/40">{administrator.role === 'owner' ? 'Propietario' : administrator.email}</p></div>)}</div><div className="mt-5 grid grid-cols-2 gap-3">{[['Clientes', business.customers.length], ['Pedidos', business.orders.length], ['Fiados', business.credits.length], ['Apartados', business.layaways.length]].map(([label, value]) => <div key={label} className="rounded-2xl bg-cream p-4"><p className="text-2xl font-black">{value}</p><p className="text-xs font-bold text-ink/40">{label}</p></div>)}</div></section>
      </div>
    </div>
    <section className="mt-5 rounded-[2rem] bg-white p-6 shadow-soft"><div className="flex items-center gap-2"><ShieldAlert size={20} /><h2 className="text-xl font-black">Actividad reciente</h2></div><div className="mt-5 grid gap-5 lg:grid-cols-2"><div><p className="text-sm font-black">Clientes</p><div className="mt-2 divide-y divide-ink/8">{business.customers.slice(0, 5).map((customer) => <div key={customer.id} className="flex justify-between py-3 text-sm"><span className="font-bold">{customer.name}</span><span className="text-ink/40">{customer.phone || 'Sin teléfono'}</span></div>)}</div></div><div><p className="text-sm font-black">Pedidos</p><div className="mt-2 divide-y divide-ink/8">{business.orders.slice(0, 5).map((order) => <div key={order.id} className="flex justify-between gap-3 py-3 text-sm"><span className="truncate font-bold">{order.items}</span><span className="shrink-0 text-ink/40">{order.status}</span></div>)}</div></div></div></section>
    <section className="mt-5 rounded-[2rem] border border-coral/20 bg-white p-6 shadow-soft"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-black uppercase tracking-[.16em] text-coral">Zona de peligro</p><h2 className="mt-1 text-xl font-black">Borrar esta libreta</h2><p className="mt-1 text-sm font-semibold text-ink/45">Elimina todos los datos y accesos y cancela inmediatamente la suscripción de Stripe.</p></div><button type="button" disabled={loading} onClick={() => void deleteLedger()} className="flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-coral px-5 py-3.5 font-black text-white disabled:opacity-50"><Trash2 size={18} /> {loading ? 'Procesando…' : 'Borrar libreta'}</button></div></section>
  </div></main>
}
