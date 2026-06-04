// Fix ph_min/ph_max = 0 on recipe and batch records
// Cherry Vanilla already updated in recipe; backfill batches here too.
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

const FIXES = [
  { recipe_id: 'uube7bSxxVb2yQGnkA8n', sku: 'BLM-CV-001', expression: 'Cherry Vanilla',  ph_min: 3.2, ph_max: 3.6, recipe_already_fixed: true },
  { recipe_id: 'LWlflRRv13xs2ki4RI1A', sku: 'BLM-OB-001', expression: 'Orange Bitters',  ph_min: 2.8, ph_max: 3.2, recipe_already_fixed: false },
  { recipe_id: 'gCVy7bCS0HNljyXPT3ua', sku: 'BLM-SM-001', expression: 'Smoked Maple',    ph_min: 3.4, ph_max: 4.0, recipe_already_fixed: false },
]

for (const fix of FIXES) {
  const wb = writeBatch(db)
  let count = 0

  if (!fix.recipe_already_fixed) {
    wb.update(doc(db, 'recipes', fix.recipe_id), { ph_min: fix.ph_min, ph_max: fix.ph_max })
    count++
  }

  // Backfill batch records that still carry the wrong ph_min=0
  const batchSnap = await getDocs(
    query(collection(db, 'batches'), where('recipe_id', '==', fix.recipe_id))
  )
  for (const b of batchSnap.docs) {
    if (b.data().ph_min === 0 || b.data().ph_min == null) {
      wb.update(b.ref, { ph_min: fix.ph_min, ph_max: fix.ph_max })
      count++
    }
  }

  await wb.commit()
  console.log(`[fix] ${fix.expression}: updated recipe${fix.recipe_already_fixed ? ' (already done)' : ''} + ${batchSnap.docs.filter(b => b.data().ph_min === 0 || b.data().ph_min == null).length} batch(es) → pH ${fix.ph_min}–${fix.ph_max}`)
}

console.log('[fix] done')
process.exit(0)
