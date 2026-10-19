import { initializeApp } from 'firebase/app'
import { getFirestore, collection, doc, writeBatch, getDocs, query, where } from 'firebase/firestore'

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

const UPDATED_RECIPE = {
  version:  '2.0',
  status:   'experimental',
  brix_min: 21,
  brix_max: 23,
  ph_min:   2.8,
  ph_max:   3.2,
  melt_min: 5,
  melt_max: 8,
  notes: `Lemon-primary cube with cold-steeped mint syrup and honey. v2.0 addresses mint being buried by lemon in v1 — three changes: lemon reduced from 240 ml to 160 ml, mint extraction switched to cold overnight infusion (hot steeping drives off volatile mint aromatics), and leaf count doubled to 40–50. Optional spearmint extract as a booster if mint still reads faint after cold-steeping.

WHY COLD INFUSION
Heat degrades menthol and menthone — the volatile compounds that make mint identifiable. Hot-steeping 15 min produces a muted, slightly cooked version. Cold-steeping 8–12 hours in the refrigerator preserves the bright, fresh aromatic lift. This is why Mint Julep's mint reads clearly: it uses cold muddling, never heat.

DIFFERENTIATION FROM EXISTING SKUs
• vs. Honey Lemon (BLM-HL-001): adds mint as a third flavor dimension; slightly less honey-dominant
• vs. Mint Julep (BLM-MJ-001): lemon drives the acid and freshness; Mint Julep is bourbon-sugar-mint with no citrus

SPIRIT PAIRINGS
• Primary: Bourbon — wheated expressions (Weller, Maker's 46) for softness, or high-rye (Bulleit) for contrast
• Secondary: Irish whiskey — mint-lemon is especially clean with lighter whiskeys
• Tertiary: Rye — mint and rye pepper notes interact interestingly

PROCESS NOTES
Spearmint only — not peppermint (too medicinal). Muddle leaves lightly before combining with syrup to break cell walls and increase extraction. Cold-steep in refrigerator 8–12 hours; do not rush with heat. Strain just before combining with lemon juice — the syrup loses color and aroma quickly once the leaves are removed, so time the cold steep to finish when you're ready to fill molds.`,
  recipe_body: `<h3>1. Make Cold-Steeped Mint Syrup (8–12 hours ahead)</h3>
<p>Place <strong>40–50 fresh spearmint leaves</strong> in a jar or container. Lightly muddle — press once or twice with a muddler or the back of a spoon to bruise the leaves without shredding them. Pour <strong>120 ml room-temperature 1:1 simple syrup</strong> over the leaves. Seal and refrigerate for <strong>8–12 hours</strong>. The syrup will turn deep green and smell intensely of fresh mint. Do not use heat at any stage.</p>
<h3>2. Prepare Honey Mixture</h3>
<p>Warm <strong>45 ml raw honey</strong> until fluid. Add <strong>20 ml warm water</strong> and stir smooth. Cool to room temperature.</p>
<h3>3. Strain and Combine</h3>
<p>Strain mint syrup through fine mesh directly into a measuring pitcher; discard leaves. Add:</p>
<ul>
<li><p><strong>160 ml</strong> fresh lemon juice, strained</p></li>
<li><p>Honey mixture from Step 2 (full batch)</p></li>
<li><p><strong>150 ml</strong> filtered water</p></li>
<li><p><strong>0.1 tsp</strong> fine sea salt</p></li>
<li><p><strong>0.25 tsp</strong> pure spearmint extract <em>(optional — add if mint aroma reads faint after tasting)</em></p></li>
</ul>
<p>Stir gently. Blend should be pale green-gold. Rest 3 minutes before measuring.</p>
<h3>4. Validate Brix and pH</h3>
<p><strong>Brix target: 21–23.</strong> Adjust with plain simple syrup (up) or filtered water (down). <strong>pH target: 2.8–3.2.</strong> Lower lemon volume vs. v1 raises pH slightly — if below 2.8, add lemon juice 1 tsp at a time.</p>
<h3>5. Fill and Freeze</h3>
<p>Fill mold cavities to <strong>100 g (3.5 oz)</strong>. Tap 3–4 times to release air. Cover with plastic wrap pressed to the surface. Freeze at 0–10°F for a minimum of <strong>8 hours</strong>.</p>
<h3>6. Unmold and Validate</h3>
<p>Cube will be pale gold with a faint green tint. <strong>Melt validation:</strong> pour 2 oz bourbon neat. Mint aroma should be immediate and clear — if it reads faint, note for next batch to use the spearmint extract. Lemon brightness at 1–2 min. Honey and spirit integration at <strong>5–8 min</strong>.</p>`,
}

const NEW_INGREDIENTS = [
  { name: 'Fresh lemon juice, strained',                         amount: 160,  unit: 'ml',  sort_order: 0, catalog_id: null, brand: null },
  { name: 'Fresh spearmint leaves (cold-steeped, see method)',   amount: 45,   unit: 'each', sort_order: 1, catalog_id: null, brand: null },
  { name: '1:1 simple syrup (for mint cold-steep)',              amount: 120,  unit: 'ml',  sort_order: 2, catalog_id: null, brand: null },
  { name: 'Raw honey',                                           amount: 45,   unit: 'ml',  sort_order: 3, catalog_id: null, brand: null },
  { name: 'Warm water (to loosen honey)',                        amount: 20,   unit: 'ml',  sort_order: 4, catalog_id: null, brand: null },
  { name: 'Filtered water',                                      amount: 150,  unit: 'ml',  sort_order: 5, catalog_id: null, brand: null },
  { name: 'Fine sea salt',                                       amount: 0.1,  unit: 'tsp', sort_order: 6, catalog_id: null, brand: null },
  { name: 'Pure spearmint extract (optional booster)',           amount: 0.25, unit: 'tsp', sort_order: 7, catalog_id: null, brand: null },
]

async function main() {
  const dryRun = process.argv.includes('--dry-run')

  const snap = await getDocs(query(collection(db, 'recipes'), where('sku', '==', 'BLM-ML-001')))
  if (snap.empty) {
    console.error('Recipe BLM-ML-001 not found.')
    process.exit(1)
  }

  const recipeDoc = snap.docs[0]
  const recipeId  = recipeDoc.id
  const existing  = recipeDoc.data()

  if (dryRun) {
    console.log(`DRY RUN — would update "${existing.expression}" (${existing.sku}) id: ${recipeId}`)
    console.log(`  version: ${existing.version} → ${UPDATED_RECIPE.version}`)
    console.log(`  lemon: 240 ml → 160 ml`)
    console.log(`  mint extraction: hot 15 min → cold overnight`)
    console.log(`  leaf count: 20–25 → 40–50`)
    console.log(`  ph: ${existing.ph_min}–${existing.ph_max} → ${UPDATED_RECIPE.ph_min}–${UPDATED_RECIPE.ph_max}`)
    console.log(`  ingredients: ${existing.sku} will have ${NEW_INGREDIENTS.length} (was 6)`)
    process.exit(0)
  }

  const ingSnap = await getDocs(collection(db, 'recipes', recipeId, 'ingredients'))
  const wb = writeBatch(db)

  wb.update(doc(db, 'recipes', recipeId), UPDATED_RECIPE)
  ingSnap.docs.forEach(d => wb.delete(d.ref))
  NEW_INGREDIENTS.forEach(ing => {
    wb.set(doc(collection(db, 'recipes', recipeId, 'ingredients')), ing)
  })

  await wb.commit()
  console.log(`✓ Updated "${existing.expression}" (${existing.sku}) to v${UPDATED_RECIPE.version} — id: ${recipeId}`)
  console.log(`  Replaced ${ingSnap.size} ingredients with ${NEW_INGREDIENTS.length}.`)
  process.exit(0)
}

main().catch(err => { console.error(err); process.exit(1) })
