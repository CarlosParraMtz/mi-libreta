import { atom } from 'jotai'
import { emptyLedger } from '../lib/empty-data'
import type { CashKind, EntryKind, LedgerData, OrderStatus, ProductModule } from '../lib/types'

const id = () => crypto.randomUUID()

export const ledgerAtom = atom<LedgerData>(emptyLedger)
export const activeBusinessIdAtom = atom<string | null>(null)
export const syncStatusAtom = atom<'idle' | 'loading' | 'ready' | 'error'>('idle')
export const isPlatformAdminAtom = atom(false)
export const adminClaimStatusAtom = atom<'loading' | 'ready'>('loading')
export const entryModalAtom = atom<EntryKind>(null)
export const toastAtom = atom<string | null>(null)

export const addCashAtom = atom(null, (get, set, payload: { kind: CashKind; amount: number; note: string }) => {
  const current = get(ledgerAtom)
  set(ledgerAtom, { ...current, cash: [{ id: id(), createdAt: new Date().toISOString(), ...payload }, ...current.cash] })
})

export const addCreditAtom = atom(null, (get, set, payload: { customerId?: string; name?: string; phone?: string; amount: number; note: string }) => {
  const current = get(ledgerAtom)
  const customerId = payload.customerId || id()
  const customers = payload.customerId ? current.customers : [...current.customers, { id: customerId, name: payload.name || 'Cliente', phone: payload.phone || '', createdAt: new Date().toISOString() }]
  set(ledgerAtom, {
    ...current,
    customers,
    credits: [{ id: id(), customerId, note: payload.note, createdAt: new Date().toISOString(), movements: [{ id: id(), kind: 'charge', amount: payload.amount, note: payload.note, createdAt: new Date().toISOString() }] }, ...current.credits],
  })
})

export const addCreditPaymentAtom = atom(null, (get, set, payload: { creditId: string; amount: number }) => {
  const current = get(ledgerAtom)
  set(ledgerAtom, { ...current, credits: current.credits.map((credit) => credit.id === payload.creditId ? { ...credit, movements: [...credit.movements, { id: id(), kind: 'payment' as const, amount: payload.amount, note: 'Abono', createdAt: new Date().toISOString() }] } : credit) })
})

export const addLayawayAtom = atom(null, (get, set, payload: { customerId?: string; name?: string; phone?: string; product: string; total: number; initialPayment: number; dueDate?: string }) => {
  const current = get(ledgerAtom)
  const customerId = payload.customerId || id()
  const customers = payload.customerId ? current.customers : [...current.customers, { id: customerId, name: payload.name || 'Cliente', phone: payload.phone || '', createdAt: new Date().toISOString() }]
  set(ledgerAtom, {
    ...current,
    customers,
    layaways: [{ id: id(), customerId, product: payload.product, total: payload.total, dueDate: payload.dueDate, createdAt: new Date().toISOString(), payments: payload.initialPayment > 0 ? [{ id: id(), amount: payload.initialPayment, createdAt: new Date().toISOString() }] : [] }, ...current.layaways],
  })
})

export const addLayawayPaymentAtom = atom(null, (get, set, payload: { layawayId: string; amount: number }) => {
  const current = get(ledgerAtom)
  set(ledgerAtom, { ...current, layaways: current.layaways.map((item) => item.id === payload.layawayId ? { ...item, payments: [...item.payments, { id: id(), amount: payload.amount, createdAt: new Date().toISOString() }] } : item) })
})

export const addCustomerAtom = atom(null, (get, set, payload: { name: string; phone: string; address?: string; notes?: string }) => {
  const current = get(ledgerAtom)
  set(ledgerAtom, { ...current, customers: [{ id: id(), createdAt: new Date().toISOString(), ...payload }, ...current.customers] })
})

export const addOrderAtom = atom(null, (get, set, payload: { customerId?: string; name?: string; phone?: string; items: string; total: number; notes: string; promisedAt?: string }) => {
  const current = get(ledgerAtom)
  const customerId = payload.customerId || id()
  const customers = payload.customerId ? current.customers : [{ id: customerId, name: payload.name || 'Cliente', phone: payload.phone || '', createdAt: new Date().toISOString() }, ...current.customers]
  set(ledgerAtom, { ...current, customers, orders: [{ id: id(), customerId, items: payload.items, total: payload.total, notes: payload.notes, promisedAt: payload.promisedAt, status: 'pending', createdAt: new Date().toISOString() }, ...current.orders] })
})

export const updateOrderStatusAtom = atom(null, (get, set, payload: { orderId: string; status: OrderStatus }) => {
  const current = get(ledgerAtom)
  set(ledgerAtom, { ...current, orders: current.orders.map((order) => order.id === payload.orderId ? { ...order, status: payload.status } : order) })
})

export const prepareRegistrationAtom = atom(null, (_get, set, ownerName: string) => {
  set(ledgerAtom, { ...emptyLedger, ownerName: ownerName || 'Dueño', enabledModules: ['credits'] })
})

export const updateBusinessAtom = atom(null, (get, set, payload: { businessName: string; ownerName: string; businessType: string; phone: string; enabledModules: ProductModule[]; onboardingComplete?: boolean }) => {
  const current = get(ledgerAtom)
  set(ledgerAtom, { ...current, ...payload, onboardingComplete: payload.onboardingComplete ?? current.onboardingComplete })
})
