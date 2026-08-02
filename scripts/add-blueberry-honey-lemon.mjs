import { initializeApp } from 'firebase/app'
import { getFirestore, collection, doc, writeBatch } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyAAK6kSWq_7AWXOOvHyOSrN9lzhCVXLDKI",
  authDomain: "whiskey-brix.firebaseapp.com",
  projectId: "whiskey-brix",
  storageBucket: "whiskey-brix.firebasestorage.app",
  messagingSenderId: "1005067574676",
  appId: "1:1005067574676:web:bea75027c55d48f9680381"
}

const app  = initializeApp(firebaseConfig)
const db   = getFirestore(app)
const now  = () => new Date().toISOString()

// ── Scaled to 17 fl oz blueberry juice baseline (scale factor 17/12 = 1.4167) ──

const recipe = {
  sku:            'BLM-BHL-001',
  expression:     'Blueberry Honey Lemon',
  version:        '1.0',
  status:         'active',
  spirit_pairing: 'Bourbon',
  brix_min:       23,
  brix_max:       24,
  ph_min:         2.6,
  ph_max:         3.0,
  melt_min:       4,
  melt_max:       7,
  parent_id:      null,
  notes: `Deep blueberry body, bright lemon lift, and honey sweetness. No infusion, no straining, no extraction. Honey bridges fruit to bourbon the same way it does in Honey Lemon, but blueberry juice replaces lemon as the dominant flavor driver.

SPIRIT PAIRINGS
• Primary: Bourbon — honey is already a proven bourbon bridge (see Honey Lemon SKU). High-wheat bourbons (Weller, Larceny, Maker's Mark) are ideal.
• Secondary: Brandy — VS or VSOP Cognac integrates beautifully; honey amplifies both the fruit and grape-derived congeners.
• Tertiary: Dark rum — honey-molasses-fruit echoes Caribbean rum DNA. Appleton 12yr, Barbancourt 8yr.

JUICE SELECTION
Use 100% unsweetened blueberry juice — NOT blueberry juice cocktail (heavily sweetened with corn syrup). Reliable options: Knudsen, Lakewood, Dynamic Health. Wild blueberry juice has a deeper, slightly more tart flavor that reads better in a brown-spirit context.

RELATIVE TO HONEY LEMON
These two SKUs share honey as sweetener and lemon juice as acid but are genuinely distinct. Honey Lemon is bright and citrus-forward (1 full cup lemon juice). This formula is fruit-body-forward with lemon in a supporting role — deeper, less sharp, more visually dramatic. Position as complementary: Honey Lemon is the "bright" bourbon SKU, this is the "dark fruit" bourbon SKU.

OPERATIONAL NOTES
No infusion. No extraction. No straining. Same operational tier as Azalea — pure cold-blend formula with only the honey-warming step as additional handling. Color: deep blue-purple when frozen, distinct from red-black of Blackberry Brown Sugar and deep ruby of Azalea.`,
  recipe_body: `1. LOOSEN HONEY
Warm 268 ml raw or wildflower honey gently — just enough to make it fully fluid and pourable. Do not heat above 120°F or you'll drive off the aromatic compounds that make honey a flavor asset. Add 101 ml warm water and stir until completely smooth with no streaks. Let cool to room temperature before adding to the blend.

2. COMBINE THE FINAL BLEND
In a large measuring pitcher, combine:
• 503 ml unsweetened blueberry juice (100%, not blueberry cocktail)
• 268 ml fresh lemon juice, strained
• Honey mixture (full batch — honey + water from step 1)
• 168 ml 1:1 simple syrup (Brix adjustment)
• 0.15 tsp fine sea salt
Stir gently until fully combined. The blend should be a deep blue-purple. Let rest 3 minutes before measuring.

3. VALIDATE BRIX AND pH
Measure Brix: target 23–24. Blueberry juice contributes ~12–14 Brix, lemon juice ~7–8 Brix, honey is the primary Brix driver at ~80 Brix neat. If low, add simple syrup in 1 tbsp increments and re-measure. If above 25, dilute with 1 tbsp filtered water at a time.
Measure pH: target 2.6–3.0. If above 3.0, add a small splash of lemon juice and re-check.

4. FILL MOLDS AND FREEZE
Fill each mold cavity to approximately 100 g (3.5 oz). Tap firmly 3–4 times to release air pockets. Cover with plastic wrap pressed to the surface. Freeze at 0–10°F for a minimum of 480 minutes (8 hours).

5. UNMOLD AND VALIDATE
Release using cold water over the mold base for 5 seconds. The frozen cube should be deep blue-purple — the most distinctly colored cube alongside Blackberry Brown Sugar. Melt validation: pour 2 oz bourbon over one cube, neat. Honey and blueberry aroma should bloom immediately. First flavor integration at 2–3 min. Full fruit-honey-spirit balance at 4–7 min.`,
  created_at: now(),
}

const ingredients = [
  { name: 'Unsweetened blueberry juice (100%, not blueberry cocktail)', amount: 503, unit: 'ml',  sort_order: 0, catalog_id: null, brand: null },
  { name: 'Fresh lemon juice, strained',                                 amount: 268, unit: 'ml',  sort_order: 1, catalog_id: null, brand: null },
  { name: 'Raw or wildflower honey',                                     amount: 268, unit: 'ml',  sort_order: 2, catalog_id: null, brand: null },
  { name: 'Warm water (to loosen honey)',                                amount: 101, unit: 'ml',  sort_order: 3, catalog_id: null, brand: null },
  { name: '1:1 simple syrup (Brix adjustment)',                          amount: 168, unit: 'ml',  sort_order: 4, catalog_id: null, brand: null },
  { name: 'Fine sea salt',                                               amount: 0.15, unit: 'tsp', sort_order: 5, catalog_id: null, brand: null },
]

async function seed() {
  const wb      = writeBatch(db)
  const recipeRef = doc(collection(db, 'recipes'))
  wb.set(recipeRef, recipe)
  ingredients.forEach(ing => {
    wb.set(doc(collection(db, 'recipes', recipeRef.id, 'ingredients')), ing)
  })
  await wb.commit()
  console.log('Created recipe:', recipeRef.id)
  console.log('SKU:', recipe.sku, '—', recipe.expression)
  console.log(`${ingredients.length} ingredients written`)
  process.exit(0)
}

seed().catch(e => { console.error(e); process.exit(1) })
