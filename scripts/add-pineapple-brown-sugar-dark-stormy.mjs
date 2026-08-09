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

const app = initializeApp(firebaseConfig)
const db  = getFirestore(app)
const now = () => new Date().toISOString()

const RECIPES = [

  // ── Pineapple Brown Sugar ────────────────────────────────────────────────────
  {
    recipe: {
      sku:            'BLM-PBS-001',
      expression:     'Pineapple Brown Sugar',
      version:        '1.0',
      status:         'active',
      spirit_pairing: 'Bourbon',
      brix_min:       21,
      brix_max:       23,
      ph_min:         3.0,
      ph_max:         3.4,
      melt_min:       5,
      melt_max:       8,
      notes: `Pineapple-forward cube with demerara (brown sugar) depth and vanilla. Designed to complement bourbon's native caramel and vanilla notes — pineapple and brown sugar are both natural bourbon companions. Richer and more dessert-adjacent than the Azalea; where Azalea is a multi-fruit cocktail reference, this is an ingredient-driven expression.

Differentiation from Azalea (BLM-AZL-001): Azalea uses pineapple as one of three fruit components alongside lemon and pomegranate. This recipe is pineapple-dominant — 300 ml vs Azalea's 200 ml — and the brown sugar / vanilla pairing creates a fundamentally different flavor register.

SPIRIT PAIRINGS
• Primary: Bourbon — wheated bourbons (Weller, Maker's 46, Larceny) amplify the vanilla and caramel register
• Secondary: Tennessee whiskey — the soft corn-forward profile suits the tropical sweetness
• Tertiary: Aged rum — demerara is rum's native sugar; the pairing is intuitive

INGREDIENT NOTES
Pineapple juice: 100% not-from-concentrate (Dole, Lakewood, or Trader Joe's 100% are reliable). Do not use sweetened pineapple juice — it will push Brix above range. Demerara syrup: use turbinado or raw cane sugar, not white sugar. The molasses content of demerara is the whole point — it's what adds the "brown sugar" character. Vanilla: pure vanilla extract only, not imitation.`,
      recipe_body: `<h3>1. Combine Blend</h3>
<p>In a measuring pitcher, combine:</p>
<ul>
<li><p><strong>300 ml</strong> 100% pineapple juice (not from concentrate)</p></li>
<li><p><strong>60 ml</strong> fresh lime juice, strained</p></li>
<li><p><strong>120 ml</strong> demerara simple syrup (1:1 — turbinado or raw cane sugar)</p></li>
<li><p><strong>0.75 tsp</strong> pure vanilla extract</p></li>
<li><p><strong>0.1 tsp</strong> fine sea salt</p></li>
</ul>
<p>Stir gently until fully combined. Rest 3 minutes before measuring.</p>
<h3>2. Validate Brix and pH</h3>
<p><strong>Brix target: 21–23.</strong> Pineapple juice Brix varies by brand — measure before combining and adjust demerara syrup accordingly (up) or add filtered water (down). <strong>pH target: 3.0–3.4.</strong> Pineapple sits naturally in this range; if below 3.0, add a small splash of filtered water.</p>
<h3>3. Fill and Freeze</h3>
<p>Fill mold cavities to <strong>100 g (3.5 oz)</strong>. Tap 3–4 times to release air pockets. Cover with plastic wrap pressed to the surface. Freeze at 0–10°F for a minimum of <strong>8 hours</strong>.</p>
<h3>4. Unmold and Validate</h3>
<p>Cube will be pale gold, nearly clear. <strong>Melt validation:</strong> pour 2 oz bourbon neat. Pineapple and vanilla bloom immediately. Brown sugar depth at 2–3 min. Full tropical-caramel-spirit integration at <strong>5–8 min</strong>.</p>`,
    },
    ingredients: [
      { name: '100% pineapple juice (not from concentrate)',         amount: 300,  unit: 'ml',  sort_order: 0, catalog_id: null, brand: null },
      { name: 'Fresh lime juice, strained',                          amount: 60,   unit: 'ml',  sort_order: 1, catalog_id: null, brand: null },
      { name: 'Demerara simple syrup (1:1, turbinado or raw cane)', amount: 120,  unit: 'ml',  sort_order: 2, catalog_id: null, brand: null },
      { name: 'Pure vanilla extract',                               amount: 0.75, unit: 'tsp', sort_order: 3, catalog_id: null, brand: null },
      { name: 'Fine sea salt',                                      amount: 0.1,  unit: 'tsp', sort_order: 4, catalog_id: null, brand: null },
    ],
  },

  // ── Dark & Stormy ────────────────────────────────────────────────────────────
  {
    recipe: {
      sku:            'BLM-DKS-001',
      expression:     'Dark & Stormy',
      version:        '1.0',
      status:         'active',
      spirit_pairing: 'Dark Rum',
      brix_min:       21,
      brix_max:       23,
      ph_min:         2.6,
      ph_max:         3.0,
      melt_min:       5,
      melt_max:       8,
      notes: `Dark & Stormy-inspired cube: ginger-forward, lime-driven, with demerara syrup and a small measure of blackstrap molasses for the dark rum signature. The traditional Dark & Stormy is Gosling's Black Seal rum, ginger beer, and lime. The cube replaces ginger beer's carbonation with concentrated fresh ginger juice and delivers the full flavor profile without effervescence.

This is the first recipe in the portfolio with dark rum as the primary pairing. It also works compellingly with bourbon (producing a Kentucky Mule-adjacent profile) and rye.

SPIRIT PAIRINGS
• Primary: Dark rum — Gosling's Black Seal (traditional), Appleton 12yr, Plantation Original Dark
• Secondary: Bourbon — high-rye expressions (Bulleit, Knob Creek) complement the ginger heat
• Tertiary: Rye — spice-on-spice is assertive but works well for ginger fans

INGREDIENT NOTES
Ginger juice: this recipe uses more ginger (90 ml) than any other in the portfolio — ginger is the defining flavor of a Dark & Stormy and should be assertive. ~120 g fresh ginger yields 90 ml juice.

Blackstrap molasses: extremely thick and viscous at room temperature. Warm gently (same approach as honey) before measuring. Stir into the demerara syrup first — do not add cold molasses directly to cold juice or it will sink and clump. 15 ml is a small amount by volume but significant by flavor; do not increase without re-measuring Brix.

Lime: use fresh only. Bottled lime juice lacks the volatile aromatics that make lime identifiable in a melt.`,
      recipe_body: `<h3>1. Prepare Molasses-Demerara Blend</h3>
<p>Gently warm <strong>15 ml blackstrap molasses</strong> until pourable. Add to <strong>150 ml demerara simple syrup (1:1)</strong> and stir until fully integrated. No heat needed for the syrup — just stir thoroughly. Set aside.</p>
<h3>2. Extract Ginger Juice</h3>
<p>Grate <strong>~120 g fresh ginger</strong> (unpeeled) and press through fine mesh cloth to extract <strong>90 ml fresh juice</strong>. Set aside.</p>
<h3>3. Combine Blend</h3>
<p>In a measuring pitcher, combine:</p>
<ul>
<li><p><strong>120 ml</strong> fresh lime juice, strained</p></li>
<li><p><strong>90 ml</strong> fresh ginger juice</p></li>
<li><p>Molasses-demerara blend from Step 1 (full batch)</p></li>
<li><p><strong>90 ml</strong> filtered water</p></li>
<li><p><strong>0.1 tsp</strong> fine sea salt</p></li>
</ul>
<p>Stir until fully combined. Blend should be a deep amber-brown. Rest 3 minutes before measuring.</p>
<h3>4. Validate Brix and pH</h3>
<p><strong>Brix target: 21–23.</strong> If low, add plain demerara syrup 1 tbsp at a time. If high, add filtered water 1 tbsp at a time — do not add more molasses to compensate. <strong>pH target: 2.6–3.0.</strong> Lime is handling the acid load. If above 3.0, add a small splash of lime juice and re-check.</p>
<h3>5. Fill and Freeze</h3>
<p>Fill mold cavities to <strong>100 g (3.5 oz)</strong>. Tap 3–4 times to release air pockets. Cover with plastic wrap pressed to the surface. Freeze at 0–10°F for a minimum of <strong>8 hours</strong>.</p>
<h3>6. Unmold and Validate</h3>
<p>Cube will be deep amber-brown, the darkest in the portfolio. <strong>Melt validation:</strong> pour 2 oz dark rum neat. Ginger heat and lime brightness bloom immediately. Molasses and demerara depth at 2–3 min. Full Dark & Stormy profile at <strong>5–8 min</strong>. With bourbon: ginger and brown sugar dominate, lime provides lift — a Kentucky Mule profile.</p>`,
    },
    ingredients: [
      { name: 'Fresh lime juice, strained',                          amount: 120,  unit: 'ml',  sort_order: 0, catalog_id: null, brand: null },
      { name: 'Fresh ginger juice (pressed from grated ginger)',     amount: 90,   unit: 'ml',  sort_order: 1, catalog_id: null, brand: null },
      { name: 'Demerara simple syrup (1:1)',                         amount: 150,  unit: 'ml',  sort_order: 2, catalog_id: null, brand: null },
      { name: 'Blackstrap molasses (warmed until pourable)',         amount: 15,   unit: 'ml',  sort_order: 3, catalog_id: null, brand: null },
      { name: 'Filtered water',                                      amount: 90,   unit: 'ml',  sort_order: 4, catalog_id: null, brand: null },
      { name: 'Fine sea salt',                                       amount: 0.1,  unit: 'tsp', sort_order: 5, catalog_id: null, brand: null },
    ],
  },
]

async function seed() {
  const wb = writeBatch(db)
  const log = []

  for (const { recipe, ingredients } of RECIPES) {
    const ref = doc(collection(db, 'recipes'))
    wb.set(ref, { ...recipe, created_at: now() })
    ingredients.forEach(ing => {
      wb.set(doc(collection(db, 'recipes', ref.id, 'ingredients')), ing)
    })
    log.push(`${recipe.sku}  ${recipe.expression}  (${ingredients.length} ingredients)`)
  }

  await wb.commit()
  log.forEach(l => console.log('Created:', l))
  console.log(`\n${RECIPES.length} recipes written.`)
  process.exit(0)
}

seed().catch(e => { console.error(e); process.exit(1) })
