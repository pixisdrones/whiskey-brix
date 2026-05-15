import {
  collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc,
  query, where, orderBy, writeBatch
} from 'firebase/firestore'
import { db } from './firebase.js'

// ── Helpers ──────────────────────────────────────────────────────────────────

const C = {
  recipes:    ()         => collection(db, 'recipes'),
  ingredients:(rid)      => collection(db, 'recipes', rid, 'ingredients'),
  batches:    ()         => collection(db, 'batches'),
  freezeTests:()         => collection(db, 'freeze_tests'),
  tastings:   ()         => collection(db, 'tastings'),
  timepoints: (tid)      => collection(db, 'tastings', tid, 'timepoints'),
  molds:      ()         => collection(db, 'molds'),
  batchCubes: ()         => collection(db, 'batch_cubes'),
  testers:    ()         => collection(db, 'testers'),
  catalog:    ()         => collection(db, 'ingredients_catalog'),
}

const row  = snap => ({ id: snap.id, ...snap.data() })
const rows = snap => snap.docs.map(row)
const now  = ()   => new Date().toISOString()
const uid  = ()   => crypto.randomUUID()

const SHAPE_CODES = { Sphere: 'SP', Cube: 'CU', 'Collins Spear': 'CS', Cylinder: 'CY', Other: 'OT' }

// ── Seed default recipes on first load ───────────────────────────────────────

async function seedIfEmpty() {
  const snap = await getDocs(C.recipes())
  if (snap.size > 0) return
  const ts = now()
  const wb = writeBatch(db)
  const seeds = [
    { sku: 'BLM-HL-001', expression: 'Honey Lemon',         version: '1.0', status: 'active',       spirit_pairing: 'Bourbon', brix_min: 20, brix_max: 22, ph_min: 2.4, ph_max: 3.0, melt_min: 8, melt_max: 12 },
    { sku: 'BLM-RLP-001', expression: 'Rosemary Lemon Peel', version: '1.0', status: 'active',       spirit_pairing: 'Gin',     brix_min: 12, brix_max: 15, ph_min: 2.8, ph_max: 3.2, melt_min: 8, melt_max: 12 },
    { sku: 'BLM-LA-001',  expression: 'Lime Agave',          version: '1.0', status: 'active',       spirit_pairing: 'Tequila', brix_min: 20, brix_max: 22, ph_min: 2.2, ph_max: 2.8, melt_min: 6, melt_max: 10 },
    { sku: 'BLM-CH-001',  expression: 'Cranberry Hibiscus',  version: '1.0', status: 'active',       spirit_pairing: 'Vodka',   brix_min: 18, brix_max: 20, ph_min: 2.8, ph_max: 3.4, melt_min: 8, melt_max: 12 },
    { sku: 'BLM-MJ-001',  expression: 'Mint Julep',          version: '1.0', status: 'experimental', spirit_pairing: 'Bourbon', brix_min: 18, brix_max: 21, ph_min: 2.8, ph_max: 3.2, melt_min: 5, melt_max: 8 },
  ]
  seeds.forEach((s, i) => {
    const ref = doc(C.recipes())
    wb.set(ref, { ...s, notes: null, recipe_body: null, parent_id: null, created_at: ts })
    if (i === 0) {
      ;[
        { name: 'Fresh lemon juice', amount: 120, unit: 'ml', sort_order: 0 },
        { name: 'Raw honey',         amount: 80,  unit: 'ml', sort_order: 1 },
        { name: 'Simple syrup 2:1',  amount: 60,  unit: 'ml', sort_order: 2 },
        { name: 'Filtered water',    amount: 40,  unit: 'ml', sort_order: 3 },
      ].forEach(ing => wb.set(doc(C.ingredients(ref.id)), { ...ing, catalog_id: null, brand: null }))
    }
  })
  await wb.commit()
}
seedIfEmpty().catch(console.error)

async function migrateRecipeData() {
  console.log('[migrate] checking for BLM-AZ-001...')
  const check = await getDocs(query(C.recipes(), where('sku', '==', 'BLM-AZ-001')))
  if (check.size > 0) { console.log('[migrate] already migrated, skipping'); return }

  const snap = await getDocs(C.recipes())
  console.log('[migrate] found', snap.size, 'recipes:', snap.docs.map(d => d.data().sku))
  const bysku = {}
  snap.docs.forEach(d => { bysku[d.data().sku] = d.id })

  const wb = writeBatch(db)
  const addIngs = (rid, ings) =>
    ings.forEach((ing, i) =>
      wb.set(doc(C.ingredients(rid)), { name: ing.name, amount: ing.amount, unit: ing.unit, catalog_id: null, brand: null, sort_order: i })
    )

  const rlpId = bysku['BLM-RLP-001']
  if (rlpId) {
    wb.update(doc(db, 'recipes', rlpId), { recipe_body: '<ol><li>Heat water until warm (not boiling). Add rosemary sprigs and steep 15 minutes.</li><li>Strain rosemary completely; cool infusion to room temperature.</li><li>Whisk rosemary water, lemon juice, and simple syrup until uniform.</li><li>Pour into molds with headspace. Tap molds 3–4 times to release air.</li><li>Freeze at 0–10°F for a minimum of 12 hours.</li></ol>' })
    addIngs(rlpId, [
      { name: 'Filtered water', amount: 4, unit: 'cup' },
      { name: 'Fresh rosemary sprigs', amount: 5, unit: 'unit' },
      { name: 'Fresh lemon juice', amount: 4, unit: 'cup' },
      { name: 'Simple syrup (1:1)', amount: 4, unit: 'cup' },
    ])
  }

  const laId = bysku['BLM-LA-001']
  if (laId) {
    wb.update(doc(db, 'recipes', laId), { recipe_body: '<ol><li>Whisk lime juice, agave syrup, and water until fully blended.</li><li>Dissolve salt completely — no grit.</li><li>Taste: should be bright, lightly savory, not "salty."</li><li>Pour into molds with headspace. Tap molds 3–4 times to release air.</li><li>Freeze at 0–10°F for a minimum of 12 hours.</li></ol>' })
    addIngs(laId, [
      { name: 'Fresh lime juice', amount: 4, unit: 'cup' },
      { name: 'Light agave syrup', amount: 4, unit: 'cup' },
      { name: 'Filtered water', amount: 4, unit: 'cup' },
      { name: 'Fine kosher salt', amount: 1.25, unit: 'tsp' },
    ])
  }

  const chId = bysku['BLM-CH-001']
  if (chId) {
    wb.update(doc(db, 'recipes', chId), { recipe_body: '<ol><li>Brew hibiscus tea strong; cool fully to room temperature.</li><li>Whisk cranberry juice, hibiscus tea, and simple syrup together.</li><li>Taste for balance — should be tart but not sharp.</li><li>Pour into molds with headspace. Tap molds 3–4 times to release air.</li><li>Freeze at 0–10°F for a minimum of 12 hours.</li></ol>' })
    addIngs(chId, [
      { name: 'Cranberry juice (unsweetened)', amount: 6, unit: 'cup' },
      { name: 'Hibiscus tea (strong, cooled)', amount: 3, unit: 'cup' },
      { name: 'Simple syrup (1:1)', amount: 3, unit: 'cup' },
    ])
  }

  const mjId = bysku['BLM-MJ-001']
  if (mjId) {
    wb.update(doc(db, 'recipes', mjId), {
      brix_min: 23, brix_max: 24, melt_min: 3, melt_max: 6,
      recipe_body: '<ol><li>Make mint-infused simple syrup: Heat 1 cup simple syrup to ~170°F — do not boil. Add 11g mint leaves. Steep exactly 10–11 minutes. Strain immediately, pressing leaves gently. Cool in ice bath below 50°F. Target: pale chartreuse to light gold. Dark green = over-extracted, discard and restart.</li><li>Make mint infusion water: Heat 1 cup water to near-boiling. Add 9g mint leaves. Steep 10 minutes. Strain, pressing firmly. Cool to room temperature.</li><li>Combine blend: mint syrup, mint infusion water, remaining 1 cup simple syrup, 1 cup water, and salt. Stir gently — do not whisk. Rest 3 minutes.</li><li>Validate Brix: target 23–24 °Bx. If low, add simple syrup in 1 tbsp increments. Do not proceed outside 22–25 °Bx.</li><li>Fill molds to ~100g (3.5 oz) per cavity. Tap 3–4 times. Cover tightly with plastic wrap — this SKU absorbs freezer odors. Freeze at 0–10°F for 8 hours minimum.</li><li>Unmold by running cold water over mold base for 5 seconds. Melt validation: pour 2 oz bourbon over cube — mint aroma bloom should be immediate and pronounced.</li></ol>'
    })
    addIngs(mjId, [
      { name: 'Fresh mint leaves (for syrup)', amount: 11, unit: 'g' },
      { name: 'Fresh mint leaves (for infusion)', amount: 9, unit: 'g' },
      { name: 'Simple syrup 1:1 (mint syrup base)', amount: 1, unit: 'cup' },
      { name: 'Hot filtered water (mint infusion)', amount: 1, unit: 'cup' },
      { name: 'Simple syrup 1:1 (final blend)', amount: 1, unit: 'cup' },
      { name: 'Filtered water (final blend)', amount: 1, unit: 'cup' },
      { name: 'Fine sea salt', amount: 0.1, unit: 'tsp' },
    ])
  }

  const azRef = doc(C.recipes())
  wb.set(azRef, { sku: 'BLM-AZ-001', expression: 'Azalea', version: '1.0', status: 'active', spirit_pairing: 'Bourbon', brix_min: 23, brix_max: 24, ph_min: 2.6, ph_max: 2.9, melt_min: 3, melt_max: 6, notes: 'Seasonal Masters Tournament SKU. Bright pink-red — strong visual asset for gifting.', parent_id: null, recipe_body: '<ol><li>Juice enough lemons to yield 1 cup fresh lemon juice, strained. Do not use bottled juice.</li><li>Combine all ingredients in a large pitcher: lemon juice, cranberry juice, simple syrup, grenadine, water, and salt. Stir gently — blend should be bright saturated pink-red. Rest 3 minutes before measuring.</li><li>Validate Brix (target 23–24) and pH (target 2.6–2.9). Adjust with water or simple syrup in 1 tbsp increments as needed.</li><li>Fill each mold cavity to ~100g (3.5 oz). Tap 3–4 times. Cover with plastic wrap. Freeze at 0–10°F for 8 hours minimum.</li><li>Unmold using cold water over mold base for 5 seconds. Melt validation: pour 2 oz bourbon — color bloom should be immediate and dramatic.</li></ol>', created_at: now() })
  addIngs(azRef.id, [
    { name: 'Fresh lemon juice, strained', amount: 1, unit: 'cup' },
    { name: '100% cranberry juice (unsweetened)', amount: 1, unit: 'cup' },
    { name: 'Simple syrup 1:1', amount: 1, unit: 'cup' },
    { name: 'Grenadine (pomegranate-based)', amount: 0.5, unit: 'cup' },
    { name: 'Filtered water', amount: 0.5, unit: 'cup' },
    { name: 'Fine sea salt', amount: 0.1, unit: 'tsp' },
  ])

  const obRef = doc(C.recipes())
  wb.set(obRef, { sku: 'BLM-OB-001', expression: 'Orange Bitters', version: '1.0', status: 'active', spirit_pairing: 'Bourbon', brix_min: 22, brix_max: 24, ph_min: null, ph_max: null, melt_min: 4, melt_max: 7, notes: 'Old Fashioned–adjacent. Two-stage orange extraction. Angostura bitters background note.', parent_id: null, recipe_body: '<ol><li>Make orange peel syrup: Zest 2 oranges (microplane, avoid white pith). Combine peel with 1 cup simple syrup; warm to 150–160°F for 15 minutes. Strain, pressing firmly. Cool to room temperature.</li><li>Make orange peel infusion water: Zest the 3rd orange. Combine peel with 1 cup water at ~170°F. Steep 10 minutes. Strain, pressing firmly. Cool to room temperature.</li><li>Combine blend: orange peel syrup, orange infusion water, 1 cup simple syrup, 0.8 cup water, orange juice, Angostura bitters, and salt. Stir gently. Rest 3 minutes.</li><li>Validate Brix: target 23. Bitter should be background, not foreground. If bitters dominate, add up to 2 tbsp water. Do not proceed outside 22–24 Brix.</li><li>Fill mold cavities to ~100g (3.5 oz). Tap 3–4 times. Cover with plastic wrap. Freeze at 0–10°F for 8 hours minimum.</li><li>Unmold using cold water over mold base for 5 seconds. Melt validation: pour 2 oz bourbon — orange aroma immediate, bitters builds to balanced expression at 4–7 min.</li></ol>', created_at: now() })
  addIngs(obRef.id, [
    { name: 'Large navel oranges, zested', amount: 3, unit: 'unit' },
    { name: 'Simple syrup 1:1 (orange peel syrup)', amount: 1, unit: 'cup' },
    { name: 'Hot filtered water (orange infusion)', amount: 1, unit: 'cup' },
    { name: 'Simple syrup 1:1 (final blend)', amount: 1, unit: 'cup' },
    { name: 'Filtered water (final blend)', amount: 0.8, unit: 'cup' },
    { name: 'Fresh orange juice, strained', amount: 0.3, unit: 'cup' },
    { name: 'Angostura bitters', amount: 0.3, unit: 'tsp' },
    { name: 'Fine sea salt', amount: 0.1, unit: 'tsp' },
  ])

  const smRef = doc(C.recipes())
  wb.set(smRef, { sku: 'BLM-SM-001', expression: 'Smoked Maple', version: '1.0', status: 'active', spirit_pairing: 'Bourbon', brix_min: 24, brix_max: 25, ph_min: null, ph_max: null, melt_min: 4, melt_max: 8, notes: 'Highest-Brix SKU. Lapsang souchong — 4 min steep maximum. Grade B maple only.', parent_id: null, recipe_body: '<ol><li>Make smoke infusion: Heat 1 cup water to ~200°F (just off boiling). Add 1 tsp lapsang souchong. Steep exactly 4–4.5 minutes — set a timer. Strain through fine mesh; do not squeeze leaves. Cool to room temperature. If smoke smells acrid or pine-resin dominant, discard and restart.</li><li>Combine blend: smoke infusion, 1 cup Grade B maple syrup, 1 cup simple syrup, 1 cup water, and salt. Stir thoroughly — maple is viscous and will settle. Rest 3 minutes before measuring.</li><li>Validate Brix: target 24–25. If above 26, add water in 2 tbsp increments. Maple should be primary flavor, smoke secondary.</li><li>Fill mold cavities to ~100g (3.5 oz). Tap 4–5 times — most viscous blend in portfolio. Cover tightly with plastic wrap. Freeze at 0–10°F for 10 hours minimum (12 hours recommended for first batch).</li><li>Unmold using cold water over mold base for 5 seconds. Melt validation: pour 2 oz bourbon — maple aroma first, smoke second. Full expression at 4–8 min.</li></ol>', created_at: now() })
  addIngs(smRef.id, [
    { name: 'Hot filtered water (smoke infusion)', amount: 1, unit: 'cup' },
    { name: 'Lapsang souchong loose leaf tea', amount: 1, unit: 'tsp' },
    { name: 'Grade B (dark) pure maple syrup', amount: 1, unit: 'cup' },
    { name: 'Simple syrup 1:1', amount: 1, unit: 'cup' },
    { name: 'Filtered water (final blend)', amount: 1, unit: 'cup' },
    { name: 'Fine sea salt', amount: 0.1, unit: 'tsp' },
  ])

  const cvRef = doc(C.recipes())
  wb.set(cvRef, { sku: 'BLM-CV-001', expression: 'Cherry Vanilla', version: '1.0', status: 'active', spirit_pairing: 'Bourbon', brix_min: 23, brix_max: 24, ph_min: null, ph_max: null, melt_min: 4, melt_max: 7, notes: 'Deep burgundy — most visually striking in portfolio. Tart cherry contributes ~12–14 Brix of its own; watch for high readings.', parent_id: null, recipe_body: '<ol><li>Make vanilla infusion water: Split and scrape 0.5 vanilla bean into 1 cup water; add scraped pod. Heat gently to 170°F — do not boil. Cover and steep 15 minutes. Strain, discarding solids. Cool to room temperature.</li><li>Make cherry syrup: Combine 0.5 cup tart cherry juice and 0.5 cup simple syrup in a saucepan. Warm until fully combined — do not reduce. Cool to room temperature.</li><li>Combine blend: cherry syrup, 1 cup tart cherry juice, vanilla infusion water, 1 cup simple syrup, and salt. Stir gently. Blend should be deep ruby-red. Rest 3 minutes before measuring.</li><li>Validate Brix: target 23–24. Tart cherry tends to push Brix high — if above 25, dilute with 2 tbsp water. Cherry should dominate, vanilla a warm background note.</li><li>Fill mold cavities to ~100g (3.5 oz). Tap 3–4 times. Cover with plastic wrap. Freeze at 0–10°F for 8 hours minimum.</li><li>Unmold using cold water over mold base for 5 seconds. Melt validation: pour 2 oz bourbon — cherry and vanilla aroma immediate, full balance at 4–7 min.</li></ol>', created_at: now() })
  addIngs(cvRef.id, [
    { name: 'Tart cherry juice (for cherry syrup)', amount: 0.5, unit: 'cup' },
    { name: 'Simple syrup 1:1 (for cherry syrup)', amount: 0.5, unit: 'cup' },
    { name: 'Tart cherry juice (final blend)', amount: 1, unit: 'cup' },
    { name: 'Hot filtered water (vanilla infusion)', amount: 1, unit: 'cup' },
    { name: 'Vanilla bean, split and scraped', amount: 0.5, unit: 'unit' },
    { name: 'Simple syrup 1:1 (final blend)', amount: 1, unit: 'cup' },
    { name: 'Fine sea salt', amount: 0.1, unit: 'tsp' },
  ])

  console.log('[migrate] committing batch...')
  await wb.commit()
  console.log('[migrate] done — 8 recipes seeded/updated')
}
migrateRecipeData().catch(e => console.error('[migrate] FAILED:', e))

// ── API ───────────────────────────────────────────────────────────────────────

export const api = {

  // ── Dashboard ──────────────────────────────────────────────────────────────

  getDashboard: async () => {
    const [recipesSnap, batchesSnap, freezeSnap, tastingsSnap, cubesSnap] = await Promise.all([
      getDocs(C.recipes()),
      getDocs(query(C.batches(), orderBy('created_at', 'desc'))),
      getDocs(C.freezeTests()),
      getDocs(C.tastings()),
      getDocs(C.batchCubes()),
    ])
    const recipes  = rows(recipesSnap)
    const batches  = rows(batchesSnap)
    const tastings = rows(tastingsSnap)

    const brixMisses = batches.filter(b =>
      b.observed_brix != null && b.brix_min != null && b.brix_max != null &&
      (b.observed_brix < b.brix_min || b.observed_brix > b.brix_max)
    ).length

    const scores = tastings.map(t => t.overall_score).filter(s => s != null)
    const avgScore = scores.length > 0
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
      : null

    const cubes = rows(cubesSnap)

    return {
      totalRecipes:    recipes.length,
      totalBatches:    batches.length,
      brixMisses,
      totalFreezeTests: freezeSnap.size,
      avgScore,
      cubesCreated:   cubes.length,
      cubesTasted:    cubes.filter(c => c.tasting_id).length,
      cubesAvailable: cubes.filter(c => c.status === 'frozen' && !c.tasting_id).length,
      qaTargets:    recipes.map(r => ({ ...r, batch_count: batches.filter(b => b.recipe_id === r.id).length })),
      recentBatches: batches.slice(0, 20),
      brixDist:      batches.filter(b => b.observed_brix != null).slice(0, 50).map(b => ({
        observed_brix: b.observed_brix, brix_min: b.brix_min, brix_max: b.brix_max, expression: b.expression
      })),
    }
  },

  // ── Recipes ────────────────────────────────────────────────────────────────

  getRecipes: async () => {
    const snap = await getDocs(query(C.recipes(), orderBy('created_at', 'desc')))
    return rows(snap)
  },

  getRecipe: async (id) => {
    const snap = await getDoc(doc(db, 'recipes', id))
    return row(snap)
  },

  createRecipe: async (data) => {
    const { ingredients, ...recipe } = data
    const ref = doc(C.recipes())
    const wb = writeBatch(db)
    wb.set(ref, { ...recipe, created_at: now() })
    if (Array.isArray(ingredients)) {
      ingredients.forEach((ing, idx) => wb.set(doc(C.ingredients(ref.id)), { catalog_id: ing.catalog_id ?? null, name: ing.name, brand: ing.brand ?? null, amount: ing.amount, unit: ing.unit, sort_order: idx }))
    }
    await wb.commit()
    const snap = await getDoc(ref)
    return row(snap)
  },

  updateRecipe: async (id, data) => {
    const { ingredients, ...recipe } = data
    const existing = await getDocs(C.ingredients(id))
    const wb = writeBatch(db)
    wb.update(doc(db, 'recipes', id), recipe)
    existing.docs.forEach(d => wb.delete(d.ref))
    if (Array.isArray(ingredients)) {
      ingredients.forEach((ing, idx) => wb.set(doc(C.ingredients(id)), { catalog_id: ing.catalog_id ?? null, name: ing.name, brand: ing.brand ?? null, amount: ing.amount, unit: ing.unit, sort_order: idx }))
    }
    await wb.commit()
    const snap = await getDoc(doc(db, 'recipes', id))
    return row(snap)
  },

  deleteRecipe: async (id) => {
    const ingSnap = await getDocs(C.ingredients(id))
    const wb = writeBatch(db)
    ingSnap.docs.forEach(d => wb.delete(d.ref))
    wb.delete(doc(db, 'recipes', id))
    await wb.commit()
    return { ok: true }
  },

  getIngredients: async (id) => {
    const snap = await getDocs(query(C.ingredients(id), orderBy('sort_order')))
    return rows(snap)
  },

  getRecipeCost: async (id) => {
    const [ingSnap, catSnap] = await Promise.all([getDocs(C.ingredients(id)), getDocs(C.catalog())])
    const catalog = Object.fromEntries(catSnap.docs.map(d => [d.id, d.data()]))
    const items = rows(ingSnap).map(i => ({ ...i, cost_per_unit: i.catalog_id ? (catalog[i.catalog_id]?.cost_per_unit ?? null) : null }))
    let total = null
    if (items.length > 0 && items.every(r => r.cost_per_unit != null)) {
      total = items.reduce((s, r) => s + r.amount * r.cost_per_unit, 0)
    } else if (items.some(r => r.cost_per_unit != null)) {
      total = items.reduce((s, r) => s + (r.cost_per_unit != null ? r.amount * r.cost_per_unit : 0), 0)
    }
    return { total, partial: items.some(r => r.cost_per_unit == null) }
  },

  getRecipeBatches: async (id) => {
    const snap = await getDocs(query(C.batches(), where('recipe_id', '==', id)))
return rows(snap)
  .map(b => ({ id: b.id, batch_id: b.batch_id, date: b.date, observed_brix: b.observed_brix, observed_ph: b.observed_ph, batch_size: b.batch_size, batch_unit: b.batch_unit }))
  .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
  },

  getRecipeStats: async (id) => {
    const batchesSnap = await getDocs(query(C.batches(), where('recipe_id', '==', id)))
    const batches = rows(batchesSnap)
    const batchIds = batches.map(b => b.id)
    let cubes = []
    if (batchIds.length > 0) {
      const cubesSnap = await getDocs(C.batchCubes())
      cubes = rows(cubesSnap).filter(c => batchIds.includes(c.batch_id))
    }
    const brixVals = batches.filter(b => b.observed_brix != null).map(b => b.observed_brix)
    return {
      batch_count:     batches.length,
      last_batch_date: batches.map(b => b.date).filter(Boolean).sort().reverse()[0] ?? null,
      avg_brix:        brixVals.length > 0 ? Math.round((brixVals.reduce((a, b) => a + b, 0) / brixVals.length) * 10) / 10 : null,
      cubes_created:   cubes.length,
      cubes_tested:    cubes.filter(c => c.tasting_id).length,
      cubes_inventory: cubes.filter(c => c.status === 'frozen' && !c.tasting_id).length,
    }
  },

  // ── Batches ────────────────────────────────────────────────────────────────

  getBatches: async () => {
    const snap = await getDocs(query(C.batches(), orderBy('created_at', 'desc')))
    return rows(snap)
  },

  getNextBatchId: async (recipe_id, date) => {
    const [recipeSnap, batchesSnap] = await Promise.all([
      getDoc(doc(db, 'recipes', recipe_id)),
      getDocs(query(C.batches(), where('recipe_id', '==', recipe_id))),
    ])
    const recipe = recipeSnap.exists() ? recipeSnap.data() : {}
    const dateStr = (date || new Date().toISOString().slice(0, 10)).replace(/-/g, '')
    return { batch_id: `${recipe.sku ?? 'BLM'}-${dateStr}-${String(batchesSnap.size + 1).padStart(3, '0')}` }
  },

  createBatch: async (data) => {
    let { recipe_id, batch_id, date, ...rest } = data
    const ts = now()
    const recipeSnap = await getDoc(doc(db, 'recipes', recipe_id))
    const recipe = recipeSnap.exists() ? recipeSnap.data() : {}
    if (!batch_id) {
      const batchesSnap = await getDocs(query(C.batches(), where('recipe_id', '==', recipe_id)))
      const dateStr = (date || ts.slice(0, 10)).replace(/-/g, '')
      batch_id = `${recipe.sku ?? 'BLM'}-${dateStr}-${String(batchesSnap.size + 1).padStart(3, '0')}`
    }
    const ref = doc(C.batches())
    const batchData = { ...rest, recipe_id, batch_id, date, sku: recipe.sku ?? null, expression: recipe.expression ?? null, brix_min: recipe.brix_min ?? null, brix_max: recipe.brix_max ?? null, ph_min: recipe.ph_min ?? null, ph_max: recipe.ph_max ?? null, melt_min: recipe.melt_min ?? null, melt_max: recipe.melt_max ?? null, created_at: ts }
    await setDoc(ref, batchData)
    return { id: ref.id, ...batchData }
  },

  updateBatch: async (id, data) => {
    const { recipe_id, ...rest } = data
    const recipeSnap = await getDoc(doc(db, 'recipes', recipe_id))
    const recipe = recipeSnap.exists() ? recipeSnap.data() : {}
    await updateDoc(doc(db, 'batches', id), { ...rest, recipe_id, sku: recipe.sku ?? null, expression: recipe.expression ?? null, brix_min: recipe.brix_min ?? null, brix_max: recipe.brix_max ?? null, ph_min: recipe.ph_min ?? null, ph_max: recipe.ph_max ?? null, melt_min: recipe.melt_min ?? null, melt_max: recipe.melt_max ?? null })
    return row(await getDoc(doc(db, 'batches', id)))
  },

  deleteBatch: async (id) => {
    await deleteDoc(doc(db, 'batches', id))
    return { ok: true }
  },

  planBatch: async (data) => {
    const { recipe_id, target_size, target_unit } = data
    const [ingSnap, catSnap] = await Promise.all([getDocs(query(C.ingredients(recipe_id), orderBy('sort_order'))), getDocs(C.catalog())])
    const catalog = Object.fromEntries(catSnap.docs.map(d => [d.id, d.data()]))
    const ingredients = rows(ingSnap).map(i => ({ ...i, cost_per_unit: i.catalog_id ? (catalog[i.catalog_id]?.cost_per_unit ?? null) : null, catalog_name: i.catalog_id ? (catalog[i.catalog_id]?.name ?? null) : null, catalog_unit: i.catalog_id ? (catalog[i.catalog_id]?.unit ?? null) : null }))
    const TO_ML = { ml: 1, L: 1000, oz: 29.5735, gal: 3785.41, tsp: 4.92892, tbsp: 14.7868, cup: 236.588 }
    const targetMl = (TO_ML[target_unit] ?? 1) * target_size
    const totalVolumeMl = ingredients.reduce((sum, i) => { const f = TO_ML[i.catalog_unit ?? i.unit]; return f != null ? sum + (i.amount ?? 0) * f : sum }, 0)
    const scaleFactor = totalVolumeMl > 0 ? targetMl / totalVolumeMl : 1
    return { ingredients: ingredients.map(i => ({ ...i, scaled_amount: Math.round(i.amount * scaleFactor * 1000) / 1000 })), scale_factor: Math.round(scaleFactor * 1000) / 1000, total_volume: totalVolumeMl, target_unit }
  },

  // ── Freeze Tests ───────────────────────────────────────────────────────────

  getFreezeTests: async () => {
    const snap = await getDocs(query(C.freezeTests(), orderBy('created_at', 'desc')))
    return rows(snap)
  },

  createFreezeTest: async (data) => {
    const { batch_id, mold_id, freezer_in_time, freezer_out_time, qty_cubes, ...rest } = data
    const ts = now()
    const [batchSnap, moldSnap] = await Promise.all([
      getDoc(doc(db, 'batches', batch_id)),
      mold_id ? getDoc(doc(db, 'molds', mold_id)) : Promise.resolve(null),
    ])
    const batch = batchSnap.exists() ? batchSnap.data() : {}
    const mold  = moldSnap?.exists() ? moldSnap.data() : null

    let freeze_time = null
    if (freezer_in_time && freezer_out_time) {
      const diff = new Date(freezer_out_time) - new Date(freezer_in_time)
      if (diff > 0) freeze_time = Math.round(diff / 60000)
    }

    const ref = doc(C.freezeTests())
    const ftData = { ...rest, batch_id, mold_id: mold_id ?? null, freezer_in_time: freezer_in_time ?? null, freezer_out_time: freezer_out_time ?? null, qty_cubes: qty_cubes ?? null, freeze_time, batch_label: batch.batch_id ?? null, recipe_id: batch.recipe_id ?? null, sku: batch.sku ?? null, expression: batch.expression ?? null, melt_min: batch.melt_min ?? null, melt_max: batch.melt_max ?? null, mold_shape: mold?.shape ?? null, mold_volume: mold?.volume_fl_oz ?? null, mold_sections: mold?.sections ?? null, created_at: ts }

    const wb = writeBatch(db)
    wb.set(ref, ftData)
    if (mold_id && mold) {
      const sections = qty_cubes ?? Number(mold.sections)
      for (let s = 1; s <= sections; s++) {
        wb.set(doc(C.batchCubes()), { mold_id, batch_id, freeze_test_id: ref.id, section_number: s, status: 'frozen', tasting_id: null, batch_label: batch.batch_id ?? null, sku: batch.sku ?? null, created_at: ts })
      }
    }
    await wb.commit()
    return { id: ref.id, ...ftData }
  },

  updateFreezeTest: async (id, data) => {
    const { batch_id, mold_id, freezer_in_time, freezer_out_time, ...rest } = data
    const [batchSnap, moldSnap] = await Promise.all([
      getDoc(doc(db, 'batches', batch_id)),
      mold_id ? getDoc(doc(db, 'molds', mold_id)) : Promise.resolve(null),
    ])
    const batch = batchSnap.exists() ? batchSnap.data() : {}
    const mold  = moldSnap?.exists() ? moldSnap.data() : null
    let freeze_time = null
    if (freezer_in_time && freezer_out_time) {
      const diff = new Date(freezer_out_time) - new Date(freezer_in_time)
      if (diff > 0) freeze_time = Math.round(diff / 60000)
    }
    await updateDoc(doc(db, 'freeze_tests', id), { ...rest, batch_id, mold_id: mold_id ?? null, freezer_in_time: freezer_in_time ?? null, freezer_out_time: freezer_out_time ?? null, freeze_time, batch_label: batch.batch_id ?? null, recipe_id: batch.recipe_id ?? null, sku: batch.sku ?? null, expression: batch.expression ?? null, melt_min: batch.melt_min ?? null, melt_max: batch.melt_max ?? null, mold_shape: mold?.shape ?? null, mold_volume: mold?.volume_fl_oz ?? null, mold_sections: mold?.sections ?? null })
    return row(await getDoc(doc(db, 'freeze_tests', id)))
  },

  deleteFreezeTest: async (id) => {
    await deleteDoc(doc(db, 'freeze_tests', id))
    return { ok: true }
  },

  // ── Tastings ───────────────────────────────────────────────────────────────

  getTastings: async () => {
    const snap = await getDocs(query(C.tastings(), orderBy('created_at', 'desc')))
    return Promise.all(rows(snap).map(async t => {
      const tpSnap = await getDocs(query(C.timepoints(t.id), orderBy('phase')))
      return { ...t, timepoints: rows(tpSnap).map(tp => ({ ...tp, flavor_descriptors: Array.isArray(tp.flavor_descriptors) ? tp.flavor_descriptors : [] })) }
    }))
  },

  getNextTastingLabel: async () => {
    const snap = await getDocs(C.tastings())
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    return { tasting_label: `T-${dateStr}-${String(snap.size + 1).padStart(3, '0')}` }
  },

  createTasting: async (data) => {
    const { batch_id, cube_id, timepoints, ...rest } = data
    const ts = now()
    const [batchSnap, tastingsSnap] = await Promise.all([
      getDoc(doc(db, 'batches', batch_id)),
      getDocs(C.tastings()),
    ])
    const batch = batchSnap.exists() ? batchSnap.data() : {}

    let cubeData = null, mold = null
    if (cube_id) {
      const cubeSnap = await getDoc(doc(db, 'batch_cubes', cube_id))
      cubeData = cubeSnap.exists() ? cubeSnap.data() : null
      if (cubeData?.mold_id) {
        const moldSnap = await getDoc(doc(db, 'molds', cubeData.mold_id))
        mold = moldSnap.exists() ? moldSnap.data() : null
      }
    }

    const dateStr = (rest.date || ts.slice(0, 10)).replace(/-/g, '')
    const tasting_label = `T-${dateStr}-${String(tastingsSnap.size + 1).padStart(3, '0')}`

    const ref = doc(C.tastings())
    const tastingData = { ...rest, batch_id, cube_id: cube_id ?? null, tasting_label, batch_label: batch.batch_id ?? null, recipe_id: batch.recipe_id ?? null, sku: batch.sku ?? null, expression: batch.expression ?? null, mold_id: cubeData?.mold_id ?? null, section_number: cubeData?.section_number ?? null, mold_shape: mold?.shape ?? null, mold_volume: mold?.volume_fl_oz ?? null, created_at: ts }

    const wb = writeBatch(db)
    wb.set(ref, tastingData)
    if (Array.isArray(timepoints)) {
      timepoints.forEach(tp => wb.set(doc(C.timepoints(ref.id)), { ...tp, flavor_descriptors: tp.flavor_descriptors ?? [] }))
    }
    if (cube_id) wb.update(doc(db, 'batch_cubes', cube_id), { status: 'tasted', tasting_id: ref.id })
    await wb.commit()

    const tpSnap = await getDocs(query(C.timepoints(ref.id), orderBy('phase')))
    return { id: ref.id, ...tastingData, timepoints: rows(tpSnap) }
  },

  updateTasting: async (id, data) => {
    const { batch_id, cube_id, timepoints, ...rest } = data
    const batchSnap = await getDoc(doc(db, 'batches', batch_id))
    const batch = batchSnap.exists() ? batchSnap.data() : {}
    let cubeData = null, mold = null
    if (cube_id) {
      const cubeSnap = await getDoc(doc(db, 'batch_cubes', cube_id))
      cubeData = cubeSnap.exists() ? cubeSnap.data() : null
      if (cubeData?.mold_id) {
        const moldSnap = await getDoc(doc(db, 'molds', cubeData.mold_id))
        mold = moldSnap.exists() ? moldSnap.data() : null
      }
    }
    const [existingTpSnap] = await Promise.all([getDocs(C.timepoints(id))])
    const wb = writeBatch(db)
    wb.update(doc(db, 'tastings', id), { ...rest, batch_id, cube_id: cube_id ?? null, batch_label: batch.batch_id ?? null, recipe_id: batch.recipe_id ?? null, sku: batch.sku ?? null, expression: batch.expression ?? null, mold_id: cubeData?.mold_id ?? null, section_number: cubeData?.section_number ?? null, mold_shape: mold?.shape ?? null, mold_volume: mold?.volume_fl_oz ?? null })
    existingTpSnap.docs.forEach(d => wb.delete(d.ref))
    if (Array.isArray(timepoints)) {
      timepoints.forEach(tp => wb.set(doc(C.timepoints(id)), { ...tp, flavor_descriptors: tp.flavor_descriptors ?? [] }))
    }
    await wb.commit()
    const snap = await getDoc(doc(db, 'tastings', id))
    const tpSnap = await getDocs(query(C.timepoints(id), orderBy('phase')))
    return { ...row(snap), timepoints: rows(tpSnap).map(tp => ({ ...tp, flavor_descriptors: Array.isArray(tp.flavor_descriptors) ? tp.flavor_descriptors : [] })) }
  },

  deleteTasting: async (id) => {
    const snap = await getDoc(doc(db, 'tastings', id))
    const tasting = snap.exists() ? snap.data() : null
    const tpSnap = await getDocs(C.timepoints(id))
    const wb = writeBatch(db)
    tpSnap.docs.forEach(d => wb.delete(d.ref))
    if (tasting?.cube_id) wb.update(doc(db, 'batch_cubes', tasting.cube_id), { status: 'frozen', tasting_id: null })
    wb.delete(doc(db, 'tastings', id))
    await wb.commit()
    return { ok: true }
  },

  // ── Ingredients Catalog ────────────────────────────────────────────────────

  getCatalog: async () => {
    const snap = await getDocs(query(C.catalog(), orderBy('name')))
    return rows(snap)
  },

  createCatalogItem: async (data) => {
    const { name, unit, brand, vendor, qty_purchased, purchase_price, notes } = data
    const cost_per_unit = (purchase_price != null && qty_purchased > 0) ? purchase_price / qty_purchased : null
    const ref = doc(C.catalog())
    const itemData = { name, unit, brand: brand ?? null, vendor: vendor ?? null, qty_purchased: qty_purchased ?? null, purchase_price: purchase_price ?? null, cost_per_unit, notes: notes ?? null, created_at: now() }
    await setDoc(ref, itemData)
    return { id: ref.id, ...itemData }
  },

  updateCatalogItem: async (id, data) => {
    const { name, unit, brand, vendor, qty_purchased, purchase_price, notes } = data
    const cost_per_unit = (purchase_price != null && qty_purchased > 0) ? purchase_price / qty_purchased : null
    await updateDoc(doc(db, 'ingredients_catalog', id), { name, unit, brand: brand ?? null, vendor: vendor ?? null, qty_purchased: qty_purchased ?? null, purchase_price: purchase_price ?? null, cost_per_unit, notes: notes ?? null })
    return row(await getDoc(doc(db, 'ingredients_catalog', id)))
  },

  deleteCatalogItem: async (id) => {
    await deleteDoc(doc(db, 'ingredients_catalog', id))
    return { ok: true }
  },

  // ── Testers ────────────────────────────────────────────────────────────────

  getTesters: async () => {
    const [testersSnap, tastingsSnap] = await Promise.all([getDocs(C.testers()), getDocs(C.tastings())])
    const tastings = rows(tastingsSnap)
    return rows(testersSnap)
      .sort((a, b) => `${a.last_name}${a.first_name}`.localeCompare(`${b.last_name}${b.first_name}`))
      .map(t => {
        const name = `${t.first_name} ${t.last_name}`
        const mine = tastings.filter(x => x.taster === name)
        const scores = mine.map(x => x.overall_score).filter(s => s != null)
        return { ...t, tasting_count: mine.length, avg_score: scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null }
      })
  },

  createTester: async (data) => {
    const ref = doc(C.testers())
    const testerData = { ...data, created_at: now() }
    await setDoc(ref, testerData)
    return { id: ref.id, ...testerData, tasting_count: 0, avg_score: null }
  },

  updateTester: async (id, data) => {
    await updateDoc(doc(db, 'testers', id), data)
    const [snap, tastingsSnap] = await Promise.all([getDoc(doc(db, 'testers', id)), getDocs(C.tastings())])
    const tester = row(snap)
    const name = `${tester.first_name} ${tester.last_name}`
    const mine = rows(tastingsSnap).filter(t => t.taster === name)
    const scores = mine.map(t => t.overall_score).filter(s => s != null)
    return { ...tester, tasting_count: mine.length, avg_score: scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null }
  },

  deleteTester: async (id) => {
    await deleteDoc(doc(db, 'testers', id))
    return { ok: true }
  },

  // ── Molds ──────────────────────────────────────────────────────────────────

  getMolds: async () => {
    const snap = await getDocs(query(C.molds(), orderBy('created_at', 'desc')))
    return rows(snap)
  },

  createMold: async (data) => {
    const { shape, volume_fl_oz, sections, notes } = data
    const existingSnap = await getDocs(query(C.molds(), where('shape', '==', shape), where('volume_fl_oz', '==', Number(volume_fl_oz)), where('sections', '==', Number(sections))))
    const mold_number = existingSnap.size + 1
    const ref = doc(C.molds())
    const moldData = { shape, volume_fl_oz: Number(volume_fl_oz), sections: Number(sections), mold_number, notes: notes ?? null, created_at: now() }
    await setDoc(ref, moldData)
    return { id: ref.id, ...moldData }
  },

  updateMold: async (id, data) => {
    const { shape, volume_fl_oz, sections, notes } = data
    await updateDoc(doc(db, 'molds', id), { shape, volume_fl_oz: Number(volume_fl_oz), sections: Number(sections), notes: notes ?? null })
    return row(await getDoc(doc(db, 'molds', id)))
  },

  deleteMold: async (id) => {
    await deleteDoc(doc(db, 'molds', id))
    return { ok: true }
  },

  getMoldCubes: async (moldId) => {
    const snap = await getDocs(query(C.batchCubes(), where('mold_id', '==', moldId), orderBy('section_number')))
    const cubes = rows(snap)
    const tastingIds = [...new Set(cubes.filter(c => c.tasting_id).map(c => c.tasting_id))]
    const tastings = {}
    await Promise.all(tastingIds.map(async tid => {
      const s = await getDoc(doc(db, 'tastings', tid))
      if (s.exists()) tastings[tid] = s.data()
    }))
    return cubes.map(c => ({ ...c, tasting_date: tastings[c.tasting_id]?.date ?? null, taster: tastings[c.tasting_id]?.taster ?? null }))
  },

  fillMold: async (moldId, data) => {
    const { batch_id, freeze_test_id } = data
    const ts = now()
    const [moldSnap, batchSnap] = await Promise.all([getDoc(doc(db, 'molds', moldId)), getDoc(doc(db, 'batches', batch_id))])
    if (!moldSnap.exists()) throw new Error('Mold not found')
    const mold = moldSnap.data()
    const batch = batchSnap.exists() ? batchSnap.data() : {}
    const existingSnap = await getDocs(query(C.batchCubes(), where('mold_id', '==', moldId), where('batch_id', '==', batch_id), where('status', '==', 'frozen')))
    const wb = writeBatch(db)
    existingSnap.docs.forEach(d => wb.delete(d.ref))
    const cubes = []
    for (let s = 1; s <= Number(mold.sections); s++) {
      const ref = doc(C.batchCubes())
      const cubeData = { mold_id: moldId, batch_id, freeze_test_id: freeze_test_id ?? null, section_number: s, status: 'frozen', tasting_id: null, batch_label: batch.batch_id ?? null, sku: batch.sku ?? null, created_at: ts }
      wb.set(ref, cubeData)
      cubes.push({ id: ref.id, ...cubeData })
    }
    await wb.commit()
    return cubes
  },

  updateCube: async (cubeId, data) => {
    const { status, tasting_id } = data
    await updateDoc(doc(db, 'batch_cubes', cubeId), { status, tasting_id: tasting_id ?? null })
    return row(await getDoc(doc(db, 'batch_cubes', cubeId)))
  },
}
