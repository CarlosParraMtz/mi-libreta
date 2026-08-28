import { sendPasswordResetEmail } from 'firebase/auth'
import { CheckCircle2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { AuthLayout, authInputClass } from '../components/AuthLayout'
import { authErrorMessage } from '../lib/auth-errors'
import { auth } from '../lib/firebase'

export function ForgotPassword() {
  const [sent, setSent] = useState(false); const [error, setError] = useState(''); const [loading, setLoading] = useState(false)
  const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setLoading(true); setError(''); const email = String(new FormData(event.currentTarget).get('email')); if (!auth) { setSent(true); return } try { await sendPasswordResetEmail(auth, email); setSent(true) } catch (issue) { setError(authErrorMessage(issue)); setLoading(false) } }
  return <AuthLayout><div className="rounded-[2rem] bg-white p-6 shadow-card sm:p-8">{sent ? <div className="py-4 text-center"><span className="mx-auto grid size-16 place-items-center rounded-full bg-lime"><CheckCircle2 size={30} /></span><h1 className="mt-5 text-3xl font-black">Revisa tu correo</h1><p className="mt-3 text-sm font-semibold leading-relaxed text-ink/50">Te mandamos un enlace para crear una nueva contraseña. Puede tardar un par de minutos.</p><Link to="/iniciar-sesion" className="mt-7 block rounded-2xl bg-ink px-5 py-4 font-black text-white">Volver a iniciar sesión</Link></div> : <><p className="text-xs font-black uppercase tracking-[.16em] text-coral">Recuperar acceso</p><h1 className="mt-2 text-3xl font-black tracking-tight">¿Olvidaste tu contraseña?</h1><p className="mt-3 text-sm font-semibold leading-relaxed text-ink/50">No pasa nada. Escribe tu correo y te enviaremos un enlace para cambiarla.</p><form onSubmit={submit} className="mt-7 space-y-4"><label className="block"><span className="mb-1.5 block text-sm font-extrabold text-ink/60">Correo de tu cuenta</span><input name="email" type="email" autoComplete="email" className={authInputClass} placeholder="tu@negocio.com" required /></label>{error && <p className="rounded-2xl bg-peach/55 p-3 text-sm font-bold">{error}</p>}<button disabled={loading} className="w-full rounded-2xl bg-ink px-5 py-4 font-black text-white disabled:opacity-50">{loading ? 'Enviando…' : 'Enviar enlace'}</button></form><p className="mt-6 text-center text-sm font-semibold"><Link to="/iniciar-sesion" className="text-coral">Ya recordé mi contraseña</Link></p></>}</div></AuthLayout>
}
