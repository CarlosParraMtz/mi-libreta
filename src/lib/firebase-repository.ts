import { apiRequest } from './api'
import { normalizeLedger } from './empty-data'
import type { ProductModule } from './types'

export interface BusinessSetup {
  ledgerName: string
  businessName: string
  ownerName: string
  businessType: string
  phone: string
  enabledModules: ProductModule[]
}

export async function createBusinessForCurrentUser(setup: BusinessSetup) {
  const result = await apiRequest<{ business: Parameters<typeof normalizeLedger>[0] & { id: string } }>('/businesses', {
    method: 'POST',
    body: JSON.stringify(setup),
  })
  return normalizeLedger(result.business, result.business.id)
}
