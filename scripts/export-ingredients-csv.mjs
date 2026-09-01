// Exports every unique ingredient name across all recipes to ingredients.csv.
// Fill in the "canonical_name" column for any row you want renamed (leave blank to keep as-is),
// then re-run: node scripts/apply-ingredients-csv.mjs
//
// Usage:
//   node scripts/export-ingredients-csv.mjs

import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, query, orderBy } from 'firebase/firestore'
import { writeFileSync } from 'fs'

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

function csvCell(v) {
  const s = String(v ?? '')
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"`
    : s
}

async function run() {
  const recipesSnap = await getDocs(collection(db, 'recipes'))
  const recipeNames = {}
  recipesSnap.docs.forEach(d => { recipeNames[d.id] = d.data().name ?? d.id })

  // Aggregate: name → { unit counts, recipe names }
  const byName = new Map()

  for (const rDoc of recipesSnap.docs) {
    const ingSnap = await getDocs(
      query(collection(db, 'recipes', rDoc.id, 'ingredients'), orderBy('sort_order'))
    )
    ingSnap.docs.forEach(d => {
      const { name, unit } = d.data()
      if (!name) return
      if (!byName.has(name)) byName.set(name, { units: new Set(), recipes: new Set(), count: 0 })
      const entry = byName.get(name)
      entry.units.add(unit ?? '')
      entry.recipes.add(recipeNames[rDoc.id])
      entry.count++
    })
  }

  const rows = [...byName.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([name, { units, recipes, count }]) => [
      csvCell(name),
      '',                                      // canonical_name — user fills this in
      csvCell([...units].join(' / ')),
      count,
      csvCell([...recipes].join(' | ')),
    ])

  const header = 'name,canonical_name,unit,count,recipes'
  const csv = [header, ...rows.map(r => r.join(','))].join('\n')

  writeFileSync('ingredients.csv', csv)
  console.log(`✓ ingredients.csv written — ${rows.length} unique ingredient names`)
  console.log('  Fill in "canonical_name" for rows you want renamed, then run:')
  console.log('  node scripts/apply-ingredients-csv.mjs')

  process.exit(0)
}

run().catch(e => { console.error(e); process.exit(1) })
