// One-time dedup: remove duplicate recipes by SKU
// Keeps the record with recipe_body set; if both have it, keeps the older created_at
// Run with: node dedup-recipes.mjs
import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore'

const app = initializeApp({
  apiKey: "AIzaSyAAK6kSWq_7AWXOOvHyOSrN9lzhCVXLDKI",
  authDomain: "whiskey-brix.firebaseapp.com",
  projectId: "whiskey-brix",
  storageBucket: "whiskey-brix.firebasestorage.app",
  messagingSenderId: "1005067574676",
  appId: "1:1005067574676:web:bea75027c55d48f9680381"
})
const db = getFirestore(app)

async function dedup() {
  const snap = await getDocs(collection(db, 'recipes'))
  const all = snap.docs.map(d => ({ id: d.id, ...d.data() }))
  console.log(`[dedup] found ${all.length} total recipes`)

  // Group by SKU
  const bySku = {}
  all.forEach(r => {
    if (!bySku[r.sku]) bySku[r.sku] = []
    bySku[r.sku].push(r)
  })

  const dupes = Object.entries(bySku).filter(([, group]) => group.length > 1)
  if (dupes.length === 0) { console.log('[dedup] no duplicates found'); process.exit(0) }

  console.log(`[dedup] found ${dupes.length} SKUs with duplicates:`)
  let deleteCount = 0

  for (const [sku, group] of dupes) {
    console.log(`  SKU ${sku}: ${group.length} copies`)

    // Pick the best record: prefer one with recipe_body, then oldest created_at
    group.sort((a, b) => {
      const aHas = !!a.recipe_body
      const bHas = !!b.recipe_body
      if (aHas !== bHas) return aHas ? -1 : 1
      return (a.created_at ?? '') < (b.created_at ?? '') ? -1 : 1
    })

    const keep = group[0]
    const drop = group.slice(1)
    console.log(`    keeping ${keep.id} (recipe_body: ${!!keep.recipe_body}, created: ${keep.created_at ?? 'unknown'})`)

    for (const r of drop) {
      console.log(`    deleting ${r.id} (recipe_body: ${!!r.recipe_body}, created: ${r.created_at ?? 'unknown'})`)
      // Delete subcollection ingredients first
      const ingSnap = await getDocs(collection(db, 'recipes', r.id, 'ingredients'))
      for (const ing of ingSnap.docs) {
        await deleteDoc(doc(db, 'recipes', r.id, 'ingredients', ing.id))
      }
      await deleteDoc(doc(db, 'recipes', r.id))
      deleteCount++
    }
  }

  console.log(`[dedup] done — deleted ${deleteCount} duplicate recipes`)
  process.exit(0)
}

dedup().catch(e => { console.error('[dedup] FAILED:', e); process.exit(1) })
