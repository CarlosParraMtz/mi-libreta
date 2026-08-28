import { useAtomValue } from 'jotai'
import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import type { ProductModule } from '../lib/types'
import { ledgerAtom } from '../state/store'

export function ModuleGate({ module, children }: { module: ProductModule; children: ReactNode }) {
  const ledger = useAtomValue(ledgerAtom)
  return ledger.enabledModules.includes(module) ? children : <Navigate to="/dashboard/configuracion" replace />
}
