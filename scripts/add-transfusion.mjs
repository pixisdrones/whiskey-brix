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

const recipe = {
  sku:            'BLM-TRF-001',
  expression:     'Transfusion',
  version:        '1.0',
  status:         'seasonal',
  spirit_pairing: 'Bourbon',
  brix_min:       22,
  brix_max:       24,
  ph_min:         2.8,
  ph_max:         3.2,
  melt_min:       5,
  melt_max:       8,
  season_month:   3,     // March — early golf season opener
  notes: `Golf season seasonal (April–September). Inspired by the Transfusion — the unofficial cocktail of American golf culture: vodka, Concord grape juice, ginger ale, lime. Reimagined here as a brown spirits cube with fresh ginger juice replacing carbonation and honey providing depth.

Concord grape is unusual among fruit juices in its bourbon compatibility — the deep, jammy, muscat-adjacent character echoes the oak and vanilla in aged whiskey in a way that most grape juices do not. This is one of the more unexpected but genuinely compelling pairings in the portfolio.

SPIRIT PAIRINGS
• Primary: Bourbon — wheated (Weller, Maker's 46) or high-rye (Bulleit, Four Roses Single Barrel) both work well
• Secondary: Rye — ginger-on-rye spice stacks compellingly; try with Rittenhouse or Pikesville
• Tertiary: Tennessee whiskey — smooth, approachable, golf-appropriate

JUICE NOTES
Concord grape juice must be 100% unsweetened — Welch's 100% Grape Juice (purple label, Concord) is the most accessible option. Do not use red grape juice from table grapes; the flavor profile is completely different. Concord's Brix can range 14–18 depending on processing — always measure before combining and adjust simple syrup accordingly.

Ginger juice: grate fresh ginger and press through fine mesh cloth. ~60 g fresh ginger yields ~45 ml juice. Do not substitute ground ginger or ginger beer.

COLOR: Deep purple-black when frozen, transitions to translucent burgundy as it melts — visually striking in the glass.`,
  recipe_body: `<h3>1. Extract Ginger Juice</h3>
<p>Grate <strong>~60 g fresh ginger</strong> (unpeeled) and press through fine mesh cloth to extract <strong>45 ml fresh juice</strong>. Set aside.</p>
<h3>2. Prepare Honey Mixture</h3>
<p>Warm <strong>60 ml raw honey</strong> until fully fluid. Add <strong>25 ml warm water</strong> and stir until completely smooth. Cool to room temperature.</p>
<h3>3. Combine Blend</h3>
<p>In a measuring pitcher, combine:</p>
<ul>
<li><p><strong>300 ml</strong> 100% Concord grape juice (unsweetened — Welch's purple label or equivalent)</p></li>
<li><p><strong>90 ml</strong> fresh lime juice, strained</p></li>
<li><p><strong>45 ml</strong> fresh ginger juice from Step 1</p></li>
<li><p>Honey mixture from Step 2 (full batch)</p></li>
<li><p><strong>60 ml</strong> 1:1 simple syrup</p></li>
<li><p><strong>0.1 tsp</strong> fine sea salt</p></li>
</ul>
<p>Stir gently until fully combined. The blend should be deep purple. Rest 3 minutes before measuring.</p>
<h3>4. Validate Brix and pH</h3>
<p><strong>Brix target: 22–24.</strong> Concord grape Brix varies by brand — if the blend reads low, add simple syrup 1 tbsp at a time and re-measure. If above 25, dilute with filtered water 1 tbsp at a time. <strong>pH target: 2.8–3.2.</strong> Lime handles the acid load. If above 3.2, add a small splash of lime juice and re-check.</p>
<h3>5. Fill and Freeze</h3>
<p>Fill mold cavities to <strong>100 g (3.5 oz)</strong>. Tap firmly 3–4 times to release air pockets. Cover with plastic wrap pressed to the surface. Freeze at 0–10°F for a minimum of <strong>8 hours</strong>.</p>
<h3>6. Unmold and Validate</h3>
<p>Release with 5-second cold water over mold base. Cube will be deep purple-black, nearly opaque when fully frozen. <strong>Melt validation:</strong> pour 2 oz bourbon neat. Concord grape and ginger bloom immediately. Lime brightness at 2–3 min. Full fruit-spice-spirit integration at <strong>5–8 min</strong>. The melt transition from deep purple to translucent burgundy is one of the more visually distinctive in the portfolio.</p>`,
  created_at: now(),
}

const ingredients = [
  { name: '100% Concord grape juice, unsweetened (Welch\'s purple label or equivalent)', amount: 300,  unit: 'ml',  sort_order: 0, catalog_id: null, brand: null },
  { name: 'Fresh lime juice, strained',                                                  amount: 90,   unit: 'ml',  sort_order: 1, catalog_id: null, brand: null },
  { name: 'Fresh ginger juice (pressed from grated ginger)',                             amount: 45,   unit: 'ml',  sort_order: 2, catalog_id: null, brand: null },
  { name: 'Raw honey',                                                                   amount: 60,   unit: 'ml',  sort_order: 3, catalog_id: null, brand: null },
  { name: 'Warm water (to loosen honey)',                                                amount: 25,   unit: 'ml',  sort_order: 4, catalog_id: null, brand: null },
  { name: '1:1 simple syrup',                                                           amount: 60,   unit: 'ml',  sort_order: 5, catalog_id: null, brand: null },
  { name: 'Fine sea salt',                                                              amount: 0.1,  unit: 'tsp', sort_order: 6, catalog_id: null, brand: null },
]

async function seed() {
  const wb = writeBatch(db)
  const ref = doc(collection(db, 'recipes'))
  wb.set(ref, recipe)
  ingredients.forEach(ing => {
    wb.set(doc(collection(db, 'recipes', ref.id, 'ingredients')), ing)
  })
  await wb.commit()
  console.log('Created recipe:', ref.id)
  console.log('SKU:', recipe.sku, '—', recipe.expression)
  console.log(`${ingredients.length} ingredients written`)
  process.exit(0)
}

seed().catch(e => { console.error(e); process.exit(1) })
