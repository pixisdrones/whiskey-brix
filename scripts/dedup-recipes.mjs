import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyAAK6kSWq_7AWXOOvHyOSrN9lzhCVXLDKI",
  authDomain: "whiskey-brix.firebaseapp.com",
  projectId: "whiskey-brix",
  storageBucket: "whiskey-brix.firebasestorage.app",
  messagingSenderId: "1005067574676",
  appId: "1:1005067574676:web:bea75027c55d48f9680381"
}

const app = initializeApp(firebaseConfig)
const db  = getFirestore(app)

async function dedup() {
  const snap = await getDocs(collection(db, 'recipes'))
  const byKey = new Map()

  for (const d of snap.docs) {
    const data = d.data()
    const key = data.sku || data.expression || d.id
    if (!byKey.has(key)) {
      byKey.set(key, [])
    }
    byKey.get(key).push(d)
  }

  let kept = 0, deleted = 0
  for (const [key, docs] of byKey.entries()) {
    if (docs.length === 1) { kept++; continue }
    // Keep the first (oldest by array order), delete the rest
    const [keep, ...dupes] = docs
    console.log(`[${key}] keeping ${keep.id}, deleting ${dupes.length} duplicate(s)`)
    for (const dupe of dupes) {
      // Delete ingredients sub-collection first
      const ingSub = await getDocs(collection(db, 'recipes', dupe.id, 'ingredients'))
      for (const ing of ingSub.docs) {
        await deleteDoc(doc(db, 'recipes', dupe.id, 'ingredients', ing.id))
      }
      await deleteDoc(doc(db, 'recipes', dupe.id))
      deleted++
    }
    kept++
  }

  console.log(`\nDone. Kept: ${kept} recipes, Deleted: ${deleted} duplicates.`)
  process.exit(0)
}

dedup().catch(e => { console.error(e); process.exit(1) })
