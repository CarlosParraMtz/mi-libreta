export const money = (value: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(value)

export const shortDate = (value: string) => new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' }).format(new Date(value))

export const daysSince = (value: string) => Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000))

export const isToday = (value: string) => new Date(value).toDateString() === new Date().toDateString()

export const creditBalance = (movements: Array<{ kind: 'charge' | 'payment'; amount: number }>) => movements.reduce((total, item) => total + (item.kind === 'charge' ? item.amount : -item.amount), 0)

export const whatsappUrl = (phone: string, message: string) => `https://wa.me/52${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`
