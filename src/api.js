import {
  collection, collectionGroup, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc,
  query, where, orderBy, writeBatch
} from 'firebase/firestore'
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from './firebase.js'

// ── Helpers ────────────────────────────────────────────────────────────────────────────

const C = {
  recipes:       ()    => collection(db, 'recipes'),
  ingredients:   (rid) => collection(db, 'recipes', rid, 'ingredients'),
  batches:       ()    => collection(db, 'batches'),
  freezeTests:   ()    => collection(db, 'freeze_tests'),
  tastings:      ()    => collection(db, 'tastings'),
  timepoints:    (tid) => collection(db, 'tastings', tid, 'timepoints'),
  molds:         ()    => collection(db, 'molds'),
  batchCubes:    ()    => collection(db, 'batch_cubes'),
  testers:       ()    => collection(db, 'testers'),
  catalog:       ()    => collection(db, 'ingredients_catalog'),
  bottleTypes:   ()    => collection(db, 'bottle_types'),
  bottleReceipts:()    => collection(db, 'bottle_receipts'),
  bottles:       ()    => collection(db, 'bottles'),
  volumeStorage: ()    => collection(db, 'volume_storage'),
  capTypes:      ()    => collection(db, 'cap_types'),
  capReceipts:   ()    => collection(db, 'cap_receipts'),
}

const row  = snap => ({ id: snap.id, ...snap.data() })
const rows = snap => snap.docs.map(row)
const now  = ()   => new Date().toISOString()
const uid  = ()   => crypto.randomUUID()

const SHAPE_CODES = { Sphere: 'SP', Cube: 'CU', 'Collins Spear': 'CS', Cylinder: 'CY', Other: 'OT' }

// ── Seed default recipes on first load ───────────────────────────────────────────────

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

// ── API ─────────────────────────────────────────────────────────────────────────────────

export const api = {

  // ── Dashboard ──────────────────────────────────────────────────────────────

  getDashboard: async () => {
    const [recipesSnap, batchesSnap, freezeSnap, tastingsSnap, cubesSnap, bottlesSnap] = await Promise.all([
      getDocs(C.recipes()),
      getDocs(query(C.batches(), orderBy('created_at', 'desc'))),
      getDocs(C.freezeTests()),
      getDocs(C.tastings()),
      getDocs(C.batchCubes()),
      getDocs(C.bottles()),
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

    const cubes   = rows(cubesSnap)
    const bottles = rows(bottlesSnap)

    return {
      totalRecipes:    recipes.length,
      totalBatches:    batches.length,
      brixMisses,
      totalFreezeTests: freezeSnap.size,
      avgScore,
      cubesCreated:   cubes.length,
      cubesTasted:    tastings.length,
      cubesRemoved:   cubes.filter(c => c.status === 'removed').length,
      cubesAvailable:  cubes.filter(c => c.status === 'frozen' && !c.tasting_id).length,
      bottlesFilled:   bottles.length,
      bottlesInStock:  bottles.filter(b => b.status === 'in_stock').length,
      qaTargets: recipes.map(r => {
        const recipeBatches = batches.filter(b => b.recipe_id === r.id)
        const batchIds = new Set(recipeBatches.map(b => b.id))
        const recipeCubes = cubes.filter(c => batchIds.has(c.batch_id))
        const lastBatchDate = recipeBatches.map(b => b.date).filter(Boolean).sort().reverse()[0] ?? null
        return {
          ...r,
          batch_count: recipeBatches.length,
          last_batch_date: lastBatchDate,
          cubes_available: recipeCubes.filter(c => c.status === 'frozen' && !c.tasting_id).length,
        }
      }),
      recentBatches: batches.slice(0, 20),
      brixDist:      batches.filter(b => b.observed_brix != null).slice(0, 50).map(b => ({
        observed_brix: b.observed_brix, brix_min: b.brix_min, brix_max: b.brix_max, expression: b.expression
      })),
    }
  },

  // ── Recipes ──────────────────────────────────────────────────────────────────

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

  getAllIngredients: async () => {
    const snap = await getDocs(collectionGroup(db, 'ingredients'))
    return snap.docs.map(d => ({ id: d.id, recipe_id: d.ref.parent.parent.id, ...d.data() }))
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
    const wb = writeBatch(db)
    wb.delete(doc(db, 'batches', id))
    const [ftSnap, cubesSnap] = await Promise.all([
      getDocs(query(collection(db, 'freeze_tests'), where('batch_id', '==', id))),
      getDocs(query(collection(db, 'batch_cubes'), where('batch_id', '==', id))),
    ])
    ftSnap.docs.forEach(d => wb.delete(d.ref))
    cubesSnap.docs.forEach(d => wb.delete(d.ref))
    await wb.commit()
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

  getMixSessionList: async (items) => {
    const results = await Promise.all(
      items.map(async ({ recipe_id, batches }) => {
        const [recipeSnap, ingSnap] = await Promise.all([
          getDoc(doc(db, 'recipes', recipe_id)),
          getDocs(query(C.ingredients(recipe_id), orderBy('sort_order'))),
        ])
        const recipe = recipeSnap.exists() ? recipeSnap.data() : {}
        return { recipe_id, expression: recipe.expression ?? null, sku: recipe.sku ?? null, batches, ingredients: rows(ingSnap) }
      })
    )
    const totals = {}
    results.forEach(({ expression, batches, ingredients }) => {
      ingredients.forEach(ing => {
        const key = `${ing.name}__${ing.unit}`
        if (!totals[key]) totals[key] = { name: ing.name, unit: ing.unit, amount: 0, recipes: [] }
        totals[key].amount = Math.round((totals[key].amount + (ing.amount ?? 0) * batches) * 1000) / 1000
        if (expression && !totals[key].recipes.includes(expression)) totals[key].recipes.push(expression)
      })
    })
    return { items: results, aggregated: Object.values(totals).sort((a, b) => a.name.localeCompare(b.name)) }
  },

  // ── Freeze Tests ─────────────────────────────────────────────────────────────

  getFreezeTests: async () => {
    const snap = await getDocs(query(C.freezeTests(), orderBy('created_at', 'desc')))
    return rows(snap)
  },

  createFreezeTest: async (data) => {
    const { batch_id, mold_id, freezer_in_time, freezer_out_time, qty_cubes, section_batches, ...rest } = data
    const ts = now()
    const allBatchIds = [...new Set([batch_id, ...Object.values(section_batches ?? {})])]
    const [moldSnap, ...batchSnaps] = await Promise.all([
      mold_id ? getDoc(doc(db, 'molds', mold_id)) : Promise.resolve(null),
      ...allBatchIds.map(bid => getDoc(doc(db, 'batches', bid))),
    ])
    const mold = moldSnap?.exists() ? moldSnap.data() : null
    const batchMap = Object.fromEntries(allBatchIds.map((bid, i) => [bid, batchSnaps[i].exists() ? batchSnaps[i].data() : {}]))
    const batch = batchMap[batch_id] ?? {}

    let freeze_time = null
    if (freezer_in_time && freezer_out_time) {
      const diff = new Date(freezer_out_time) - new Date(freezer_in_time)
      if (diff > 0) freeze_time = Math.round(diff / 60000)
    }

    const ref = doc(C.freezeTests())
    const ftData = { ...rest, batch_id, mold_id: mold_id ?? null, section_batches: section_batches ?? null, freezer_in_time: freezer_in_time ?? null, freezer_out_time: freezer_out_time ?? null, qty_cubes: qty_cubes ?? null, freeze_time, batch_label: batch.batch_id ?? null, recipe_id: batch.recipe_id ?? null, sku: batch.sku ?? null, expression: batch.expression ?? null, melt_min: batch.melt_min ?? null, melt_max: batch.melt_max ?? null, mold_shape: mold?.shape ?? null, mold_volume: mold?.volume_fl_oz ?? null, mold_sections: mold?.sections ?? null, created_at: ts }

    const wb = writeBatch(db)
    wb.set(ref, ftData)
    const numCubes = qty_cubes != null ? qty_cubes : (mold_id && mold ? Number(mold.sections) : 0)
    for (let s = 1; s <= numCubes; s++) {
      const cubeBatchId = section_batches?.[String(s)] ?? batch_id
      const cubeBatch = batchMap[cubeBatchId] ?? batch
      wb.set(doc(C.batchCubes()), { mold_id: mold_id ?? null, batch_id: cubeBatchId, freeze_test_id: ref.id, section_number: s, status: 'frozen', tasting_id: null, batch_label: cubeBatch.batch_id ?? null, sku: cubeBatch.sku ?? null, expression: cubeBatch.expression ?? null, created_at: ts })
    }
    await wb.commit()
    return { id: ref.id, ...ftData }
  },

  updateFreezeTest: async (id, data) => {
    const { batch_id, mold_id, freezer_in_time, freezer_out_time, section_batches, ...rest } = data
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
    await updateDoc(doc(db, 'freeze_tests', id), { ...rest, batch_id, mold_id: mold_id ?? null, section_batches: section_batches ?? null, freezer_in_time: freezer_in_time ?? null, freezer_out_time: freezer_out_time ?? null, freeze_time, batch_label: batch.batch_id ?? null, recipe_id: batch.recipe_id ?? null, sku: batch.sku ?? null, expression: batch.expression ?? null, melt_min: batch.melt_min ?? null, melt_max: batch.melt_max ?? null, mold_shape: mold?.shape ?? null, mold_volume: mold?.volume_fl_oz ?? null, mold_sections: mold?.sections ?? null })
    return row(await getDoc(doc(db, 'freeze_tests', id)))
  },

  deleteFreezeTest: async (id) => {
    const ftSnap = await getDoc(doc(db, 'freeze_tests', id))
    const wb = writeBatch(db)
    wb.delete(doc(db, 'freeze_tests', id))
    if (ftSnap.exists()) {
      const cubesSnap = await getDocs(query(collection(db, 'batch_cubes'), where('freeze_test_id', '==', id)))
      cubesSnap.docs.forEach(d => wb.delete(d.ref))
    }
    await wb.commit()
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
    const [batchSnap, existingSnap, existingTpSnap] = await Promise.all([
      getDoc(doc(db, 'batches', batch_id)),
      getDoc(doc(db, 'tastings', id)),
      getDocs(C.timepoints(id)),
    ])
    const batch = batchSnap.exists() ? batchSnap.data() : {}
    const oldCubeId = existingSnap.exists() ? (existingSnap.data().cube_id ?? null) : null
    let cubeData = null, mold = null
    if (cube_id) {
      const cubeSnap = await getDoc(doc(db, 'batch_cubes', cube_id))
      cubeData = cubeSnap.exists() ? cubeSnap.data() : null
      if (cubeData?.mold_id) {
        const moldSnap = await getDoc(doc(db, 'molds', cubeData.mold_id))
        mold = moldSnap.exists() ? moldSnap.data() : null
      }
    }
    const wb = writeBatch(db)
    wb.update(doc(db, 'tastings', id), { ...rest, batch_id, cube_id: cube_id ?? null, batch_label: batch.batch_id ?? null, recipe_id: batch.recipe_id ?? null, sku: batch.sku ?? null, expression: batch.expression ?? null, mold_id: cubeData?.mold_id ?? null, section_number: cubeData?.section_number ?? null, mold_shape: mold?.shape ?? null, mold_volume: mold?.volume_fl_oz ?? null })
    existingTpSnap.docs.forEach(d => wb.delete(d.ref))
    if (Array.isArray(timepoints)) {
      timepoints.forEach(tp => wb.set(doc(C.timepoints(id)), { ...tp, flavor_descriptors: tp.flavor_descriptors ?? [] }))
    }
    if (oldCubeId && oldCubeId !== cube_id) {
      wb.update(doc(db, 'batch_cubes', oldCubeId), { status: 'frozen', tasting_id: null })
    }
    if (cube_id) {
      wb.update(doc(db, 'batch_cubes', cube_id), { status: 'tasted', tasting_id: id })
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

  // ── Ingredients Catalog ──────────────────────────────────────────────────────────

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

  getFreezeCubes: async (freeze_test_id) => {
    const [cubesSnap, tastingsSnap] = await Promise.all([
      getDocs(query(C.batchCubes(), where('freeze_test_id', '==', freeze_test_id))),
      getDocs(query(C.tastings(), where('freeze_test_id', '==', freeze_test_id))),
    ])
    const cubes = rows(cubesSnap).sort((a, b) => (a.section_number ?? 0) - (b.section_number ?? 0))
    const tastedCubeIds = new Set(tastingsSnap.docs.map(d => d.data().cube_id).filter(Boolean))
    return cubes.map(c => {
      if (c.status === 'removed') return c
      if (c.status === 'tasted' || c.tasting_id || tastedCubeIds.has(c.id)) return { ...c, status: 'tasted' }
      return c
    })
  },

  removeCube: async (cube_id) => {
    await updateDoc(doc(db, 'batch_cubes', cube_id), { status: 'removed' })
    return { ok: true }
  },

  getFreezerInventory: async () => {
    const [cubesSnap, freezeSnap, moldsSnap, recipesSnap] = await Promise.all([
      getDocs(C.batchCubes()),
      getDocs(C.freezeTests()),
      getDocs(C.molds()),
      getDocs(C.recipes()),
    ])
    const ftMap     = Object.fromEntries(rows(freezeSnap).map(ft => [ft.id, ft]))
    const moldMap   = Object.fromEntries(rows(moldsSnap).map(m  => [m.id,  m]))
    const skuToExpr = Object.fromEntries(rows(recipesSnap).map(r => [r.sku, r.expression]))
    const grouped = {}
    rows(cubesSnap).forEach(c => {
      const key = c.freeze_test_id
      if (!key) return
      if (!grouped[key]) {
        const ft   = ftMap[key] ?? {}
        const mold = ft.mold_id ? (moldMap[ft.mold_id] ?? null) : null
        grouped[key] = {
          ...ft, id: key, cubes: [],
          mold_sections: mold?.sections ?? ft.qty_cubes ?? null,
          mold_shape:    mold?.shape    ?? null,
          mold_volume:   mold?.volume_fl_oz ?? ft.volume_fl_oz ?? null,
        }
      }
      grouped[key].cubes.push({
        ...c,
        expression: c.sku ? (skuToExpr[c.sku] ?? null) : null,
      })
    })
    return Object.values(grouped)
      .filter(g => g.cubes.some(c => c.status === 'frozen'))
      .sort((a, b) => (a.date ?? '') < (b.date ?? '') ? -1 : 1)
  },

  uploadPhasePhoto: async (file) => {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const path = `phase_photos/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
    const ref = storageRef(storage, path)
    await uploadBytes(ref, file)
    return await getDownloadURL(ref)
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

  // ── Bottle Types ──────────────────────────────────────────────────────────────

  getBottleTypes: async () => {
    const snap = await getDocs(query(C.bottleTypes(), orderBy('created_at')))
    return rows(snap)
  },

  createBottleType: async (data) => {
    const ref = doc(C.bottleTypes())
    await setDoc(ref, { ...data, created_at: now() })
    return row(await getDoc(ref))
  },

  updateBottleType: async (id, data) => {
    await updateDoc(doc(db, 'bottle_types', id), data)
    return row(await getDoc(doc(db, 'bottle_types', id)))
  },

  deleteBottleType: async (id) => {
    await deleteDoc(doc(db, 'bottle_types', id))
    return { ok: true }
  },

  // ── Empty Bottle Stock ──────────────────────────────────────────────────────────

  receiveBottles: async (data) => {
    const ref = doc(C.bottleReceipts())
    await setDoc(ref, { ...data, created_at: now() })
    return row(await getDoc(ref))
  },

  getBottleStock: async () => {
    const [typesSnap, receiptsSnap, bottlesSnap] = await Promise.all([
      getDocs(query(C.bottleTypes(), orderBy('created_at'))),
      getDocs(C.bottleReceipts()),
      getDocs(C.bottles()),
    ])
    const receipts = rows(receiptsSnap)
    const filled   = rows(bottlesSnap)
    return rows(typesSnap).map(type => {
      const qty_received = receipts
        .filter(r => r.bottle_type_id === type.id)
        .reduce((s, r) => s + (Number(r.qty) || 0), 0)
      const qty_filled = filled.filter(b => b.bottle_type_id === type.id).length
      return { ...type, qty_received, qty_filled, qty_empty: qty_received - qty_filled }
    })
  },

  // ── Filled Bottles ──────────────────────────────────────────────────────────

  fillBottles: async (data) => {
    const { batch_id, bottle_type_id, qty, date_filled, lot_number, notes } = data
    const [batchSnap] = await Promise.all([getDoc(doc(db, 'batches', batch_id))])
    const batch = batchSnap.exists() ? batchSnap.data() : {}
    const ts = now()
    const wb = writeBatch(db)
    const created = []
    for (let n = 1; n <= Number(qty); n++) {
      const ref = doc(C.bottles())
      const bottle = {
        bottle_type_id,
        batch_id,
        sku:           batch.sku        ?? null,
        expression:    batch.expression ?? null,
        batch_label:   batch.batch_id   ?? null,
        lot_number:    lot_number || batch.batch_id || null,
        bottle_number: n,
        date_filled:   date_filled || null,
        status:        'in_stock',
        status_date:   null,
        notes:         notes || null,
        created_at:    ts,
      }
      wb.set(ref, bottle)
      created.push({ id: ref.id, ...bottle })
    }
    await wb.commit()
    return created
  },

  getFilledBottles: async () => {
    const snap = await getDocs(query(C.bottles(), orderBy('created_at', 'desc')))
    return rows(snap)
  },

  getBottlesByBatch: async (batch_id) => {
    const snap = await getDocs(query(C.bottles(), where('batch_id', '==', batch_id)))
    return rows(snap).sort((a, b) => (a.bottle_number ?? 0) - (b.bottle_number ?? 0))
  },

  updateBottleStatus: async (id, status) => {
    await updateDoc(doc(db, 'bottles', id), { status, status_date: now() })
    return { ok: true }
  },

  // ── Volume Storage ──────────────────────────────────────────────────────────

  getVolumeStorage: async () => {
    const snap = await getDocs(query(C.volumeStorage(), orderBy('created_at', 'desc')))
    return rows(snap)
  },

  createVolumeStorage: async (data) => {
    const ref = doc(C.volumeStorage())
    await setDoc(ref, { ...data, created_at: now() })
    return row(await getDoc(ref))
  },

  updateVolumeStorage: async (id, data) => {
    await updateDoc(doc(db, 'volume_storage', id), data)
    return { ok: true }
  },

  deleteVolumeStorage: async (id) => {
    await deleteDoc(doc(db, 'volume_storage', id))
    return { ok: true }
  },

  // ── Cap Types ──────────────────────────────────────────────────────────────

  getCapStock: async () => {
    const [typesSnap, receiptsSnap] = await Promise.all([
      getDocs(query(C.capTypes(), orderBy('created_at'))),
      getDocs(C.capReceipts()),
    ])
    const receipts = rows(receiptsSnap)
    return rows(typesSnap).map(type => {
      const mine = receipts.filter(r => r.cap_type_id === type.id)
      const qty_received = mine.reduce((s, r) => s + (Number(r.qty) || 0), 0)
      const total_cost   = mine.reduce((s, r) => s + (r.qty && r.cost_per_unit ? Number(r.qty) * Number(r.cost_per_unit) : 0), 0)
      return { ...type, qty_received, total_cost }
    })
  },

  createCapType: async (data) => {
    const ref = doc(C.capTypes())
    await setDoc(ref, { ...data, created_at: now() })
    return row(await getDoc(ref))
  },

  updateCapType: async (id, data) => {
    await updateDoc(doc(db, 'cap_types', id), data)
    return row(await getDoc(doc(db, 'cap_types', id)))
  },

  deleteCapType: async (id) => {
    await deleteDoc(doc(db, 'cap_types', id))
    return { ok: true }
  },

  receiveCaps: async (data) => {
    const ref = doc(C.capReceipts())
    await setDoc(ref, { ...data, created_at: now() })
    return row(await getDoc(ref))
  },
}
