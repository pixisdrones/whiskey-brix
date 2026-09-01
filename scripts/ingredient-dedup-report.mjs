// Scans every recipe ingredient across all recipes and produces a de-duplication
// report: exact-match groups (same name after punctuation normalization) and
// fuzzy-match groups (Levenshtein distance ≤ threshold on normalized name).
//
// Usage:
//   node scripts/ingredient-dedup-report.mjs            # human-readable report
//   node scripts/ingredient-dedup-report.mjs --json     # also write merge-map.json
//
// The generated merge-map.json is the input for the upcoming merge script —
// edit canonical values there, then run: node scripts/ingredient-merge.mjs

import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, query, orderBy } from 'firebase/firestore'
import { writeFileSync } from 'fs'

const WRITE_JSON = process.argv.includes('--json')

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

// ── Helpers ────────────────────────────────────────────────────────────────────

function norm(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[()[\]]/g, '')          // remove brackets
    .replace(/[\s\-–—:,/]+/g, ' ')   // normalize separators → space
    .replace(/\s+/g, ' ')
    .trim()
}

function levenshtein(a, b) {
  const m = a.length, n = b.length
  if (m === 0) return n
  if (n === 0) return m
  const dp = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)])
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
  return dp[m][n]
}

function areSimilar(na, nb) {
  if (na === nb) return true
  // One is a substring of the other (common for "fresh lemon juice" vs "lemon juice")
  if (na.includes(nb) || nb.includes(na)) return true
  // Levenshtein — allow up to 3 edits or 20% of the longer name
  const threshold = Math.max(3, Math.floor(Math.max(na.length, nb.length) * 0.20))
  return levenshtein(na, nb) <= threshold
}

// Union-Find for clustering
function makeUF(n) {
  const parent = Array.from({ length: n }, (_, i) => i)
  const find = i => (parent[i] === i ? i : (parent[i] = find(parent[i])))
  const union = (a, b) => { parent[find(a)] = find(b) }
  return { find, union }
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function run() {
  // 1. Load recipes
  const recipesSnap = await getDocs(collection(db, 'recipes'))
  const recipeNames = {}
  recipesSnap.docs.forEach(d => { recipeNames[d.id] = d.data().name ?? d.id })

  // 2. Load all ingredient instances
  const instances = []   // { recipeId, recipeName, docId, name, unit }
  for (const rDoc of recipesSnap.docs) {
    const ingSnap = await getDocs(
      query(collection(db, 'recipes', rDoc.id, 'ingredients'), orderBy('sort_order'))
    )
    ingSnap.docs.forEach(d => {
      instances.push({
        recipeId:   rDoc.id,
        recipeName: recipeNames[rDoc.id],
        docId:      d.id,
        name:       d.data().name ?? '',
        unit:       d.data().unit ?? '',
      })
    })
  }

  // 3. Aggregate: unique name → { recipes: Set<name>, units: Set<unit>, count }
  const byName = new Map()  // canonical display name → info
  for (const { name, unit, recipeName } of instances) {
    if (!name) continue
    const existing = [...byName.keys()].find(k => k === name)
    if (existing) {
      byName.get(existing).recipes.add(recipeName)
      byName.get(existing).units.add(unit)
      byName.get(existing).count++
    } else {
      byName.set(name, { recipes: new Set([recipeName]), units: new Set([unit]), count: 1 })
    }
  }

  const names = [...byName.keys()]
  const normed = names.map(norm)

  // 4. Cluster by similarity (union-find on normalized names)
  const { find, union } = makeUF(names.length)
  for (let i = 0; i < normed.length; i++)
    for (let j = i + 1; j < normed.length; j++)
      if (areSimilar(normed[i], normed[j]))
        union(i, j)

  // 5. Group clusters
  const clusters = new Map()  // root → [indices]
  for (let i = 0; i < names.length; i++) {
    const root = find(i)
    if (!clusters.has(root)) clusters.set(root, [])
    clusters.get(root).push(i)
  }

  // 6. Separate singletons from groups needing review
  const groups = [...clusters.values()].sort((a, b) => b.length - a.length)
  const needsReview = groups.filter(g => g.length > 1)
  const singletons  = groups.filter(g => g.length === 1)

  // ── Report ─────────────────────────────────────────────────────────────────

  console.log('══════════════════════════════════════════════════════════════════')
  console.log('  Ingredient De-Duplication Report')
  console.log('══════════════════════════════════════════════════════════════════')
  console.log(`Recipes scanned:           ${recipesSnap.size}`)
  console.log(`Total ingredient instances: ${instances.length}`)
  console.log(`Unique ingredient names:    ${names.length}`)
  console.log(`Groups needing review:      ${needsReview.length}`)
  console.log(`Clean singletons:           ${singletons.length}`)
  console.log()

  if (needsReview.length === 0) {
    console.log('✓ No duplicate or similar ingredient names detected.')
  } else {
    console.log('── Groups to review ──────────────────────────────────────────────')
    console.log('  (★ = suggested canonical — most-used variant in that group)\n')

    needsReview.forEach((indices, gi) => {
      // Sort variants by usage count desc
      const variants = indices
        .map(i => ({ name: names[i], ...byName.get(names[i]) }))
        .sort((a, b) => b.count - a.count)

      const canonical = variants[0].name   // most-used = suggestion

      console.log(`  [${gi + 1}] ─────────────────────────────────────────────────`)
      variants.forEach(v => {
        const tag  = v.name === canonical ? '★' : '·'
        const recs = [...v.recipes].join(', ')
        const unt  = [...v.units].join('/')
        console.log(`    ${tag} "${v.name}"`)
        console.log(`        used in: ${recs}`)
        console.log(`        unit: ${unt}  ×${v.count} instance${v.count !== 1 ? 's' : ''}`)
      })
      console.log()
    })
  }

  console.log('── All unique names (sorted) ─────────────────────────────────────')
  ;[...byName.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([name, { count, recipes }]) => {
      console.log(`  "${name}"  ×${count}  [${[...recipes].join(' | ')}]`)
    })

  // 7. Optionally write merge-map.json
  if (WRITE_JSON) {
    const mergeMap = needsReview.map(indices => {
      const variants = indices
        .map(i => ({ name: names[i], ...byName.get(names[i]) }))
        .sort((a, b) => b.count - a.count)
      return {
        canonical: variants[0].name,   // edit this to your preferred canonical name
        variants:  variants.map(v => ({
          name:    v.name,
          count:   v.count,
          recipes: [...v.recipes],
          units:   [...v.units],
        })),
      }
    })

    const out = JSON.stringify({ generated: new Date().toISOString(), groups: mergeMap }, null, 2)
    writeFileSync('merge-map.json', out)
    console.log('\n✓ merge-map.json written — edit "canonical" values, then run:')
    console.log('  node scripts/ingredient-merge.mjs')
  } else {
    console.log('\nTip: run with --json to generate merge-map.json for the merge script.')
  }

  process.exit(0)
}

run().catch(e => { console.error(e); process.exit(1) })
