import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Check, Store } from 'lucide-react'
import { useAtomValue, useSetAtom } from 'jotai'
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { authInputClass } from '../components/AuthLayout'
import { createBusinessForCurrentUser } from '../lib/firebase-repository'
import { moduleOptions } from '../lib/modules'
import type { ProductModule } from '../lib/types'
import { ledgerAtom } from '../state/store'

const businessTypes = ['Abarrotes y tienda de barrio', 'Ropa, calzado o accesorios', 'Comida y bebidas', 'Estética o servicios', 'Papelería', 'Otro negocio']

export function Onboarding() {
  const current = useAtomValue(ledgerAtom)
  const setLedger = useSetAtom(ledgerAtom)
  const navigate = useNavigate()
  const location = useLocation()
  const creatingAdditional = location.pathname === '/nueva-libreta'
  const [step, setStep] = useState(0)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [ledgerName, setLedgerName] = useState(creatingAdditional ? '' : current.ledgerName)
  const [businessName, setBusinessName] = useState(creatingAdditional ? '' : current.businessName)
  const [ownerName, setOwnerName] = useState(current.ownerName)
  const [businessType, setBusinessType] = useState(creatingAdditional ? '' : current.businessType)
  const [phone, setPhone] = useState(creatingAdditional ? '' : current.phone)
  const [modules, setModules] = useState<ProductModule[]>(creatingAdditional ? ['credits'] : current.enabledModules.length ? current.enabledModules : ['credits'])
  const toggleModule = (module: ProductModule) => setModules((selected) => selected.includes(module) ? selected.filter((item) => item !== module) : [...selected, module])
  const next = () => { if (step === 0 && (!ledgerName.trim() || !businessName.trim() || !ownerName.trim() || !businessType)) { setError('Completa el nombre de la libreta, negocio, encargado y tipo de negocio.'); return } if (step === 1 && !modules.length) { setError('Elige al menos una herramienta para tu libreta.'); return } setError(''); setStep((value) => Math.min(2, value + 1)) }
  const complete = async () => {
    setSaving(true); setError('')
    try {
      const created = await createBusinessForCurrentUser({ ledgerName: ledgerName.trim(), businessName: businessName.trim(), ownerName: ownerName.trim(), businessType, phone, enabledModules: modules })
      setLedger(created)
      navigate('/dashboard')
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'No pudimos crear tu libreta.')
      setSaving(false)
    }
  }

  return <main className="min-h-screen bg-cream px-4 py-6 text-ink sm:px-8 sm:py-10"><div className="mx-auto max-w-3xl"><header className="flex items-center justify-between"><span className="text-2xl font-black"><span className="text-coral">Mi</span> Libreta</span><p className="text-sm font-extrabold text-ink/35">Paso {step + 1} de 3</p></header><div className="mt-6 flex gap-2">{[0, 1, 2].map((item) => <span key={item} className={`h-2 flex-1 rounded-full transition ${item <= step ? 'bg-coral' : 'bg-ink/10'}`} />)}</div><AnimatePresence mode="wait"><motion.section key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: .2 }} className="mt-7 rounded-[2rem] bg-white p-6 shadow-card sm:p-9">
    {step === 0 && <><span className="grid size-13 place-items-center rounded-2xl bg-peach"><Store size={24} /></span><h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">{creatingAdditional ? 'Crea otra libreta' : 'Cuéntanos de tu negocio'}</h1><p className="mt-2 font-semibold text-ink/45">Cada libreta es independiente y comienza con 30 días de prueba.</p><div className="mt-7 grid gap-4 sm:grid-cols-2"><label><span className="mb-1.5 block text-sm font-extrabold text-ink/60">Nombre de la libreta</span><input value={ledgerName} onChange={(event) => setLedgerName(event.target.value)} className={authInputClass} placeholder="Ej. Sucursal Centro" autoFocus /></label><label><span className="mb-1.5 block text-sm font-extrabold text-ink/60">Nombre del negocio</span><input value={businessName} onChange={(event) => setBusinessName(event.target.value)} className={authInputClass} placeholder="Ej. Abarrotes Lupita" /></label><label><span className="mb-1.5 block text-sm font-extrabold text-ink/60">¿Quién lo atiende?</span><input value={ownerName} onChange={(event) => setOwnerName(event.target.value)} className={authInputClass} placeholder="Ej. Luisa" /></label><label><span className="mb-1.5 block text-sm font-extrabold text-ink/60">Tipo de negocio</span><select value={businessType} onChange={(event) => setBusinessType(event.target.value)} className={authInputClass}><option value="">Selecciona uno</option>{businessTypes.map((type) => <option key={type}>{type}</option>)}</select></label><label className="sm:col-span-2"><span className="mb-1.5 block text-sm font-extrabold text-ink/60">WhatsApp del negocio</span><input value={phone} onChange={(event) => setPhone(event.target.value)} className={authInputClass} inputMode="tel" placeholder="10 dígitos" /></label></div></>}
    {step === 1 && <><p className="text-xs font-black uppercase tracking-[.16em] text-coral">Arma tu app</p><h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">¿Qué quieres llevar aquí?</h1><p className="mt-2 font-semibold text-ink/45">Elige sólo lo que necesitas. Podrás cambiarlo después en Configuración.</p><div className="mt-7 grid gap-4 sm:grid-cols-2">{moduleOptions.map(({ id, title, description, color, icon: Icon }) => { const selected = modules.includes(id); return <button type="button" onClick={() => toggleModule(id)} key={id} className={`relative rounded-[1.6rem] border-2 p-5 text-left transition ${selected ? 'border-ink shadow-soft' : 'border-transparent bg-cream opacity-65'}`}><span className={`grid size-11 place-items-center rounded-2xl ${color}`}><Icon size={21} /></span>{selected && <span className="absolute right-4 top-4 grid size-6 place-items-center rounded-full bg-ink text-white"><Check size={14} /></span>}<p className="mt-6 text-lg font-black">{title}</p><p className="mt-1 text-sm font-semibold leading-relaxed text-ink/45">{description}</p></button> })}</div></>}
    {step === 2 && <div className="text-center"><span className="mx-auto grid size-16 place-items-center rounded-full bg-lime"><Check size={30} /></span><p className="mt-6 text-xs font-black uppercase tracking-[.16em] text-coral">Todo listo</p><h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">{ledgerName} está lista</h1><p className="mx-auto mt-3 max-w-lg font-semibold text-ink/45">Configuramos <strong className="text-ink">{businessName}</strong> con {modules.length} {modules.length === 1 ? 'herramienta' : 'herramientas'} y una prueba gratuita independiente de 30 días.</p><div className="mx-auto mt-7 flex max-w-md flex-wrap justify-center gap-2">{modules.map((id) => { const option = moduleOptions.find((item) => item.id === id)!; return <span key={id} className={`${option.color} rounded-full px-4 py-2 text-sm font-black`}>{option.title}</span> })}</div></div>}
    {error && <p role="alert" className="mt-5 rounded-2xl bg-peach/55 p-3 text-sm font-bold">{error}</p>}<div className="mt-8 flex gap-3">{step > 0 && <button disabled={saving} onClick={() => { setError(''); setStep((value) => value - 1) }} className="flex items-center gap-2 rounded-2xl bg-cream px-5 py-3.5 font-black disabled:opacity-50"><ArrowLeft size={18} /> Atrás</button>}<button disabled={saving} onClick={step === 2 ? complete : next} className="ml-auto flex items-center gap-2 rounded-2xl bg-ink px-6 py-3.5 font-black text-white shadow-soft disabled:opacity-50">{saving ? 'Creando libreta…' : step === 2 ? 'Entrar a mi negocio' : 'Continuar'} <ArrowRight size={18} /></button></div>
  </motion.section></AnimatePresence></div></main>
}
