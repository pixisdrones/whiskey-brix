// One-time migration: creates catalog entries for every distinct ingredient across all
// recipes and links each recipe ingredient document to its catalog entry via catalog_id.
//
// Safe to re-run — skips catalog entries that already exist and skips ingredient
// documents that are already linked to the correct catalog_id.
//
// Usage:
//   node scripts/catalog-ingredients.mjs           # apply changes
//   node scripts/catalog-ingredients.mjs --dry-run  # preview only, no writes

import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, doc, setDoc, updateDoc, query, orderBy } from 'firebase/firestore'

const DRY_RUN = process.argv.includes('--dry-run')

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
const now = () => new Date().toISOString()

async function run() {
  if (DRY_RUN) console.log('── DRY RUN — no changes will be written ──\n')

  // ── 1. Load existing catalog ───────────────────────────────────────────────
  const catalogSnap = await getDocs(collection(db, 'ingredients_catalog'))
  const catalogByName = {}   // normalized-name → { id, name, unit, ... }
  catalogSnap.docs.forEach(d => {
    catalogByName[d.data().name.toLowerCase().trim()] = { id: d.id, ...d.data() }
  })
  console.log(`Existing catalog entries: ${catalogSnap.size}`)

  // ── 2. Load all recipes ────────────────────────────────────────────────────
  const recipesSnap = await getDocs(collection(db, 'recipes'))
  console.log(`Recipes found: ${recipesSnap.size}\n`)

  // ── 3. Collect every ingredient instance across all recipes ────────────────
  const allInstances = []   // { recipeId, docId, name, unit, catalog_id, ... }
  for (const rDoc of recipesSnap.docs) {
    const ingSnap = await getDocs(
      query(collection(db, 'recipes', rDoc.id, 'ingredients'), orderBy('sort_order'))
    )
    ingSnap.docs.forEach(d => {
      allInstances.push({ recipeId: rDoc.id, docId: d.id, ...d.data() })
    })
  }
  console.log(`Total ingredient instances: ${allInstances.length}`)

  // ── 4. Group by name, detect unit conflicts ────────────────────────────────
  const byName = {}   // normalized-name → { canonical, unitCounts: {unit: count} }
  allInstances.forEach(({ name, unit }) => {
    const key = name.toLowerCase().trim()
    if (!byName[key]) byName[key] = { canonical: name, unitCounts: {} }
    byName[key].unitCounts[unit] = (byName[key].unitCounts[unit] ?? 0) + 1
  })

  const uniqueIngredients = Object.entries(byName)
  console.log(`Unique ingredient names: ${uniqueIngredients.length}\n`)

  const conflicts = uniqueIngredients.filter(([, v]) => Object.keys(v.unitCounts).length > 1)
  if (conflicts.length > 0) {
    console.log('⚠  Unit conflicts (same name, multiple units) — most common unit will be used:')
    conflicts.forEach(([, { canonical, unitCounts }]) => {
      const units = Object.entries(unitCounts).sort((a, b) => b[1] - a[1])
      console.log(`   "${canonical}": ${units.map(([u, c]) => `${u} ×${c}`).join(', ')}`)
    })
    console.log()
  }

  // ── 5. Create missing catalog entries ──────────────────────────────────────
  const nameToId = {}   // normalized-name → catalog_id (existing or newly created)
  let created = 0, alreadyInCatalog = 0

  console.log('── Catalog entries ───────────────────────────────────────────────')
  for (const [key, { canonical, unitCounts }] of uniqueIngredients) {
    if (catalogByName[key]) {
      nameToId[key] = catalogByName[key].id
      alreadyInCatalog++
      continue
    }

    // Pick the most commonly used unit across recipes
    const unit = Object.entries(unitCounts).sort((a, b) => b[1] - a[1])[0][0]
    const newRef = doc(collection(db, 'ingredients_catalog'))
    const newData = {
      name: canonical,
      unit,
      brand: null,
      vendor: null,
      qty_purchased: null,
      purchase_price: null,
      cost_per_unit: null,
      notes: null,
      created_at: now(),
    }

    if (!DRY_RUN) {
      await setDoc(newRef, newData)
      nameToId[key] = newRef.id
    } else {
      nameToId[key] = `dry-run-${newRef.id}`
    }

    console.log(`  ${DRY_RUN ? '[DRY RUN] ' : ''}✓ Created  "${canonical}"  (${unit})`)
    created++
  }

  if (alreadyInCatalog > 0) {
    console.log(`  (${alreadyInCatalog} already in catalog — skipped)`)
  }

  // ── 6. Link recipe ingredient documents to catalog entries ─────────────────
  let linked = 0, alreadyLinked = 0, unresolved = 0

  console.log('\n── Ingredient links ──────────────────────────────────────────────')
  for (const ing of allInstances) {
    const key = ing.name.toLowerCase().trim()
    const catalogId = nameToId[key]

    if (!catalogId) {
      console.warn(`  ✗ No catalog entry resolved for "${ing.name}" — skipped`)
      unresolved++
      continue
    }

    if (ing.catalog_id === catalogId) {
      alreadyLinked++
      continue
    }

    if (!DRY_RUN) {
      await updateDoc(
        doc(db, 'recipes', ing.recipeId, 'ingredients', ing.docId),
        { catalog_id: catalogId }
      )
    }
    linked++
  }

  console.log(`  ${DRY_RUN ? '[DRY RUN] ' : ''}${linked} linked, ${alreadyLinked} already linked, ${unresolved} unresolved`)

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('\n── Summary ───────────────────────────────────────────────────────')
  console.log(`Catalog:     ${created} created, ${alreadyInCatalog} already existed`)
  console.log(`Links:       ${linked} updated, ${alreadyLinked} already correct, ${unresolved} unresolved`)
  if (DRY_RUN) {
    console.log('\nRun without --dry-run to apply these changes.')
  } else {
    console.log('\nDone. Open the Ingredients tab to fill in brand/vendor/price for cost tracking.')
  }

  process.exit(0)
}

run().catch(e => { console.error(e); process.exit(1) })
