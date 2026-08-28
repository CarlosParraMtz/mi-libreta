import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore'
import { useAtomValue } from 'jotai'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { auth, db } from '../lib/firebase'
import { activeBusinessIdAtom } from '../state/store'

interface BusinessOption {
  id: string
  name: string
}

export function BusinessSwitcher() {
  const activeBusinessId = useAtomValue(activeBusinessIdAtom)
  const [businesses, setBusinesses] = useState<BusinessOption[]>([])
  const [changing, setChanging] = useState(false)

  useEffect(() => {
    const user = auth?.currentUser
    const firestore = db
    if (!user || !firestore) return
    let active = true
    const unsubscribe = onSnapshot(doc(firestore, 'users', user.uid), (snapshot) => {
      const profile = snapshot.data()
      const ids = Array.from(new Set<string>([
        ...((profile?.businessIds as string[] | undefined) || []),
        ...(profile?.defaultBusinessId ? [String(profile.defaultBusinessId)] : []),
      ]))
      void Promise.all(ids.map(async (id) => {
        const business = await getDoc(doc(firestore, 'businesses', id))
        return business.exists() ? { id, name: String(business.data().ledgerName || business.data().businessName || 'Libreta sin nombre') } : null
      })).then((items) => {
        if (active) setBusinesses(items.filter((item): item is BusinessOption => Boolean(item)))
      }).catch(() => { if (active) setBusinesses([]) })
    })
    return () => { active = false; unsubscribe() }
  }, [])

  const changeBusiness = async (businessId: string) => {
    const user = auth?.currentUser
    if (!user || !db || businessId === activeBusinessId) return
    setChanging(true)
    await setDoc(doc(db, 'users', user.uid), { defaultBusinessId: businessId, updatedAt: new Date().toISOString() }, { merge: true })
    window.location.assign('/dashboard')
  }

  return <div className="mt-4 px-3">{businesses.length > 1 && <label className="block"><span className="mb-1 block text-[10px] font-black uppercase tracking-wider text-ink/35">Libreta activa</span><select value={activeBusinessId || ''} disabled={changing} onChange={(event) => void changeBusiness(event.target.value)} className="w-full rounded-xl border-0 bg-white px-3 py-2 text-xs font-black shadow-soft outline-none disabled:opacity-50">{businesses.map((business) => <option key={business.id} value={business.id}>{business.name}</option>)}</select></label>}<Link to="/nueva-libreta" className="mt-2 block rounded-xl border border-dashed border-ink/20 px-3 py-2 text-center text-xs font-black text-ink/45 hover:bg-white">+ Nueva libreta</Link></div>
}
