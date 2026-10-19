import { initializeApp } from 'firebase/app'
import { getFirestore, collection, doc, writeBatch, getDocs, query, where } from 'firebase/firestore'

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

const UPDATED_RECIPE = {
  version:        '2.0',
  status:         'experimental',
  brix_min:       19,
  brix_max:       22,
  ph_min:         2.8,
  ph_max:         3.2,
  melt_min:       6,
  melt_max:       10,
  notes: `Dark & Stormy-inspired cube: ginger-forward and lime-driven using degassed commercial ginger beer as the base. v2.0 replaces fresh-pressed ginger juice and blackstrap molasses — the molasses in v1 overwhelmed the drink. Dark rum's own molasses character carries that note when poured over; the cube doesn't need to replicate it.

Ginger beer base: Fever-Tree is recommended for its assertive real-ginger bite. Q Ginger Beer and Bundaberg are good alternatives. Avoid mainstream brands (Canada Dry, Schweppes) — low ginger content produces a flat result.

Degas before freezing: CO2 escapes during freezing regardless, but degassing first (open 20–30 min, stir gently) prevents micro-bubble cloudiness and brittle texture in the finished cube.

Brix varies by brand: Fever-Tree runs ~11 Brix. Measure after combining and adjust demerara syrup up or down before filling.

SPIRIT PAIRINGS
• Primary: Dark rum — Gosling's Black Seal (traditional), Appleton 12yr, Plantation Original Dark
• Secondary: Bourbon — high-rye expressions (Bulleit, Knob Creek) for a Kentucky Mule profile
• Tertiary: Rye — spice-forward, assertive`,
  recipe_body: `<h3>1. Degas the Ginger Beer</h3>
<p>Pour <strong>450 ml Fever-Tree Ginger Beer</strong> into a pitcher. Leave uncovered for <strong>20–30 minutes</strong>, stirring gently once or twice. Carbonation should be mostly gone before proceeding — freezing carbonated liquid creates cloudiness and brittle ice.</p>
<h3>2. Combine Blend</h3>
<p>Add to the degassed ginger beer:</p>
<ul>
<li><p><strong>75 ml</strong> fresh lime juice, strained</p></li>
<li><p><strong>160 ml</strong> demerara simple syrup (1:1 — turbinado or raw cane sugar)</p></li>
<li><p><strong>0.1 tsp</strong> fine sea salt</p></li>
</ul>
<p>Stir until fully combined. Rest 3 minutes before measuring.</p>
<h3>3. Validate Brix and pH</h3>
<p><strong>Brix target: 19–22.</strong> Ginger beer Brix varies by brand — Fever-Tree runs ~11, others may differ. Adjust demerara syrup up (low) or add a splash of filtered water (high). <strong>pH target: 2.8–3.2.</strong> Lime handles the acid; if above 3.2, add lime juice 1 tsp at a time and re-check.</p>
<h3>4. Fill and Freeze</h3>
<p>Fill mold cavities to <strong>100 g (3.5 oz)</strong>. Tap 3–4 times to release air pockets. Cover with plastic wrap pressed to the surface. Freeze at 0–10°F for a minimum of <strong>8 hours</strong>.</p>
<h3>5. Unmold and Validate</h3>
<p>Cube will be pale gold. <strong>Melt validation:</strong> pour 2 oz dark rum neat. Ginger and lime bloom immediately. Demerara sweetness at 2–3 min. Full Dark &amp; Stormy profile at <strong>6–10 min</strong> — the rum's molasses character integrates with the ginger base as the cube opens up.</p>`,
}

const NEW_INGREDIENTS = [
  { name: 'Fever-Tree Ginger Beer, degassed',     amount: 450,  unit: 'ml',  sort_order: 0, catalog_id: null, brand: 'Fever-Tree' },
  { name: 'Fresh lime juice, strained',           amount: 75,   unit: 'ml',  sort_order: 1, catalog_id: null, brand: null },
  { name: 'Demerara simple syrup (1:1)',           amount: 160,  unit: 'ml',  sort_order: 2, catalog_id: null, brand: null },
  { name: 'Fine sea salt',                        amount: 0.1,  unit: 'tsp', sort_order: 3, catalog_id: null, brand: null },
]

async function main() {
  const dryRun = process.argv.includes('--dry-run')

  const snap = await getDocs(query(collection(db, 'recipes'), where('sku', '==', 'BLM-DKS-001')))
  if (snap.empty) {
    console.error('Recipe BLM-DKS-001 not found.')
    process.exit(1)
  }

  const recipeDoc = snap.docs[0]
  const recipeId  = recipeDoc.id
  const existing  = recipeDoc.data()

  if (dryRun) {
    console.log(`DRY RUN — would update recipe "${existing.expression}" (${existing.sku}) id: ${recipeId}`)
    console.log(`  version: ${existing.version} → ${UPDATED_RECIPE.version}`)
    console.log(`  brix: ${existing.brix_min}–${existing.brix_max} → ${UPDATED_RECIPE.brix_min}–${UPDATED_RECIPE.brix_max}`)
    console.log(`  ph: ${existing.ph_min}–${existing.ph_max} → ${UPDATED_RECIPE.ph_min}–${UPDATED_RECIPE.ph_max}`)
    console.log(`  melt: ${existing.melt_min}–${existing.melt_max} → ${UPDATED_RECIPE.melt_min}–${UPDATED_RECIPE.melt_max}`)
    console.log(`  ingredients (${NEW_INGREDIENTS.length}):`)
    NEW_INGREDIENTS.forEach(i => console.log(`    ${i.sort_order + 1}. ${i.name} — ${i.amount} ${i.unit}`))
    process.exit(0)
  }

  // Delete existing ingredients sub-collection, write new recipe fields + new ingredients
  const ingSnap = await getDocs(collection(db, 'recipes', recipeId, 'ingredients'))
  const wb = writeBatch(db)

  // Update recipe doc
  wb.update(doc(db, 'recipes', recipeId), UPDATED_RECIPE)

  // Replace all ingredients
  ingSnap.docs.forEach(d => wb.delete(d.ref))
  NEW_INGREDIENTS.forEach(ing => {
    wb.set(doc(collection(db, 'recipes', recipeId, 'ingredients')), ing)
  })

  await wb.commit()

  console.log(`✓ Updated "${existing.expression}" (${existing.sku}) to v${UPDATED_RECIPE.version} — id: ${recipeId}`)
  console.log(`  Replaced ${ingSnap.size} ingredients with ${NEW_INGREDIENTS.length}.`)
  process.exit(0)
}

main().catch(err => { console.error(err); process.exit(1) })
