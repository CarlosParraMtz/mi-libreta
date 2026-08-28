import { CheckCircle2, Mail, XCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { apiRequest } from '../lib/api'

export function AcceptInvitation() {
  const [params] = useSearchParams()
  const token = params.get('token')
  const navigate = useNavigate()
  const started = useRef(false)
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>(token ? 'loading' : 'error')
  const [message, setMessage] = useState(token ? 'Estamos agregando la libreta a tu cuenta…' : 'El enlace de invitación está incompleto.')
  useEffect(() => {
    if (!token || started.current) return
    started.current = true
    void apiRequest<{ businessId: string }>('/invitations/accept', { method: 'POST', body: JSON.stringify({ token }) })
      .then(() => { setStatus('success'); setMessage('Ya puedes administrar esta libreta.'); window.setTimeout(() => navigate('/dashboard', { replace: true }), 1200) })
      .catch((issue) => { setStatus('error'); setMessage(issue instanceof Error ? issue.message : 'No pudimos aceptar la invitación.') })
  }, [navigate, token])
  const Icon = status === 'error' ? XCircle : status === 'success' ? CheckCircle2 : Mail
  return <main className="grid min-h-screen place-items-center bg-cream p-4 text-ink"><section className="w-full max-w-md rounded-[2rem] bg-white p-7 text-center shadow-card"><span className={`mx-auto grid size-16 place-items-center rounded-full ${status === 'error' ? 'bg-peach' : 'bg-lime'}`}><Icon size={29} /></span><h1 className="mt-5 text-3xl font-black">{status === 'loading' ? 'Aceptando invitación' : status === 'success' ? '¡Todo listo!' : 'No se pudo aceptar'}</h1><p className="mt-3 font-semibold text-ink/50">{message}</p>{status === 'error' && <Link to="/dashboard" className="mt-6 block rounded-2xl bg-ink px-5 py-3.5 font-black text-white">Ir a mi dashboard</Link>}</section></main>
}
