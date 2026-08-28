import type { LedgerData } from './types'

export const emptyLedger: LedgerData = {
  ledgerName: '',
  ownerId: '',
  adminIds: [],
  memberIds: [],
  administrators: [],
  businessName: '',
  ownerName: '',
  businessType: '',
  phone: '',
  enabledModules: [],
  onboardingComplete: false,
  subscription: { status: 'none', accessOverride: null },
  customers: [],
  orders: [],
  credits: [],
  layaways: [],
  cash: [],
}

export const normalizeLedger = (value: Partial<LedgerData>, id?: string): LedgerData => ({
  ...emptyLedger,
  ...value,
  id: id ?? value.id,
  ledgerName: value.ledgerName || value.businessName || '',
  adminIds: value.adminIds ?? (value.ownerId ? [value.ownerId] : []),
  memberIds: value.memberIds ?? (value.ownerId ? [value.ownerId] : []),
  administrators: value.administrators ?? [],
  enabledModules: value.enabledModules ?? [],
  subscription: { ...emptyLedger.subscription, ...(value.subscription ?? {}) },
  customers: value.customers ?? [],
  orders: value.orders ?? [],
  credits: value.credits ?? [],
  layaways: value.layaways ?? [],
  cash: value.cash ?? [],
})
