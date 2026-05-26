// Create BLM-SB-001 Summer Berry recipe with ingredients
// Run with: node create-summer-berry.mjs
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

// Catalog IDs verified from ingredients_catalog
const CATALOG = {
  lemon_juice:    'AyrSBzDzALSGFIvWyTuw', // Fresh lemon juice, strained
  simple_2to1:   'cwT2IQBPcKRUZIUlG0w4', // Simple syrup 2:1
  filtered_water: 'PDaZJnAIBleeZHF8xIuz', // Filtered water
}

const recipe = {
  sku:            'BLM-SB-001',
  expression:     'Summer Berry',
  version:        '1.0',
  status:         'experimental',
  spirit_pairing: 'Bourbon or Rye Whiskey',
  brix_min:       18,
  brix_max:       20,
  ph_min:         3.0,
  ph_max:         3.4,
  melt_min:       8,
  melt_max:       12,
  parent_id:      null,
  notes:          'Warm maceration (130–140°F) releases maximum juice from blackberries and raspberries without cooking them into jam. Lemon juice is a brightener only — keep it at 2 oz; more will push the profile citrus-forward and mute the berry. Brix varies with berry ripeness; riper berries may require reducing simple syrup by 1–2 oz to stay in range.',
  recipe_body: `<ol><li>Combine blackberries and raspberries in a non-reactive saucepan. Warm over very low heat — target 130–140°F, well below a simmer. The goal is juice release, not cooking. Stir gently every 2–3 minutes. Berries will begin breaking down and releasing juice within 8–10 minutes; the mixture should smell like fresh berry compote, not jam. If it starts to smell cooked or syrupy, remove from heat immediately — the volatile fruit aromatics that define this SKU's melt character are the first thing to go.</li><li>Remove from heat. Press the mixture through a fine-mesh strainer using the back of a spoon. Extract maximum juice without forcing seeds or skin fragments through — seeds add bitterness and skin solids cloud the blend. Discard solids. Target yield: 12–14 oz strained juice. Color should be a deep, saturated magenta-purple. Pale or pink juice indicates underripe berries or insufficient quantity — do not proceed; the melt color and aroma will be weak.</li><li>Cool berry juice to room temperature before proceeding. Do not refrigerate to speed this up — rapid chilling locks aromatic volatiles in the liquid before they reach equilibrium, which produces a flat melt character.</li><li>Add fresh lemon juice and 2:1 simple syrup to the cooled berry juice. Whisk until fully uniform. Taste: intensely fruity and tart, with lemon brightening the midpalate. The syrup should round the tartness without masking the berry character. If the blend tastes flat or one-dimensional at this stage, the berry maceration was too brief or the berries underripe — note for next batch.</li><li>Add filtered water in stages. Start with ½ cup, stir, measure Brix. The berry-syrup base will run approximately 25–30 °Bx without dilution — water addition is significant and expected. Continue adding in 2 oz increments until Brix falls in range. Note: riper berries will run higher Brix; adjust water accordingly rather than reducing syrup mid-batch.</li><li>Validate Brix: target 18–20 °Bx. Validate pH: target 3.0–3.4. Berry pH varies more than citrus — if below 3.0, add filtered water in 1 oz increments and retest. If pH is naturally above 3.4 (very sweet, low-acid berries), add lemon juice in ½ tsp increments. Do not proceed outside 17–21 °Bx.</li><li>Fill mold cavities to ~100g (3.5 oz). Tap 3–4 times to release air. Cover with plastic wrap. Freeze at 0–10°F for 12 hours minimum.</li><li>Unmold using cold water over mold base for 5 seconds. Melt validation: pour 2 oz bourbon or rye whiskey — berry aroma should bloom immediately and the color bloom in the glass is the most visually dramatic in the portfolio after Cranberry Hibiscus. Tart-fruity character integrates with vanilla-caramel (bourbon) or pepper-spice (rye) at 3–5 min. Full expression at 8–12 min.</li></ol>`,
  created_at: now(),
}

const ingredients = [
  { sort_order: 0, name: 'Fresh blackberries',        catalog_id: null,                   amount: 12,  unit: 'oz',  brand: null },
  { sort_order: 1, name: 'Fresh raspberries',          catalog_id: null,                   amount: 8,   unit: 'oz',  brand: null },
  { sort_order: 2, name: 'Fresh lemon juice, strained',catalog_id: CATALOG.lemon_juice,   amount: 2,   unit: 'oz',  brand: null },
  { sort_order: 3, name: 'Simple syrup 2:1',           catalog_id: CATALOG.simple_2to1,   amount: 8,   unit: 'oz',  brand: null },
  { sort_order: 4, name: 'Filtered water',             catalog_id: CATALOG.filtered_water, amount: 4,  unit: 'oz',  brand: null },
]

async function create() {
  const ref = doc(collection(db, 'recipes'))
  await setDoc(ref, recipe)
  console.log(`[create] recipe created: ${ref.id}`)
  for (const ing of ingredients) {
    await addDoc(collection(db, 'recipes', ref.id, 'ingredients'), ing)
    console.log(`[create]   ingredient: ${ing.name}`)
  }
  console.log('[create] done — BLM-SB-001 Summer Berry created')
  process.exit(0)
}

create().catch(e => { console.error('[create] FAILED:', e); process.exit(1) })
