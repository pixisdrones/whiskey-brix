// Reads ingredients.csv (produced by export-ingredients-csv.mjs, edited by hand),
// renames ingredient docs in every recipe sub-collection where canonical_name differs
// from name, re-points catalog_id to the surviving catalog entry, and removes
// now-unused catalog entries.
//
// Rows where canonical_name is blank or identical to name are skipped.
//
// Usage:
//   node scripts/apply-ingredients-csv.mjs --dry-run   # preview only
//   node scripts/apply-ingredients-csv.mjs             # apply changes

import { initializeApp } from 'firebase/app'
import {
  getFirestore, collection, getDocs, doc,
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

// ── CSV parser (handles quoted fields) ────────────────────────────────────────
function parseCSV(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
  const headers = splitCSVLine(lines[0])
  return lines.slice(1).filter(l => l.trim()).map(line => {
    const cols = splitCSVLine(line)
    return Object.fromEntries(headers.map((h, i) => [h.trim(), (cols[i] ?? '').trim()]))
  })
}

function splitCSVLine(line) {
  const cells = []
  let cur = '', inQ = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++ }
      else inQ = !inQ
    } else if (c === ',' && !inQ) {
      cells.push(cur); cur = ''
    } else {
      cur += c
    }
  }
  cells.push(cur)
  return cells
}

// ── Main ───────────────────────────────────────────────────────────────────────
async function run() {
  if (DRY_RUN) console.log('── DRY RUN — no changes will be written ──\n')

  // Load CSV
  let rows
  try {
    rows = parseCSV(readFileSync('ingredients.csv', 'utf8'))
  } catch {
    console.error('ingredients.csv not found. Run: node scripts/export-ingredients-csv.mjs')
    process.exit(1)
  }

  // Build rename map: old name → canonical name (only where they differ)
  const renames = new Map()   // oldName → canonicalName
  for (const row of rows) {
    const from = row.name?.trim()
    const to   = row.canonical_name?.trim()
    if (from && to && to !== from) renames.set(from, to)
  }

  if (renames.size === 0) {
    console.log('No renames found in canonical_name column — nothing to do.')
    process.exit(0)
  }

  console.log(`Renames to apply: ${renames.size}`)
  renames.forEach((to, from) => console.log(`  "${from}" → "${to}"`))
  console.log()

  // Load current catalog
  const catalogSnap = await getDocs(collection(db, 'ingredients_catalog'))
  const catalogByName = new Map()   // lowercased name → { id, ...data }
  catalogSnap.docs.forEach(d => {
    catalogByName.set(d.data().name?.toLowerCase().trim(), { id: d.id, ...d.data() })
  })

  // Ensure a catalog entry exists for each canonical name
  const canonCatalogId = new Map()   // canonicalName → catalog id

  for (const canonical of new Set(renames.values())) {
    const key = canonical.toLowerCase().trim()
    if (catalogByName.has(key)) {
      canonCatalogId.set(canonical, catalogByName.get(key).id)
      continue
    }

    // Inherit data from the first source variant that has a catalog entry
    const srcVariant = [...renames.entries()]
      .filter(([, c]) => c === canonical)
      .map(([from]) => catalogByName.get(from.toLowerCase().trim()))
      .find(Boolean)

    const newRef = doc(collection(db, 'ingredients_catalog'))
    const newData = {
      name:           canonical,
      unit:           srcVariant?.unit ?? 'unit',
      brand:          srcVariant?.brand ?? null,
      vendor:         srcVariant?.vendor ?? null,
      qty_purchased:  srcVariant?.qty_purchased ?? null,
      purchase_price: srcVariant?.purchase_price ?? null,
      cost_per_unit:  srcVariant?.cost_per_unit ?? null,
      notes:          srcVariant?.notes ?? null,
      created_at:     now(),
    }

    if (!DRY_RUN) {
      await setDoc(newRef, newData)
      canonCatalogId.set(canonical, newRef.id)
    } else {
      canonCatalogId.set(canonical, `dry-run-${newRef.id}`)
    }
    console.log(`${DRY_RUN ? '[DRY RUN] ' : ''}✓ Created catalog entry "${canonical}"`)
  }

  // Load all recipe ingredients and apply renames
  const recipesSnap = await getDocs(collection(db, 'recipes'))
  let renamed = 0, skipped = 0

  for (const rDoc of recipesSnap.docs) {
    const ingSnap = await getDocs(
      query(collection(db, 'recipes', rDoc.id, 'ingredients'), orderBy('sort_order'))
    )
    for (const d of ingSnap.docs) {
      const oldName = d.data().name
      const canonical = renames.get(oldName)
      if (!canonical) { skipped++; continue }

      const catId = canonCatalogId.get(canonical)
      if (!DRY_RUN) {
        await updateDoc(
          doc(db, 'recipes', rDoc.id, 'ingredients', d.id),
          { name: canonical, catalog_id: catId }
        )
      }
      console.log(`${DRY_RUN ? '[DRY RUN] ' : ''}  "${oldName}" → "${canonical}"  (recipe ${rDoc.id})`)
      renamed++
    }
  }

  // Delete now-unused catalog entries for the old names
  let deleted = 0
  for (const [oldName, canonical] of renames) {
    // Only delete if no other rename points to this same old name as a canonical
    const isAlsoCanonical = [...renames.values()].includes(oldName)
    if (isAlsoCanonical) continue

    const key = oldName.toLowerCase().trim()
    const entry = catalogByName.get(key)
    if (!entry) continue

    if (!DRY_RUN) await deleteDoc(doc(db, 'ingredients_catalog', entry.id))
    console.log(`${DRY_RUN ? '[DRY RUN] ' : ''}✓ Deleted old catalog entry "${oldName}"`)
    deleted++
  }

  console.log('\n── Summary ───────────────────────────────────────────────────────')
  console.log(`Ingredient docs renamed:  ${renamed}`)
  console.log(`Catalog entries deleted:  ${deleted}`)
  if (DRY_RUN) console.log('\nRun without --dry-run to apply these changes.')
  else console.log('\nDone.')

  process.exit(0)
}

run().catch(e => { console.error(e); process.exit(1) })
