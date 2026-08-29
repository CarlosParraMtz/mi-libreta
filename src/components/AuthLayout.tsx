import { ArrowLeft, BookOpen, PackageCheck, ShoppingBag, WalletCards } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { legalLinks } from '../lib/legal'

export const authInputClass = 'w-full rounded-2xl border border-ink/10 bg-cream px-4 py-3.5 font-bold text-ink outline-none transition placeholder:text-ink/25 focus:border-coral focus:ring-4 focus:ring-coral/10'

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-cream text-ink lg:grid lg:grid-cols-[.92fr_1.08fr]">
      <section className="relative hidden min-h-screen overflow-hidden bg-ink p-10 text-white lg:flex lg:flex-col xl:p-14"><div className="absolute -right-28 top-20 size-80 rounded-full bg-lime/10 blur-2xl" /><Link to="/" className="relative z-10 text-2xl font-black"><span className="text-coral">Mi</span> Libreta</Link><div className="relative z-10 my-auto max-w-xl"><p className="text-xs font-black uppercase tracking-[.17em] text-lime">Menos cuentas. Más claridad.</p><h2 className="mt-5 text-5xl font-black leading-[1.02] tracking-tight xl:text-6xl">Todo tu negocio cabe aquí.</h2><p className="mt-5 text-lg font-semibold leading-relaxed text-white/55">La tranquilidad de saber quién te debe, cuánto vendiste y qué pedidos siguen pendientes.</p><div className="mt-10 grid grid-cols-2 gap-3">{[[BookOpen, 'Fiados', 'bg-sky'], [PackageCheck, 'Apartados', 'bg-lilac'], [WalletCards, 'Caja', 'bg-lime'], [ShoppingBag, 'Pedidos', 'bg-peach']].map(([Icon, label, color]) => <div key={label as string} className={`${color} rounded-2xl p-4 text-ink`}><Icon size={20} /><p className="mt-5 font-black">{label as string}</p></div>)}</div></div><p className="relative z-10 text-sm font-semibold text-white/30">Hecha para negocios reales de México.</p></section>
      <section className="flex min-h-screen flex-col px-4 py-8 sm:px-8"><div className="flex flex-1 items-center justify-center"><div className="w-full max-w-md"><Link to="/" className="mb-7 inline-flex items-center gap-2 text-sm font-extrabold text-ink/45 lg:hidden"><ArrowLeft size={18} /> Volver al inicio</Link>{children}</div></div><nav className="mx-auto mt-7 flex max-w-xl flex-wrap justify-center gap-x-4 gap-y-2 text-xs font-bold text-ink/35">{legalLinks.map((item) => <Link key={item.to} to={item.to} className="hover:text-ink">{item.label}</Link>)}</nav></section>
    </main>
  )
}
