import { collection, doc, setDoc } from 'firebase/firestore'
import { auth, db } from './firebase'
import { emptyLedger, normalizeLedger } from './empty-data'
import type { ProductModule } from './types'

export interface BusinessSetup {
  businessName: string
  ownerName: string
  businessType: string
  phone: string
  enabledModules: ProductModule[]
}

export async function createBusinessForCurrentUser(setup: BusinessSetup) {
  const user = auth?.currentUser
  if (!user || !db) throw new Error('Firebase no está configurado o la sesión expiró.')
  const businessRef = doc(collection(db, 'businesses'))
  const now = new Date().toISOString()
  const ledger = normalizeLedger({
    ...emptyLedger,
    ...setup,
    ownerId: user.uid,
    adminIds: [user.uid],
    memberIds: [user.uid],
    onboardingComplete: true,
    subscription: { status: 'none', accessOverride: null },
  }, businessRef.id)
  const businessData = { ...ledger }
  delete businessData.id
  await setDoc(businessRef, { ...businessData, createdAt: now, updatedAt: now })
  await setDoc(doc(db, 'users', user.uid), {
    email: user.email || '',
    displayName: setup.ownerName || user.displayName || '',
    defaultBusinessId: businessRef.id,
    businessIds: [businessRef.id],
    createdAt: now,
    updatedAt: now,
  }, { merge: true })
  return ledger
}
