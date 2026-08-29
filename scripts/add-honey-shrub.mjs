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
  sku:            'BLM-HSB-001',
  expression:     'Honey Shrub',
  version:        '1.0',
  status:         'active',
  spirit_pairing: 'Bourbon',
  brix_min:       21,
  brix_max:       23,
  ph_min:         2.8,
  ph_max:         3.2,
  melt_min:       5,
  melt_max:       8,
  notes: `Bourbon-lemon-apple cider vinegar cube inspired by the shrub (drinking vinegar) cocktail tradition. Shrubs — vinegar-based syrups mixed with spirits — date to colonial America and have seen a serious craft-bar revival. ACV replaces the carbonation of a soda mixer: the acidity is present but mellow on the melt, reading as brightness and complexity rather than sourness. The honey-ACV pairing is a classic combination that softens the vinegar's edge while keeping the character intact.

ACV QUANTITY
60 ml is deliberately restrained. ACV is assertive — more than this and the vinegar note dominates rather than accents. The lemon (75 ml) and honey (75 ml) hold parity, so the result is a three-way balance rather than a vinegar cube with bourbon added.

SPIRIT PAIRINGS
• Primary: Bourbon — wheated expressions (Weller, Maker's Mark, Larceny) are the softest fit; the ACV tang contrasts beautifully with a high-corn, low-rye mash
• Secondary: High-rye bourbon (Bulleit, Four Roses Single Barrel) or rye — the pepper notes of rye and the acetic sharpness of ACV interact in a more assertive, cocktail-bar register
• Tertiary: Apple brandy or Calvados — ACV and apple share the same fruit family; a natural pairing

INGREDIENT NOTES
Apple cider vinegar: use raw, unfiltered ACV with the mother (Bragg's Organic is the most widely available). The mother contributes trace flavor complexity and the slight haze disappears entirely when frozen. If you prefer a perfectly clear cube, strain the ACV through a fine-mesh sieve before measuring — flavor difference is minimal. Do not use white vinegar or seasoned rice vinegar.

Lemon: fresh only. The bright citrus aromatics are what hold the balance against the vinegar — bottled lemon juice lacks the volatile compounds that do this.

Honey: raw honey preferred. The floral character in raw honey complements ACV in a way that processed honey does not. Warm until fully fluid before measuring.`,
  recipe_body: `<h3>1. Prepare Honey Mixture</h3>
<p>Warm <strong>75 ml raw honey</strong> until fully fluid. Add <strong>30 ml warm water</strong> and stir until completely smooth. Cool to room temperature.</p>
<h3>2. Combine Blend</h3>
<p>In a measuring pitcher, combine:</p>
<ul>
<li><p><strong>75 ml</strong> fresh lemon juice, strained</p></li>
<li><p><strong>60 ml</strong> raw apple cider vinegar (unfiltered — Bragg's or equivalent)</p></li>
<li><p>Honey mixture from Step 1 (full batch)</p></li>
<li><p><strong>60 ml</strong> 1:1 simple syrup</p></li>
<li><p><strong>150 ml</strong> filtered water</p></li>
<li><p><strong>0.1 tsp</strong> fine sea salt</p></li>
</ul>
<p>Stir gently until fully combined. The blend will be pale gold with a slight haze from the ACV mother — this disappears on freezing. Rest 3 minutes before measuring.</p>
<h3>3. Validate Brix and pH</h3>
<p><strong>Brix target: 21–23.</strong> ACV contributes almost no sugar — if Brix reads low, adjust with plain simple syrup 1 tbsp at a time. If high, add filtered water 1 tbsp at a time. <strong>pH target: 2.8–3.2.</strong> Two acid sources (lemon and ACV) are working together here. If above 3.2, add a small splash of lemon juice and re-check. If below 2.8, dilute with filtered water rather than adding more sweetener.</p>
<h3>4. Fill and Freeze</h3>
<p>Fill mold cavities to <strong>100 g (3.5 oz)</strong>. Tap 3–4 times to release air. Cover with plastic wrap pressed to the surface. Freeze at 0–10°F for a minimum of <strong>8 hours</strong>.</p>
<h3>5. Unmold and Validate</h3>
<p>Cube will be pale gold, clear to very slightly hazy. <strong>Melt validation:</strong> pour 2 oz bourbon neat. Lemon brightness blooms immediately. ACV character emerges at 1–2 min as a tangy, slightly funky lift — not sour, but distinctly vinegar-adjacent. Honey and spirit integration at <strong>5–8 min</strong>. The full melt reads as a craft shrub cocktail: bright, complex, with more going on than a standard citrus cube.</p>`,
  created_at: now(),
}

const ingredients = [
  { name: 'Fresh lemon juice, strained',                                    amount: 75,  unit: 'ml',  sort_order: 0, catalog_id: null, brand: null },
  { name: 'Raw apple cider vinegar, unfiltered (Bragg\'s or equivalent)',   amount: 60,  unit: 'ml',  sort_order: 1, catalog_id: null, brand: null },
  { name: 'Raw honey',                                                       amount: 75,  unit: 'ml',  sort_order: 2, catalog_id: null, brand: null },
  { name: 'Warm water (to loosen honey)',                                    amount: 30,  unit: 'ml',  sort_order: 3, catalog_id: null, brand: null },
  { name: '1:1 simple syrup',                                               amount: 60,  unit: 'ml',  sort_order: 4, catalog_id: null, brand: null },
  { name: 'Filtered water',                                                  amount: 150, unit: 'ml',  sort_order: 5, catalog_id: null, brand: null },
  { name: 'Fine sea salt',                                                   amount: 0.1, unit: 'tsp', sort_order: 6, catalog_id: null, brand: null },
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
