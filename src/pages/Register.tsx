import { createUserWithEmailAndPassword, getAdditionalUserInfo, GoogleAuthProvider, signInWithPopup, updateProfile } from 'firebase/auth'
import { useSetAtom } from 'jotai'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AuthLayout, authInputClass } from '../components/AuthLayout'
import { authErrorMessage } from '../lib/auth-errors'
import { auth } from '../lib/firebase'
import { signedInDestination } from '../lib/session-routing'
import { prepareRegistrationAtom } from '../state/store'

export function Register() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const requestedPath = searchParams.get('returnTo')
  const returnTo = requestedPath?.startsWith('/') ? requestedPath : '/onboarding'
  const prepare = useSetAtom(prepareRegistrationAtom)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setLoading(true); setError('')
    const form = new FormData(event.currentTarget); const name = String(form.get('name')); const email = String(form.get('email')); const password = String(form.get('password'))
    if (password !== String(form.get('confirmPassword'))) { setError('Las contraseñas no coinciden.'); setLoading(false); return }
    prepare(name)
    if (!auth) { setError('Configura Firebase para crear una cuenta.'); setLoading(false); return }
    try { const result = await createUserWithEmailAndPassword(auth, email, password); await updateProfile(result.user, { displayName: name }); navigate(await signedInDestination(result.user, returnTo)) } catch (issue) { setError(authErrorMessage(issue)); setLoading(false) }
  }
  const google = async () => {
    setLoading(true); setError('')
    if (!auth) { setError('Configura Firebase para crear una cuenta.'); setLoading(false); return }
    try { const result = await signInWithPopup(auth, new GoogleAuthProvider()); if (getAdditionalUserInfo(result)?.isNewUser) prepare(result.user.displayName || 'Dueño'); navigate(await signedInDestination(result.user, returnTo)) } catch (issue) { setError(authErrorMessage(issue)); setLoading(false) }
  }
  return <AuthLayout><div className="rounded-[2rem] bg-white p-6 shadow-card sm:p-8"><p className="text-xs font-black uppercase tracking-[.16em] text-coral">Primer mes gratis</p><h1 className="mt-2 text-3xl font-black tracking-tight">Crea tu libreta</h1><p className="mt-2 text-sm font-semibold text-ink/45">Toma menos de dos minutos dejarla a tu gusto.</p><button onClick={google} disabled={loading} className="mt-7 flex w-full items-center justify-center gap-3 rounded-2xl border border-ink/10 px-4 py-3.5 font-black hover:bg-cream disabled:opacity-50"><span className="grid size-6 place-items-center rounded-full text-base font-black text-[#4285F4] shadow-sm">G</span> Registrarme con Google</button><div className="my-5 flex items-center gap-3"><span className="h-px flex-1 bg-ink/10" /><span className="text-xs font-bold text-ink/30">o con tu correo</span><span className="h-px flex-1 bg-ink/10" /></div><form onSubmit={submit} className="space-y-3.5"><label className="block"><span className="mb-1.5 block text-sm font-extrabold text-ink/60">Tu nombre</span><input name="name" className={authInputClass} autoComplete="name" placeholder="Ej. Luisa" required /></label><label className="block"><span className="mb-1.5 block text-sm font-extrabold text-ink/60">Correo</span><input name="email" type="email" className={authInputClass} autoComplete="email" placeholder="tu@negocio.com" required /></label><div className="grid grid-cols-2 gap-3"><label className="block"><span className="mb-1.5 block text-sm font-extrabold text-ink/60">Contraseña</span><input name="password" type="password" minLength={6} className={authInputClass} autoComplete="new-password" placeholder="6+ caracteres" required /></label><label className="block"><span className="mb-1.5 block text-sm font-extrabold text-ink/60">Confirmar</span><input name="confirmPassword" type="password" minLength={6} className={authInputClass} autoComplete="new-password" placeholder="Repetir" required /></label></div>{error && <p role="alert" className="rounded-2xl bg-peach/55 p-3 text-sm font-bold">{error}</p>}<button disabled={loading} className="w-full rounded-2xl bg-ink px-5 py-4 font-black text-white shadow-soft disabled:opacity-50">{loading ? 'Creando…' : 'Crear mi cuenta'}</button></form><p className="mt-4 text-center text-xs font-semibold leading-relaxed text-ink/40">Al registrarte aceptas los <Link to="/terminos" className="font-black text-coral">Términos de uso</Link> y reconoces el <Link to="/aviso-de-privacidad" className="font-black text-coral">Aviso de privacidad</Link>.</p><p className="mt-5 text-center text-sm font-semibold text-ink/45">¿Ya tienes cuenta? <Link to="/iniciar-sesion" className="font-black text-coral">Entra aquí</Link></p></div></AuthLayout>
}
