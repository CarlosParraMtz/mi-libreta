import { BookOpen, PackageCheck, ShoppingBag, WalletCards } from 'lucide-react'
import type { ProductModule } from './types'

export const moduleOptions: Array<{ id: ProductModule; title: string; description: string; color: string; icon: typeof BookOpen }> = [
  { id: 'credits', title: 'Fiados', description: 'Saldos, abonos y cobros por WhatsApp.', color: 'bg-sky', icon: BookOpen },
  { id: 'layaways', title: 'Apartados', description: 'Productos separados, fechas y pagos.', color: 'bg-lilac', icon: PackageCheck },
  { id: 'cash', title: 'Caja', description: 'Ventas, gastos y retiros del día.', color: 'bg-lime', icon: WalletCards },
  { id: 'orders', title: 'Pedidos', description: 'Pedidos pendientes, preparando y listos.', color: 'bg-peach', icon: ShoppingBag },
]
