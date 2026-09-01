import type { User } from 'firebase/auth'
import { apiBaseUrl, apiRequest } from './api'

export async function syncSession(user: User) {
  if (apiBaseUrl) {
    const role = await apiRequest<{ admin: boolean }>('/auth/sync-admin', { method: 'POST' }).catch(() => ({ admin: false }))
    await user.getIdToken(true)
    if (!role.admin) await apiRequest('/auth/sync-profile', { method: 'POST' }).catch(() => null)
  }
  const token = await user.getIdTokenResult(true)
  return { isAdmin: token.claims.admin === true }
}

export async function signedInDestination(user: User, requestedPath: string) {
  const { isAdmin } = await syncSession(user)
  if (isAdmin) return '/admin'
  return requestedPath.startsWith('/admin') ? '/onboarding' : requestedPath
}
