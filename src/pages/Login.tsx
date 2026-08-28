import { getAdditionalUserInfo, GoogleAuthProvider, onAuthStateChanged, signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth'
import { useSetAtom } from 'jotai'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AuthLayout, authInputClass } from '../components/AuthLayout'
import { authErrorMessage } from '../lib/auth-errors'
import { auth, isFirebaseConfigured } from '../lib/firebase'
import { prepareRegistrationAtom } from '../state/store'

export function Login() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const requestedPath = searchParams.get('returnTo')
  const returnTo = requestedPath?.startsWith('/') ? requestedPath : '/dashboard'
  const prepare = useSetAtom(prepareRegistrationAtom)
  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(isFirebaseConfigured)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!auth) {
      return
    }
    return onAuthStateChanged(auth, (user) => {
      if (user) navigate(returnTo, { replace: true })
      else setCheckingSession(false)
    })
  }, [navigate, returnTo])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setLoading(true); setError('')
    const form = new FormData(event.currentTarget)
    if (!auth) { setError('Configura Firebase para iniciar sesión.'); setLoading(false); return }
    try { await signInWithEmailAndPassword(auth, String(form.get('email')), String(form.get('password'))); navigate(returnTo) } catch (issue) { setError(authErrorMessage(issue)); setLoading(false) }
  }

  const google = async () => {
    setLoading(true); setError('')
    if (!auth) { setError('Configura Firebase para iniciar sesión.'); setLoading(false); return }
    try { const result = await signInWithPopup(auth, new GoogleAuthProvider()); const isNew = getAdditionalUserInfo(result)?.isNewUser; if (isNew) prepare(result.user.displayName || 'Dueño'); navigate(returnTo !== '/dashboard' ? returnTo : isNew ? '/onboarding' : '/dashboard') } catch (issue) { setError(authErrorMessage(issue)); setLoading(false) }
  }

  if (checkingSession) return <div className="grid min-h-screen place-items-center bg-cream font-black text-ink/40">Revisando tu sesión…</div>
  return <AuthLayout><div className="rounded-[2rem] bg-white p-6 shadow-card sm:p-8"><p className="text-xs font-black uppercase tracking-[.16em] text-coral">Qué gusto verte</p><h1 className="mt-2 text-3xl font-black tracking-tight">Entra a tu negocio</h1><p className="mt-2 text-sm font-semibold text-ink/45">Tus cuentas siguen justo donde las dejaste.</p><button onClick={google} disabled={loading || !isFirebaseConfigured} className="mt-7 flex w-full items-center justify-center gap-3 rounded-2xl border border-ink/10 bg-white px-4 py-3.5 font-black transition hover:bg-cream disabled:opacity-50"><span className="grid size-6 place-items-center rounded-full bg-white text-base font-black text-[#4285F4] shadow-sm">G</span> Continuar con Google</button><div className="my-5 flex items-center gap-3"><span className="h-px flex-1 bg-ink/10" /><span className="text-xs font-bold text-ink/30">o con tu correo</span><span className="h-px flex-1 bg-ink/10" /></div><form onSubmit={submit} className="space-y-4"><label className="block"><span className="mb-1.5 block text-sm font-extrabold text-ink/60">Correo</span><input name="email" type="email" autoComplete="email" className={authInputClass} placeholder="tu@negocio.com" required /></label><label className="block"><span className="mb-1.5 flex items-center justify-between text-sm font-extrabold text-ink/60">Contraseña <Link to="/recuperar-contrasena" className="text-xs text-coral">¿La olvidaste?</Link></span><input name="password" type="password" autoComplete="current-password" className={authInputClass} placeholder="••••••••" required /></label>{error && <p role="alert" className="rounded-2xl bg-peach/55 p-3 text-sm font-bold">{error}</p>}<button disabled={loading || !isFirebaseConfigured} className="w-full rounded-2xl bg-ink px-5 py-4 font-black text-white shadow-soft disabled:opacity-50">{loading ? 'Entrando…' : 'Entrar a Mi Libreta'}</button></form><p className="mt-6 text-center text-sm font-semibold text-ink/45">¿Aún no tienes cuenta? <Link to={`/registro?returnTo=${encodeURIComponent(returnTo)}`} className="font-black text-coral">Crea una gratis</Link></p>{!isFirebaseConfigured && <p className="mt-4 rounded-2xl bg-peach/50 p-3 text-center text-xs font-bold text-ink/60">Falta configurar Firebase. Ya no se usan datos de demostración.</p>}</div></AuthLayout>
}
