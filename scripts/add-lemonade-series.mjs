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

// Portfolio differentiation note:
//   BLM-HL-001   Honey Lemon        — lemon + honey only, no mint
//   BLM-MJ-001   Mint Julep         — mint + sugar, spirit-forward, no lemon
//   BLM-GSB-001  Garden Strawberry  — strawberry-primary (300 ml), basil syrup, lemon as acid only
//   BLM-ML-001   Mint Lemonade      — lemon-primary, mint-infused syrup, honey bridge
//   BLM-SLN-001  Strawberry Lemonade — lemon and strawberry at equal weight, honey, no basil
//   BLM-SML-001  Strawberry Mint Lemonade — all three, mint syrup ties it together

const RECIPES = [

  // ── Mint Lemonade ────────────────────────────────────────────────────────────
  {
    recipe: {
      sku:            'BLM-ML-001',
      expression:     'Mint Lemonade',
      version:        '1.0',
      status:         'active',
      spirit_pairing: 'Bourbon',
      brix_min:       21,
      brix_max:       23,
      ph_min:         2.4,
      ph_max:         2.8,
      melt_min:       5,
      melt_max:       8,
      notes: `Lemon-primary cube with mint-infused simple syrup and honey. Brighter and more citrus-forward than Mint Julep (which is spirit-first, sugar-second, mint-third). The mint here is a full flavor component alongside lemon, not a garnish note.

DIFFERENTIATION FROM EXISTING SKUs
• vs. Honey Lemon (BLM-HL-001): adds mint as a third flavor dimension; slightly less honey-dominant
• vs. Mint Julep (BLM-MJ-001): lemon drives the acid and freshness; Mint Julep is bourbon-sugar-mint with no citrus

SPIRIT PAIRINGS
• Primary: Bourbon — wheated expressions (Weller, Maker's 46) for softness, or high-rye (Bulleit) for contrast
• Secondary: Irish whiskey — the mint-lemon combination is especially clean with lighter whiskeys
• Tertiary: Rye — mint and rye pepper notes interact interestingly

PROCESS NOTES
Mint syrup: steep 20–25 fresh spearmint leaves (not peppermint — too medicinal) in hot 1:1 simple syrup for 15 minutes. Strain before using. The syrup should be bright green and fragrant. Make fresh — mint syrup loses its vivid color and aromatic lift within 48 hours.`,
      recipe_body: `<h3>1. Make Mint Simple Syrup</h3>
<p>Steep <strong>20–25 fresh spearmint leaves</strong> in <strong>120 ml hot 1:1 simple syrup</strong> for 15 minutes. Strain through fine mesh. The syrup should be bright green and intensely aromatic. Use within 48 hours.</p>
<h3>2. Prepare Honey Mixture</h3>
<p>Warm <strong>45 ml raw honey</strong> until fluid. Add <strong>20 ml warm water</strong> and stir smooth. Cool to room temperature.</p>
<h3>3. Combine Blend</h3>
<p>In a measuring pitcher, combine:</p>
<ul>
<li><p><strong>240 ml</strong> fresh lemon juice, strained</p></li>
<li><p>Mint simple syrup from Step 1 (full batch)</p></li>
<li><p>Honey mixture from Step 2 (full batch)</p></li>
<li><p><strong>120 ml</strong> filtered water</p></li>
<li><p><strong>0.1 tsp</strong> fine sea salt</p></li>
</ul>
<p>Stir gently. The blend should be pale yellow-green. Rest 3 minutes before measuring.</p>
<h3>4. Validate Brix and pH</h3>
<p><strong>Brix target: 21–23.</strong> Adjust with plain simple syrup (up) or filtered water (down). <strong>pH target: 2.4–2.8.</strong> Lemon drives the acidity; if below 2.4, dilute with water 1 tbsp at a time.</p>
<h3>5. Fill and Freeze</h3>
<p>Fill mold cavities to <strong>100 g (3.5 oz)</strong>. Tap 3–4 times to release air. Cover with plastic wrap. Freeze at 0–10°F for a minimum of <strong>8 hours</strong>.</p>
<h3>6. Unmold and Validate</h3>
<p>Cube will be pale gold with a faint green tint. <strong>Melt validation:</strong> pour 2 oz bourbon neat. Mint aroma blooms immediately. Lemon brightness at 1–2 min. Honey and spirit integration at <strong>5–8 min</strong>.</p>`,
    },
    ingredients: [
      { name: 'Fresh lemon juice, strained',                  amount: 240,  unit: 'ml',  sort_order: 0, catalog_id: null, brand: null },
      { name: 'Mint-infused 1:1 simple syrup (spearmint)',   amount: 120,  unit: 'ml',  sort_order: 1, catalog_id: null, brand: null },
      { name: 'Raw honey',                                    amount: 45,   unit: 'ml',  sort_order: 2, catalog_id: null, brand: null },
      { name: 'Warm water (to loosen honey)',                 amount: 20,   unit: 'ml',  sort_order: 3, catalog_id: null, brand: null },
      { name: 'Filtered water',                              amount: 120,  unit: 'ml',  sort_order: 4, catalog_id: null, brand: null },
      { name: 'Fine sea salt',                               amount: 0.1,  unit: 'tsp', sort_order: 5, catalog_id: null, brand: null },
    ],
  },

  // ── Strawberry Lemonade ──────────────────────────────────────────────────────
  {
    recipe: {
      sku:            'BLM-SLN-001',
      expression:     'Strawberry Lemonade',
      version:        '1.0',
      status:         'active',
      spirit_pairing: 'Bourbon',
      brix_min:       21,
      brix_max:       23,
      ph_min:         2.8,
      ph_max:         3.2,
      melt_min:       5,
      melt_max:       8,
      notes: `Lemon and strawberry at near-equal weight — a true lemonade profile, not a strawberry cube with lemon as an acid adjuster. The 200/150 ml split between strawberry and lemon is intentional: strawberry provides body and color, lemon provides the defining bright acidity of lemonade.

DIFFERENTIATION FROM GARDEN STRAWBERRY (BLM-GSB-001)
Garden Strawberry is strawberry-primary (300 ml) with lemon in a supporting role (75 ml) and basil as the interesting accent. This cube is a balanced lemon-strawberry split with honey as the simple sweetener. Brighter, more citrus-forward, and simpler to produce (no infused syrup required).

SPIRIT PAIRINGS
• Primary: Bourbon — the bright lemon-strawberry combination works across the full bourbon range
• Secondary: Tennessee whiskey — soft and approachable
• Tertiary: Light rye — the citrus lift suits lighter-bodied ryes

PROCESS NOTES
Press fresh strawberries (blend and strain through fine mesh) for best color and flavor. Overripe strawberries have more concentrated flavor and higher Brix — measure before combining. The 200 ml target yields from approximately 270–300 g fresh strawberries depending on ripeness.`,
      recipe_body: `<h3>1. Press Strawberry Juice</h3>
<p>Blend <strong>~270 g fresh strawberries</strong> and strain through fine mesh to yield <strong>200 ml juice</strong>. Measure Brix of raw juice — adjust honey and syrup quantities if Brix falls outside 7–9.</p>
<h3>2. Prepare Honey Mixture</h3>
<p>Warm <strong>60 ml raw honey</strong> until fluid. Add <strong>25 ml warm water</strong> and stir smooth. Cool to room temperature.</p>
<h3>3. Combine Blend</h3>
<p>In a measuring pitcher, combine:</p>
<ul>
<li><p><strong>200 ml</strong> fresh strawberry juice</p></li>
<li><p><strong>150 ml</strong> fresh lemon juice, strained</p></li>
<li><p>Honey mixture from Step 2 (full batch)</p></li>
<li><p><strong>60 ml</strong> 1:1 simple syrup</p></li>
<li><p><strong>0.1 tsp</strong> fine sea salt</p></li>
</ul>
<p>Stir gently. The blend should be bright coral-pink. Rest 3 minutes before measuring.</p>
<h3>4. Validate Brix and pH</h3>
<p><strong>Brix target: 21–23.</strong> Strawberry Brix varies — adjust simple syrup (up) or filtered water (down). <strong>pH target: 2.8–3.2.</strong> Lemon drives the acidity in this blend.</p>
<h3>5. Fill and Freeze</h3>
<p>Fill mold cavities to <strong>100 g (3.5 oz)</strong>. Tap 3–4 times to release air. Cover with plastic wrap. Freeze at 0–10°F for a minimum of <strong>8 hours</strong>.</p>
<h3>6. Unmold and Validate</h3>
<p>Cube will be bright coral-pink, translucent. <strong>Melt validation:</strong> pour 2 oz bourbon neat. Lemon and strawberry bloom simultaneously at 1 min. Honey and spirit integration at <strong>5–8 min</strong>.</p>`,
    },
    ingredients: [
      { name: 'Fresh strawberry juice (pressed and strained)', amount: 200, unit: 'ml',  sort_order: 0, catalog_id: null, brand: null },
      { name: 'Fresh lemon juice, strained',                  amount: 150, unit: 'ml',  sort_order: 1, catalog_id: null, brand: null },
      { name: 'Raw honey',                                    amount: 60,  unit: 'ml',  sort_order: 2, catalog_id: null, brand: null },
      { name: 'Warm water (to loosen honey)',                 amount: 25,  unit: 'ml',  sort_order: 3, catalog_id: null, brand: null },
      { name: '1:1 simple syrup',                            amount: 60,  unit: 'ml',  sort_order: 4, catalog_id: null, brand: null },
      { name: 'Fine sea salt',                               amount: 0.1, unit: 'tsp', sort_order: 5, catalog_id: null, brand: null },
    ],
  },

  // ── Strawberry Mint Lemonade ─────────────────────────────────────────────────
  {
    recipe: {
      sku:            'BLM-SML-001',
      expression:     'Strawberry Mint Lemonade',
      version:        '1.0',
      status:         'active',
      spirit_pairing: 'Bourbon',
      brix_min:       21,
      brix_max:       23,
      ph_min:         2.6,
      ph_max:         3.0,
      melt_min:       5,
      melt_max:       8,
      notes: `The full lemonade trilogy — strawberry, lemon, and mint together. Each ingredient pulls its weight: strawberry provides fruit body and color, lemon delivers the citrus brightness, and mint-infused syrup ties the combination together with a cool herbal lift. More complex than either of the two-ingredient variants and a natural extension of the lemonade series.

RELATIONSHIP TO OTHER SKUs
• vs. Mint Lemonade (BLM-ML-001): adds strawberry body and deepens the color from pale gold to rose
• vs. Strawberry Lemonade (BLM-SLN-001): adds mint as a third dimension; slightly less sharp on acidity
• All three can be positioned as a series — a flight of the lemonade cubes would show the progression clearly

SPIRIT PAIRINGS
• Primary: Bourbon — the mint-strawberry-lemon combination works across styles
• Secondary: Irish whiskey — lighter body lets all three flavors register clearly
• Tertiary: Light rye

PROCESS NOTES
Mint syrup: same process as Mint Lemonade — steep 15–20 spearmint leaves in hot 1:1 syrup 15 minutes, strain. Use within 48 hours. Strawberry: press fresh as with Strawberry Lemonade. The three components (strawberry, lemon, mint syrup) can be prepared simultaneously and combined in a single step.`,
      recipe_body: `<h3>1. Make Mint Simple Syrup</h3>
<p>Steep <strong>15–20 fresh spearmint leaves</strong> in <strong>90 ml hot 1:1 simple syrup</strong> for 15 minutes. Strain through fine mesh and cool. Use within 48 hours.</p>
<h3>2. Press Strawberry Juice</h3>
<p>Blend <strong>~240 g fresh strawberries</strong> and strain through fine mesh to yield <strong>180 ml juice</strong>.</p>
<h3>3. Prepare Honey Mixture</h3>
<p>Warm <strong>35 ml raw honey</strong> until fluid. Add <strong>15 ml warm water</strong> and stir smooth. Cool to room temperature.</p>
<h3>4. Combine Blend</h3>
<p>In a measuring pitcher, combine:</p>
<ul>
<li><p><strong>180 ml</strong> fresh strawberry juice</p></li>
<li><p><strong>120 ml</strong> fresh lemon juice, strained</p></li>
<li><p>Mint simple syrup from Step 1 (full batch)</p></li>
<li><p>Honey mixture from Step 3 (full batch)</p></li>
<li><p><strong>0.1 tsp</strong> fine sea salt</p></li>
</ul>
<p>Stir gently. The blend should be a vivid rose-pink. Rest 3 minutes before measuring.</p>
<h3>5. Validate Brix and pH</h3>
<p><strong>Brix target: 21–23.</strong> Adjust with plain simple syrup (up) or filtered water (down). <strong>pH target: 2.6–3.0.</strong> If above 3.0, add lemon juice 1 tsp at a time.</p>
<h3>6. Fill and Freeze</h3>
<p>Fill mold cavities to <strong>100 g (3.5 oz)</strong>. Tap 3–4 times to release air. Cover with plastic wrap. Freeze at 0–10°F for a minimum of <strong>8 hours</strong>.</p>
<h3>7. Unmold and Validate</h3>
<p>Cube will be vivid rose-pink, one of the brightest colors in the portfolio. <strong>Melt validation:</strong> pour 2 oz bourbon neat. Mint blooms immediately on pour. Strawberry and lemon at 1–2 min. Full three-way integration at <strong>5–8 min</strong>.</p>`,
    },
    ingredients: [
      { name: 'Fresh strawberry juice (pressed and strained)',  amount: 180, unit: 'ml',  sort_order: 0, catalog_id: null, brand: null },
      { name: 'Fresh lemon juice, strained',                   amount: 120, unit: 'ml',  sort_order: 1, catalog_id: null, brand: null },
      { name: 'Mint-infused 1:1 simple syrup (spearmint)',    amount: 90,  unit: 'ml',  sort_order: 2, catalog_id: null, brand: null },
      { name: 'Raw honey',                                     amount: 35,  unit: 'ml',  sort_order: 3, catalog_id: null, brand: null },
      { name: 'Warm water (to loosen honey)',                  amount: 15,  unit: 'ml',  sort_order: 4, catalog_id: null, brand: null },
      { name: 'Fine sea salt',                                amount: 0.1, unit: 'tsp', sort_order: 5, catalog_id: null, brand: null },
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
