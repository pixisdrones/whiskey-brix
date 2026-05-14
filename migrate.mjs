// One-time migration: run with `node migrate.mjs`
// Safe to run multiple times — checks for BLM-AZ-001 before writing
import { initializeApp } from 'firebase/app'
import {
  getFirestore, collection, doc, getDocs, getDoc, setDoc, updateDoc,
  query, where, writeBatch
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

const C = {
  recipes:     () => collection(db, 'recipes'),
  ingredients: (rid) => collection(db, 'recipes', rid, 'ingredients'),
}
const rows = snap => snap.docs.map(d => ({ id: d.id, ...d.data() }))
const now  = () => new Date().toISOString()

async function migrate() {
  console.log('[migrate] checking for BLM-AZ-001...')
  const check = await getDocs(query(C.recipes(), where('sku', '==', 'BLM-AZ-001')))
  if (check.size > 0) { console.log('[migrate] already migrated, skipping'); process.exit(0) }

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
  process.exit(0)
}

migrate().catch(e => { console.error('[migrate] FAILED:', e); process.exit(1) })
