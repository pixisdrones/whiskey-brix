// Add missing catalog entries for BLM-DM-001 and BLM-SB-001,
// then backfill catalog_id on their recipe ingredient subcollection records.
// Run with: node seed-new-recipe-ingredients.mjs
import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, doc, addDoc, updateDoc, query, where } from 'firebase/firestore'

const app = initializeApp({
  apiKey: "AIzaSyAAK6kSWq_7AWXOOvHyOSrN9lzhCVXLDKI",
  authDomain: "whiskey-brix.firebaseapp.com",
  projectId: "whiskey-brix",
  storageBucket: "whiskey-brix.firebasestorage.app",
  messagingSenderId: "1005067574676",
  appId: "1:1005067574676:web:bea75027c55d48f9680381"
})
const db = getFirestore(app)

// New catalog items to add (name only — user will populate cost/unit)
const newCatalogItems = [
  { name: 'Demerara 2:1 simple syrup' },
  { name: 'Fresh blackberries' },
  { name: 'Fresh raspberries' },
]

// Map: ingredient name in recipe subcollection → catalog item name to link
const linkMap = {
  'Demerara 2:1 simple syrup': 'Demerara 2:1 simple syrup',
  'Fresh blackberries':        'Fresh blackberries',
  'Fresh raspberries':         'Fresh raspberries',
}

async function run() {
  // 1. Check existing catalog to avoid duplicates
  const catSnap = await getDocs(collection(db, 'ingredients_catalog'))
  const existing = new Map(catSnap.docs.map(d => [d.data().name, d.id]))

  // 2. Add missing catalog entries
  const catalogIds = new Map(existing)
  for (const item of newCatalogItems) {
    if (existing.has(item.name)) {
      console.log(`[catalog] already exists: ${item.name}`)
    } else {
      const ref = await addDoc(collection(db, 'ingredients_catalog'), { name: item.name })
      catalogIds.set(item.name, ref.id)
      console.log(`[catalog] added: ${item.name} → ${ref.id}`)
    }
  }

  // 3. Find BLM-DM-001 and BLM-SB-001 recipe docs
  const recipesSnap = await getDocs(
    query(collection(db, 'recipes'), where('sku', 'in', ['BLM-DM-001', 'BLM-SB-001']))
  )

  // 4. For each recipe, update ingredient records that need a catalog_id
  for (const recipeDoc of recipesSnap.docs) {
    const sku = recipeDoc.data().sku
    const ingSnap = await getDocs(collection(db, 'recipes', recipeDoc.id, 'ingredients'))
    for (const ingDoc of ingSnap.docs) {
      const ing = ingDoc.data()
      const targetCatalogName = linkMap[ing.name]
      if (targetCatalogName && !ing.catalog_id) {
        const catalogId = catalogIds.get(targetCatalogName)
        if (catalogId) {
          await updateDoc(doc(db, 'recipes', recipeDoc.id, 'ingredients', ingDoc.id), { catalog_id: catalogId })
          console.log(`[link] ${sku} / ${ing.name} → ${catalogId}`)
        }
      }
    }
  }

  console.log('[done]')
  process.exit(0)
}

run().catch(e => { console.error('FAILED:', e); process.exit(1) })
