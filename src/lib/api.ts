import { auth } from './firebase'

export const apiBaseUrl = String(import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const user = auth?.currentUser
  if (!user) throw new Error('Tu sesión expiró. Vuelve a iniciar sesión.')
  if (!apiBaseUrl) throw new Error('La API todavía no está configurada.')
  const token = await user.getIdToken()
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(init.headers || {}) },
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || 'No pudimos completar la solicitud.')
  return payload as T
}
