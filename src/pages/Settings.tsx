import { Check, CreditCard, LogOut, MailPlus, Plus, Save, Store, UserMinus, Users } from 'lucide-react'
import { signOut } from 'firebase/auth'
import { useAtomValue, useSetAtom } from 'jotai'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authInputClass } from '../components/AuthLayout'
import { PageHeader } from '../components/PageHeader'
import { apiRequest } from '../lib/api'
import { auth } from '../lib/firebase'
import { moduleOptions } from '../lib/modules'
import { useDeadlineClock } from '../lib/use-deadline-clock'
import type { ProductModule } from '../lib/types'
import { activeBusinessIdAtom, ledgerAtom, toastAtom, updateBusinessAtom } from '../state/store'

const subscriptionLabels = {
  none: 'Sin suscripción', incomplete: 'Pago incompleto', incomplete_expired: 'Pago vencido', trialing: 'Periodo de prueba', active: 'Activa', past_due: 'Pago pendiente', canceled: 'Cancelada', unpaid: 'Impagada', paused: 'Pausada',
}

export function Settings() {
  const ledger = useAtomValue(ledgerAtom)
  const businessId = useAtomValue(activeBusinessIdAtom)
  const update = useSetAtom(updateBusinessAtom)
  const showToast = useSetAtom(toastAtom)
  const navigate = useNavigate()
  const [modules, setModules] = useState<ProductModule[]>(ledger.enabledModules)
  const [error, setError] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteUrl, setInviteUrl] = useState('')
  const [billingLoading, setBillingLoading] = useState(false)
  const now = useDeadlineClock(ledger.subscription.accessOverride === 'until' ? ledger.subscription.accessUntil : ledger.subscription.trialEndsAt)

  const toggle = (id: ProductModule) => setModules((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id])
  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!modules.length) { setError('Deja al menos una herramienta activa.'); return }
    const form = new FormData(event.currentTarget)
    update({ ledgerName: String(form.get('ledgerName')), businessName: String(form.get('businessName')), ownerName: String(form.get('ownerName')), businessType: String(form.get('businessType')), phone: String(form.get('phone')), enabledModules: modules })
    setError(''); showToast('Configuración guardada')
  }
  const invite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setInviteLoading(true); setError('')
    try {
      const email = String(new FormData(event.currentTarget).get('email'))
      const result = await apiRequest<{ inviteUrl?: string }>('/invitations', { method: 'POST', body: JSON.stringify({ businessId, email, role: 'admin' }) })
      setInviteUrl(result.inviteUrl || '')
      event.currentTarget.reset(); showToast('Invitación enviada')
    } catch (issue) { setError(issue instanceof Error ? issue.message : 'No pudimos invitar a esa persona.') }
    finally { setInviteLoading(false) }
  }
  const billing = async (mode: 'checkout' | 'portal') => {
    if (!businessId) return
    setBillingLoading(true); setError('')
    try {
      const result = await apiRequest<{ url: string }>(`/billing/${mode}`, { method: 'POST', body: JSON.stringify({ businessId }) })
      window.location.assign(result.url)
    } catch (issue) { setError(issue instanceof Error ? issue.message : 'No pudimos abrir Stripe.'); setBillingLoading(false) }
  }
  const removeAdministrator = async (uid: string) => {
    if (!businessId) return
    setError('')
    try {
      await apiRequest(`/businesses/${businessId}/administrators/${uid}`, { method: 'DELETE' })
      showToast('Administrador eliminado')
    } catch (issue) { setError(issue instanceof Error ? issue.message : 'No pudimos quitar al administrador.') }
  }
  const leave = async () => { if (auth) await signOut(auth); navigate('/') }
  const subscription = ledger.subscription
  const hasStripeCustomer = Boolean(subscription.stripeCustomerId)
  const trialExpired = Boolean(subscription.trialEndsAt && new Date(subscription.trialEndsAt).getTime() <= now && !subscription.stripeSubscriptionId)
  const administrativeAccess = subscription.accessOverride === 'unlimited'
    ? 'Acceso ilimitado concedido por la plataforma'
    : subscription.accessOverride === 'until' && subscription.accessUntil
      ? new Date(subscription.accessUntil).getTime() > now
        ? `Acceso concedido hasta ${new Intl.DateTimeFormat('es-MX').format(new Date(subscription.accessUntil))}`
        : 'Acceso administrativo vencido'
      : null

  return <main className="px-4 pb-8 pt-6 sm:px-8 sm:pt-9 lg:px-12"><div className="mx-auto max-w-4xl"><PageHeader eyebrow="Tu cuenta" title="Configuración" />
    {error && <p role="alert" className="mt-5 rounded-2xl bg-peach/55 p-4 text-sm font-bold">{error}</p>}
    <form onSubmit={save} className="mt-6 space-y-5">
      <section className="rounded-[2rem] bg-white p-5 shadow-soft sm:p-7"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-2xl bg-peach"><Store size={21} /></span><div><h2 className="text-xl font-black">Datos de la libreta</h2><p className="text-sm font-semibold text-ink/40">Cada libreta tiene su propia configuración y suscripción.</p></div></div><Link to="/nueva-libreta" className="hidden items-center gap-2 rounded-xl bg-cream px-3 py-2 text-xs font-black sm:flex"><Plus size={15} /> Nueva</Link></div><div className="mt-6 grid gap-4 sm:grid-cols-2"><label><span className="mb-1.5 block text-sm font-extrabold text-ink/60">Nombre de la libreta</span><input name="ledgerName" defaultValue={ledger.ledgerName} className={authInputClass} required /></label><label><span className="mb-1.5 block text-sm font-extrabold text-ink/60">Nombre del negocio</span><input name="businessName" defaultValue={ledger.businessName} className={authInputClass} required /></label><label><span className="mb-1.5 block text-sm font-extrabold text-ink/60">Encargado</span><input name="ownerName" defaultValue={ledger.ownerName} className={authInputClass} required /></label><label><span className="mb-1.5 block text-sm font-extrabold text-ink/60">Tipo de negocio</span><input name="businessType" defaultValue={ledger.businessType} className={authInputClass} required /></label><label className="sm:col-span-2"><span className="mb-1.5 block text-sm font-extrabold text-ink/60">WhatsApp</span><input name="phone" defaultValue={ledger.phone} className={authInputClass} inputMode="tel" /></label></div><Link to="/nueva-libreta" className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-cream px-3 py-3 text-xs font-black sm:hidden"><Plus size={15} /> Crear otra libreta</Link></section>
      <section className="rounded-[2rem] bg-white p-5 shadow-soft sm:p-7"><h2 className="text-xl font-black">Herramientas de Mi Libreta</h2><p className="mt-1 text-sm font-semibold text-ink/40">Activa sólo lo que usas. La navegación cambiará automáticamente.</p><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{moduleOptions.map(({ id, title, description, color, icon: Icon }) => { const selected = modules.includes(id); return <button type="button" key={id} onClick={() => toggle(id)} className={`relative rounded-2xl border-2 p-4 text-left transition ${selected ? 'border-ink' : 'border-transparent bg-cream opacity-60'}`}><span className={`grid size-10 place-items-center rounded-xl ${color}`}><Icon size={19} /></span>{selected && <span className="absolute right-3 top-3 grid size-6 place-items-center rounded-full bg-ink text-white"><Check size={14} /></span>}<p className="mt-4 font-black">{title}</p><p className="mt-1 text-xs font-semibold leading-relaxed text-ink/45">{description}</p></button> })}</div></section>
      <div className="flex justify-end"><button className="flex items-center justify-center gap-2 rounded-2xl bg-ink px-6 py-3.5 font-black text-white shadow-soft"><Save size={18} /> Guardar cambios</button></div>
    </form>

    <section className="mt-5 rounded-[2rem] bg-white p-5 shadow-soft sm:p-7"><div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-2xl bg-sky"><Users size={21} /></span><div><h2 className="text-xl font-black">Administradores de esta libreta</h2><p className="text-sm font-semibold text-ink/40">Sólo tendrán acceso a {ledger.ledgerName}, no a tus demás libretas.</p></div></div>{ledger.administrators.length > 0 && <div className="mt-5 divide-y divide-ink/8 rounded-2xl bg-cream px-4">{ledger.administrators.map((administrator) => <div key={administrator.uid} className="flex items-center gap-3 py-3"><span className="grid size-9 place-items-center rounded-full bg-white font-black">{(administrator.displayName || administrator.email || '?').charAt(0).toUpperCase()}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-black">{administrator.displayName || administrator.email}</p><p className="truncate text-xs font-semibold text-ink/40">{administrator.role === 'owner' ? 'Propietario' : administrator.email}</p></div>{administrator.role !== 'owner' && <button type="button" onClick={() => void removeAdministrator(administrator.uid)} className="grid size-9 place-items-center rounded-full bg-white text-coral" aria-label={`Quitar a ${administrator.email}`}><UserMinus size={16} /></button>}</div>)}</div>}<form onSubmit={invite} className="mt-6 flex flex-col gap-3 sm:flex-row"><input name="email" type="email" className={authInputClass} placeholder="correo@ejemplo.com" required /><button disabled={inviteLoading || !businessId} className="flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-sky px-5 py-3.5 font-black disabled:opacity-50"><MailPlus size={18} /> {inviteLoading ? 'Invitando…' : 'Invitar'}</button></form>{inviteUrl && <div className="mt-4 rounded-2xl bg-cream p-4"><p className="text-xs font-black text-ink/45">SES aún no está configurado. Comparte este enlace:</p><a href={inviteUrl} className="mt-1 block break-all text-sm font-bold text-coral">{inviteUrl}</a></div>}<p className="mt-3 text-xs font-semibold text-ink/35">La persona debe entrar con ese mismo correo. Si ya tiene cuenta, el acceso se agrega inmediatamente.</p></section>

    <section className="mt-5 rounded-[2rem] bg-ink p-5 text-white shadow-card sm:p-7"><div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-2xl bg-lime text-ink"><CreditCard size={21} /></span><div><p className="text-xs font-bold text-white/45">Suscripción de {ledger.ledgerName}</p><h2 className="text-xl font-black">{administrativeAccess || (trialExpired ? 'Prueba vencida' : subscriptionLabels[subscription.status])}</h2>{subscription.trialEndsAt && !subscription.stripeSubscriptionId && <p className="text-xs font-semibold text-white/40">Prueba hasta {new Intl.DateTimeFormat('es-MX').format(new Date(subscription.trialEndsAt))}</p>}{subscription.currentPeriodEnd && <p className="text-xs font-semibold text-white/40">Periodo hasta {new Intl.DateTimeFormat('es-MX').format(new Date(subscription.currentPeriodEnd))}</p>}</div></div><button type="button" disabled={billingLoading || !businessId} onClick={() => billing(hasStripeCustomer ? 'portal' : 'checkout')} className="rounded-2xl bg-lime px-5 py-3.5 font-black text-ink disabled:opacity-50">{billingLoading ? 'Abriendo…' : hasStripeCustomer ? 'Administrar en Stripe' : 'Configurar pago'}</button></div>{subscription.accessOverride === 'suspended' && <p className="mt-4 rounded-xl bg-coral/20 p-3 text-sm font-bold text-peach">El acceso está suspendido por un administrador de la plataforma.</p>}</section>

    <button type="button" onClick={leave} className="mt-5 flex items-center gap-2 rounded-2xl bg-white px-5 py-3.5 font-black text-coral shadow-soft"><LogOut size={18} /> Cerrar sesión</button>
  </div></main>
}
