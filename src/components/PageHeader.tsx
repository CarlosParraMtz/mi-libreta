import type { ReactNode } from 'react'

export function PageHeader({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: ReactNode }) {
  return (
    <header className="flex items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="mb-1 text-xs font-black uppercase tracking-[0.16em] text-coral">{eyebrow}</p>}
        <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{title}</h1>
      </div>
      {action}
    </header>
  )
}
