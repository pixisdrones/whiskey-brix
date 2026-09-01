// Reads merge-map.json (produced by ingredient-dedup-report.mjs --json),
// and for each group:
//   1. Renames every recipe ingredient doc whose name matches a non-canonical
//      variant to the canonical name.
//   2. Re-points catalog_id on those docs to the canonical catalog entry
//      (creating the canonical catalog entry first if it doesn't exist).
//   3. Deletes the now-unused (non-canonical) catalog entries.
//
// Safe to re-run — skips docs already using the canonical name.
//
// Usage:
//   node scripts/ingredient-merge.mjs --dry-run   # preview only
//   node scripts/ingredient-merge.mjs             # apply changes

import { initializeApp } from 'firebase/app'
import {
  getFirestore, collection, getDocs, doc, getDoc,
  setDoc, updateDoc, deleteDoc, query, orderBy,
} from 'firebase/firestore'
import { readFileSync } from 'fs'

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

  // ── Load merge map ─────────────────────────────────────────────────────────
  let mergeGroups
  try {
    const raw = readFileSync('merge-map.json', 'utf8')
    mergeGroups = JSON.parse(raw).groups
  } catch {
    console.error('merge-map.json not found. Run: node scripts/ingredient-dedup-report.mjs --json')
    process.exit(1)
  }

  // Filter to groups that actually have non-canonical variants to merge
  const actionable = mergeGroups.filter(g => g.variants.length > 1)
  if (actionable.length === 0) {
    console.log('No merge groups with variants — nothing to do.')
    process.exit(0)
  }

  console.log(`Merge groups to process: ${actionable.length}\n`)

  // ── Load current catalog ────────────────────────────────────────────────────
  const catalogSnap = await getDocs(collection(db, 'ingredients_catalog'))
  const catalogByName = {}   // normalized-display-name → { id, ...data }
  catalogSnap.docs.forEach(d => {
    catalogByName[d.data().name?.toLowerCase().trim()] = { id: d.id, ...d.data() }
  })

  // ── Load all recipes + their ingredient sub-collections ────────────────────
  const recipesSnap = await getDocs(collection(db, 'recipes'))
  const allInstances = []
  for (const rDoc of recipesSnap.docs) {
    const ingSnap = await getDocs(
      query(collection(db, 'recipes', rDoc.id, 'ingredients'), orderBy('sort_order'))
    )
    ingSnap.docs.forEach(d => {
      allInstances.push({ recipeId: rDoc.id, docId: d.id, ...d.data() })
    })
  }

  // ── Process each merge group ───────────────────────────────────────────────
  let totalRenamed = 0, totalSkipped = 0, totalCatalogCreated = 0, totalCatalogDeleted = 0

  for (const group of actionable) {
    const { canonical, variants } = group
    const canonKey = canonical.toLowerCase().trim()

    console.log(`══ Merging → "${canonical}"`)
    const nonCanonical = variants.filter(v => v.name !== canonical)
    nonCanonical.forEach(v => console.log(`   ← "${v.name}"  (${v.recipes.join(', ')})`))

    // ── 1. Ensure canonical catalog entry exists ───────────────────────────
    let canonCatalogId = catalogByName[canonKey]?.id ?? null

    if (!canonCatalogId) {
      // Prefer the data from whichever variant has a catalog entry
      const existingVariant = variants.find(v => catalogByName[v.name.toLowerCase().trim()])
      const srcData = existingVariant
        ? catalogByName[existingVariant.name.toLowerCase().trim()]
        : null

      const newRef = doc(collection(db, 'ingredients_catalog'))
      const newData = {
        name:           canonical,
        unit:           srcData?.unit ?? (variants[0].units[0] ?? 'unit'),
        brand:          srcData?.brand ?? null,
        vendor:         srcData?.vendor ?? null,
        qty_purchased:  srcData?.qty_purchased ?? null,
        purchase_price: srcData?.purchase_price ?? null,
        cost_per_unit:  srcData?.cost_per_unit ?? null,
        notes:          srcData?.notes ?? null,
        created_at:     now(),
      }

      if (!DRY_RUN) {
        await setDoc(newRef, newData)
        canonCatalogId = newRef.id
        catalogByName[canonKey] = { id: canonCatalogId, ...newData }
      } else {
        canonCatalogId = `dry-run-${newRef.id}`
      }
      console.log(`   ${DRY_RUN ? '[DRY RUN] ' : ''}✓ Created canonical catalog entry (${canonCatalogId})`)
      totalCatalogCreated++
    } else {
      // Ensure the catalog entry's name field matches the canonical string exactly
      if (catalogByName[canonKey].name !== canonical) {
        if (!DRY_RUN) await updateDoc(doc(db, 'ingredients_catalog', canonCatalogId), { name: canonical })
        console.log(`   ${DRY_RUN ? '[DRY RUN] ' : ''}✓ Corrected catalog entry name to "${canonical}"`)
      }
      console.log(`   Canonical catalog entry already exists (${canonCatalogId})`)
    }

    // ── 2. Rename recipe ingredient docs ──────────────────────────────────
    const variantNames = new Set(nonCanonical.map(v => v.name.toLowerCase().trim()))
    const toRename = allInstances.filter(i => variantNames.has(i.name?.toLowerCase().trim()))

    for (const ing of toRename) {
      if (!DRY_RUN) {
        await updateDoc(
          doc(db, 'recipes', ing.recipeId, 'ingredients', ing.docId),
          { name: canonical, catalog_id: canonCatalogId }
        )
      }
      console.log(`   ${DRY_RUN ? '[DRY RUN] ' : ''}  rename: "${ing.name}" → "${canonical}"  (recipe ${ing.recipeId})`)
      totalRenamed++
    }

    if (toRename.length === 0) {
      console.log('   (no recipe ingredient docs needed renaming)')
      totalSkipped++
    }

    // ── 3. Delete non-canonical catalog entries ────────────────────────────
    for (const v of nonCanonical) {
      const key = v.name.toLowerCase().trim()
      const entry = catalogByName[key]
      if (!entry) continue
      if (!DRY_RUN) await deleteDoc(doc(db, 'ingredients_catalog', entry.id))
      console.log(`   ${DRY_RUN ? '[DRY RUN] ' : ''}✓ Deleted catalog entry "${v.name}" (${entry.id})`)
      totalCatalogDeleted++
    }

    console.log()
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log('── Summary ───────────────────────────────────────────────────────')
  console.log(`Recipe ingredient docs renamed: ${totalRenamed}`)
  console.log(`Catalog entries created:        ${totalCatalogCreated}`)
  console.log(`Catalog entries deleted:        ${totalCatalogDeleted}`)
  if (DRY_RUN) {
    console.log('\nRun without --dry-run to apply these changes.')
  } else {
    console.log('\nDone. Re-run the dedup report to verify: node scripts/ingredient-dedup-report.mjs')
  }

  process.exit(0)
}

run().catch(e => { console.error(e); process.exit(1) })
