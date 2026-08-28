import { useAtom, useSetAtom } from 'jotai'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { useEffect, useRef } from 'react'
import { emptyLedger, normalizeLedger } from '../lib/empty-data'
import { auth, db } from '../lib/firebase'
import type { LedgerData } from '../lib/types'
import { activeBusinessIdAtom, ledgerAtom, syncStatusAtom } from '../state/store'

export function FirebaseSync() {
  const [ledger, setLedger] = useAtom(ledgerAtom)
  const setBusinessId = useSetAtom(activeBusinessIdAtom)
  const setSyncStatus = useSetAtom(syncStatusAtom)
  const latestLedger = useRef(ledger)
  const applyingRemote = useRef(false)
  const loadedBusinessId = useRef<string | null>(null)

  useEffect(() => { latestLedger.current = ledger }, [ledger])

  useEffect(() => {
    if (!auth || !db) { setSyncStatus('error'); return }
    let unsubscribeProfile: undefined | (() => void)
    let unsubscribeBusiness: undefined | (() => void)

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      unsubscribeProfile?.(); unsubscribeBusiness?.()
      loadedBusinessId.current = null
      if (!user) {
        applyingRemote.current = true
        setLedger(emptyLedger)
        setBusinessId(null)
        setSyncStatus('idle')
        return
      }

      setSyncStatus('loading')
      unsubscribeProfile = onSnapshot(doc(db!, 'users', user.uid), (profileSnapshot) => {
        const businessId = profileSnapshot.data()?.defaultBusinessId as string | undefined
        if (!businessId) {
          unsubscribeBusiness?.()
          loadedBusinessId.current = null
          applyingRemote.current = true
          setLedger({ ...emptyLedger, ownerName: user.displayName || '', onboardingComplete: false })
          setBusinessId(null)
          setSyncStatus('ready')
          return
        }
        if (businessId === loadedBusinessId.current) return
        unsubscribeBusiness?.()
        loadedBusinessId.current = businessId
        setBusinessId(businessId)
        setSyncStatus('loading')
        unsubscribeBusiness = onSnapshot(doc(db!, 'businesses', businessId), (businessSnapshot) => {
          if (!businessSnapshot.exists()) {
            applyingRemote.current = true
            setLedger({ ...emptyLedger, ownerName: user.displayName || '', onboardingComplete: false })
            setSyncStatus('ready')
            return
          }
          const remoteLedger = normalizeLedger(businessSnapshot.data() as Partial<LedgerData>, businessId)
          if (JSON.stringify(remoteLedger) !== JSON.stringify(latestLedger.current)) {
            applyingRemote.current = true
            setLedger(remoteLedger)
          }
          setSyncStatus('ready')
        }, () => setSyncStatus('error'))
      }, () => setSyncStatus('error'))
    })

    return () => { unsubscribeBusiness?.(); unsubscribeProfile?.(); unsubscribeAuth() }
  }, [setBusinessId, setLedger, setSyncStatus])

  useEffect(() => {
    if (applyingRemote.current) { applyingRemote.current = false; return }
    const businessId = loadedBusinessId.current
    const firestore = db
    if (!businessId || !firestore || !auth?.currentUser) return
    const timer = window.setTimeout(() => {
      const data: Partial<LedgerData> = { ...ledger }
      delete data.id
      delete data.ownerId
      delete data.adminIds
      delete data.memberIds
      delete data.administrators
      delete data.subscription
      void setDoc(doc(firestore, 'businesses', businessId), { ...data, updatedAt: new Date().toISOString() }, { merge: true })
    }, 450)
    return () => window.clearTimeout(timer)
  }, [ledger])

  return null
}
