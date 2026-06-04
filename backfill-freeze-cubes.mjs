// Backfill batch_cubes for freeze tests that have qty_cubes > 0 but no cube records.
// Run once after deploying the createFreezeTest fix.
import { initializeApp } from 'firebase/app'
import { getFirestore, collection, doc, getDocs, query, where, writeBatch } from 'firebase/firestore'

const app = initializeApp({
  apiKey: "AIzaSyAAK6kSWq_7AWXOOvHyOSrN9lzhCVXLDKI",
  authDomain: "whiskey-brix.firebaseapp.com",
  projectId: "whiskey-brix",
  storageBucket: "whiskey-brix.firebasestorage.app",
  messagingSenderId: "1005067574676",
  appId: "1:1005067574676:web:bea75027c55d48f9680381"
})
const db = getFirestore(app)

const ftSnap = await getDocs(collection(db, 'freeze_tests'))
let backfilled = 0

for (const ft of ftSnap.docs) {
  const data = ft.data()
  const qty = data.qty_cubes
  if (!qty || qty <= 0) continue

  const existing = await getDocs(query(collection(db, 'batch_cubes'), where('freeze_test_id', '==', ft.id)))
  if (existing.size > 0) {
    console.log(`[skip] ${ft.id} — already has ${existing.size} cube(s)`)
    continue
  }

  const wb = writeBatch(db)
  const ts = data.created_at ?? new Date().toISOString()
  for (let s = 1; s <= qty; s++) {
    wb.set(doc(collection(db, 'batch_cubes')), {
      mold_id: data.mold_id ?? null,
      batch_id: data.batch_id,
      freeze_test_id: ft.id,
      section_number: s,
      status: 'frozen',
      tasting_id: null,
      batch_label: data.batch_label ?? null,
      sku: data.sku ?? null,
      created_at: ts,
    })
  }
  await wb.commit()
  console.log(`[backfill] ${ft.id} (${data.sku} / ${data.batch_label}) — created ${qty} cube(s)`)
  backfilled++
}

console.log(`[done] backfilled ${backfilled} freeze test(s)`)
process.exit(0)
