import { ArrowLeft, ShieldCheck } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { legalConfig, legalConfigurationPending, legalLinks } from '../lib/legal'

export function LegalLayout({ eyebrow, title, summary, children }: { eyebrow: string; title: string; summary: string; children: ReactNode }) {
  return <div className="min-h-screen bg-cream text-ink">
    <header className="border-b border-ink/8 bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8"><Link to="/" className="text-2xl font-black tracking-tight"><span className="text-coral">Mi</span> Libreta</Link><Link to="/" className="inline-flex items-center gap-2 text-sm font-black text-ink/45"><ArrowLeft size={17} /> Volver</Link></div></header>
    <main className="mx-auto max-w-4xl px-5 py-10 sm:px-8 sm:py-16">
      <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[.16em] text-coral"><ShieldCheck size={17} /> {eyebrow}</div>
      <h1 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">{title}</h1>
      <p className="mt-4 max-w-3xl text-lg font-semibold leading-relaxed text-ink/50">{summary}</p>
      <p className="mt-3 text-sm font-bold text-ink/35">Última actualización: {legalConfig.effectiveDate}</p>
      {legalConfigurationPending && <aside className="mt-7 rounded-2xl border border-coral/20 bg-peach/55 p-4 text-sm font-bold leading-relaxed">Documento en preparación: antes de su publicación definitiva deben configurarse los datos de identidad y contacto del responsable.</aside>}
      <article className="mt-9 space-y-5">{children}</article>
    </main>
    <footer className="bg-ink px-5 py-8 text-white"><div className="mx-auto flex max-w-6xl flex-col gap-5 sm:px-3"><Link to="/" className="text-xl font-black"><span className="text-coral">Mi</span> Libreta</Link><nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-bold text-white/55">{legalLinks.map((item) => <Link key={item.to} to={item.to} className="hover:text-white">{item.label}</Link>)}</nav></div></footer>
  </div>
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return <section className="rounded-[1.7rem] bg-white p-6 shadow-soft sm:p-8"><h2 className="text-xl font-black sm:text-2xl">{title}</h2><div className="mt-3 space-y-3 font-semibold leading-relaxed text-ink/55 [&_a]:font-black [&_a]:text-coral [&_li]:pl-1 [&_ul]:ml-5 [&_ul]:list-disc [&_ul]:space-y-2">{children}</div></section>
}
