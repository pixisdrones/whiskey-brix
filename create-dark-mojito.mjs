// Create BLM-DM-001 Dark Mojito recipe with ingredients
// Run with: node create-dark-mojito.mjs
import { initializeApp } from 'firebase/app'
import { getFirestore, collection, doc, setDoc, addDoc } from 'firebase/firestore'

const app = initializeApp({
  apiKey: "AIzaSyAAK6kSWq_7AWXOOvHyOSrN9lzhCVXLDKI",
  authDomain: "whiskey-brix.firebaseapp.com",
  projectId: "whiskey-brix",
  storageBucket: "whiskey-brix.firebasestorage.app",
  messagingSenderId: "1005067574676",
  appId: "1:1005067574676:web:bea75027c55d48f9680381"
})
const db = getFirestore(app)

const now = () => new Date().toISOString()

const recipe = {
  sku:           'BLM-DM-001',
  expression:    'Dark Mojito',
  version:       '1.0',
  status:        'experimental',
  spirit_pairing: 'Dark Rum or Bourbon',
  brix_min:      18,
  brix_max:      20,
  ph_min:        2.8,
  ph_max:        3.2,
  melt_min:      8,
  melt_max:      12,
  parent_id:     null,
  notes:         'Uses cold-steep mint infusion to preserve bright menthol character without bitter chlorophyll. Demerara syrup (not white sugar) is required — the molasses content bridges lime-citrus to dark spirits. Pairs with aged dark rum (Gosling\'s Black Seal, Appleton Estate 8yr, Mount Gay XO) or bonded bourbon.',
  recipe_body: `<ol><li>Cold-steep the mint: combine 1 oz (28g) fresh mint leaves with 2 cups cold filtered water. Do not bruise or tear the leaves — cold steeping extracts clean menthol character and avoids the bitter chlorophyll notes that hot water produces. Steep 2–3 hours in the refrigerator. Strain through fine mesh without pressing; infusion should be pale green-gold with an intense fresh mint aroma. If the infusion smells vegetal rather than minty, the leaves were too mature or the steep too long — discard and restart with younger leaves, 90-minute steep.</li><li>Make demerara 2:1 simple syrup if not pre-made: combine 2 parts demerara sugar by weight with 1 part hot water, stir until fully dissolved. Do not substitute white sugar — the molasses content in demerara is what bridges citrus to dark spirit on melt. Cool completely before use. Correct syrup is deep amber; pale gold means wrong sugar was used.</li><li>Combine lime juice and demerara syrup. Whisk until uniform. The base will be intensely sweet and tart at this stage — that is correct. Taste: lime should dominate, demerara sweetness behind it, faint caramel on the finish. No water added yet.</li><li>Add cold mint infusion. Stir gently. Blend should be pale gold with mint lifting clearly over citrus in the nose. If mint aroma is weak, the cold steep was insufficient — note for next batch. Do not add extra mint now; over-minting at this stage will make the cube taste toothpaste-like at melt.</li><li>Add filtered water in stages. Start with ½ cup, stir, measure Brix. Continue adding in 2 oz increments toward target. The base without final dilution water will run approximately 28–35 °Bx depending on lime ripeness and syrup concentration — significant water addition is normal and expected.</li><li>Taste for balance: lime leads, mint follows as a clean herbal note, demerara closes with a light caramel warmth. No single element should dominate. If the blend reads flat, the mint infusion was too dilute — note adjustment for next batch.</li><li>Validate Brix: target 18–20 °Bx. Validate pH: target 2.8–3.2. If Brix reads high, add filtered water in 1 oz increments and retest. Do not proceed outside 17–21 °Bx.</li><li>Fill mold cavities to ~100g (3.5 oz). Tap 3–4 times to release air. Cover with plastic wrap. Freeze at 0–10°F for 12 hours minimum.</li><li>Unmold using cold water over mold base for 5 seconds. Melt validation: pour 2 oz dark rum (Gosling's Black Seal, Appleton Estate, or Mount Gay) or bonded bourbon — lime and mint should bloom immediately. Demerara caramel note emerges at 3–5 min and bridges citrus to spirit. Full expression at 8–12 min.</li></ol>`,
  created_at: now(),
}

// Catalog IDs (verified from ingredients_catalog collection)
const CATALOG = {
  mint_leaves:   'eCjP2pc7BdIPWNLwf3vK', // Fresh mint leaves (for infusion)
  filtered_water: 'PDaZJnAIBleeZHF8xIuz', // Filtered water
  lime_juice:    'fqHtIohU8C1mChp6XWXu', // Fresh lime juice
}

const ingredients = [
  { sort_order: 0, name: 'Fresh mint leaves (cold infusion)',     catalog_id: CATALOG.mint_leaves,    amount: 1,    unit: 'oz',  brand: null },
  { sort_order: 1, name: 'Filtered water (cold steep base)',      catalog_id: CATALOG.filtered_water, amount: 2,    unit: 'cup', brand: null },
  { sort_order: 2, name: 'Fresh lime juice',                      catalog_id: CATALOG.lime_juice,     amount: 5,    unit: 'oz',  brand: null },
  { sort_order: 3, name: 'Demerara 2:1 simple syrup',            catalog_id: null,                   amount: 10,   unit: 'oz',  brand: null },
  { sort_order: 4, name: 'Filtered water (dilution)',             catalog_id: CATALOG.filtered_water, amount: 4,    unit: 'oz',  brand: null },
]

async function create() {
  const ref = doc(collection(db, 'recipes'))
  await setDoc(ref, recipe)
  console.log(`[create] recipe created: ${ref.id}`)

  for (const ing of ingredients) {
    await addDoc(collection(db, 'recipes', ref.id, 'ingredients'), ing)
    console.log(`[create]   ingredient: ${ing.name}`)
  }

  console.log('[create] done — BLM-DM-001 Dark Mojito created')
  process.exit(0)
}

create().catch(e => { console.error('[create] FAILED:', e); process.exit(1) })
