export type CashKind = 'sale' | 'expense' | 'withdrawal'
export type ProductModule = 'credits' | 'layaways' | 'cash' | 'orders'
export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled'
export type SubscriptionStatus = 'none' | 'incomplete' | 'incomplete_expired' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid' | 'paused'

export interface SubscriptionInfo {
  status: SubscriptionStatus
  stripeCustomerId?: string
  stripeSubscriptionId?: string
  stripePriceId?: string
  currentPeriodEnd?: string
  cancelAtPeriodEnd?: boolean
  accessOverride?: 'active' | 'suspended' | null
}

export interface Customer {
  id: string
  name: string
  phone: string
  address?: string
  notes?: string
  createdAt: string
}

export interface Order {
  id: string
  customerId: string
  items: string
  total: number
  status: OrderStatus
  notes: string
  promisedAt?: string
  createdAt: string
}

export interface CreditMovement {
  id: string
  kind: 'charge' | 'payment'
  amount: number
  note: string
  createdAt: string
}

export interface CreditAccount {
  id: string
  customerId: string
  note: string
  promiseDate?: string
  createdAt: string
  movements: CreditMovement[]
}

export interface Layaway {
  id: string
  customerId: string
  product: string
  total: number
  createdAt: string
  dueDate?: string
  payments: Array<{ id: string; amount: number; createdAt: string }>
}

export interface CashMovement {
  id: string
  kind: CashKind
  amount: number
  note: string
  createdAt: string
}

export interface LedgerData {
  id?: string
  ownerId: string
  adminIds: string[]
  memberIds: string[]
  businessName: string
  ownerName: string
  businessType: string
  phone: string
  enabledModules: ProductModule[]
  onboardingComplete: boolean
  subscription: SubscriptionInfo
  customers: Customer[]
  orders: Order[]
  credits: CreditAccount[]
  layaways: Layaway[]
  cash: CashMovement[]
}

export type EntryKind = 'sale' | 'expense' | 'withdrawal' | 'credit' | 'layaway' | null
