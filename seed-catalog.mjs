// One-time script: populate ingredients_catalog from recipe ingredients
// Run with: node seed-catalog.mjs
// Safe to re-run — skips names already in the catalog
import { initializeApp } from 'firebase/app'
import {
  getFirestore, collection, doc, getDocs, setDoc, query, where
} from 'firebase/firestore'

const app = initializeApp({
  apiKey: "AIzaSyAAK6kSWq_7AWXOOvHyOSrN9lzhCVXLDKI",
  authDomain: "whiskey-brix.firebaseapp.com",
  projectId: "whiskey-brix",
  storageBucket: "whiskey-brix.firebasestorage.app",
  messagingSenderId: "1005067574676",
  appId: "1:1005067574676:web:bea75027c55d48f9680381"
})
const db = getFirestore(app)

async function seedCatalog() {
  // Collect all ingredient names from every recipe subcollection
  const recipesSnap = await getDocs(collection(db, 'recipes'))
  console.log(`[seed-catalog] found ${recipesSnap.size} recipes`)

  const allNames = new Set()
  for (const recipeDoc of recipesSnap.docs) {
    const ingSnap = await getDocs(collection(db, 'recipes', recipeDoc.id, 'ingredients'))
    ingSnap.docs.forEach(d => {
      const name = d.data().name?.trim()
      if (name) allNames.add(name)
    })
  }
  console.log(`[seed-catalog] found ${allNames.size} unique ingredient names across all recipes`)

  // Get existing catalog names to avoid duplicates
  const catalogSnap = await getDocs(collection(db, 'ingredients_catalog'))
  const existing = new Set(catalogSnap.docs.map(d => d.data().name?.trim()).filter(Boolean))
  console.log(`[seed-catalog] ${existing.size} items already in catalog`)

  const toAdd = [...allNames].filter(name => !existing.has(name)).sort()
  console.log(`[seed-catalog] adding ${toAdd.length} new items:`)
  toAdd.forEach(n => console.log(`  - ${n}`))

  if (toAdd.length === 0) {
    console.log('[seed-catalog] nothing to add, exiting')
    process.exit(0)
  }

  const now = () => new Date().toISOString()
  for (const name of toAdd) {
    await setDoc(doc(collection(db, 'ingredients_catalog')), {
      name,
      unit: '',
      brand: null,
      vendor: null,
      qty_purchased: null,
      purchase_price: null,
      cost_per_unit: null,
      notes: null,
      created_at: now(),
    })
  }

  console.log(`[seed-catalog] done — ${toAdd.length} catalog items created`)
  process.exit(0)
}

seedCatalog().catch(e => { console.error('[seed-catalog] FAILED:', e); process.exit(1) })
