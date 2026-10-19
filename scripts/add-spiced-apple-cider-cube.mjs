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
const now = () => new Date().toISOString()

const RECIPE = {
  recipe: {
    sku: 'BLM-SAC-001', expression: 'Spiced Apple Cider',
    version: '1.0', status: 'experimental', spirit_pairing: 'Bourbon',
    brix_min: 20, brix_max: 22, ph_min: 3.0, ph_max: 3.4,
    melt_min: 8, melt_max: 12, season_month: 10,
    notes: `October seasonal. Inspired by the Spiced Apple Cider Bourbon Smash. The cider is simmered with whole spices — not ground — to extract aromatics cleanly without muddiness. Apple cider vinegar echoes the original cocktail and keeps the cube from tasting flat as it melts. Maple syrup adds fall depth over plain simple syrup.

SPIRIT PAIRINGS: Bourbon (primary), Rye whiskey (secondary — spice-on-spice), Apple brandy/Calvados (tertiary).`,
    recipe_body: `<h3>1. Steep the Spice Base</h3>
<p>Combine <strong>500 ml fresh-pressed apple cider</strong> with <strong>3 cinnamon sticks</strong>, <strong>6 whole cloves</strong>, <strong>2 whole star anise</strong>, and <strong>5 allspice berries</strong> in a saucepan. Simmer on low heat for <strong>20 minutes</strong> — do not boil, which dulls the bright apple character. Remove from heat, add <strong>0.5 tsp fresh-grated nutmeg</strong>, and steep an additional 10 minutes.</p>
<h3>2. Strain and Finish</h3>
<p>Strain through fine mesh; discard all solids. While still warm, stir in:</p>
<ul>
<li><p><strong>75 ml maple syrup</strong></p></li>
<li><p><strong>25 ml fresh lemon juice</strong>, strained</p></li>
<li><p><strong>20 ml apple cider vinegar</strong></p></li>
</ul>
<h3>3. Validate</h3>
<p><strong>Brix: 20–22.</strong> Add maple syrup if low; add a splash of cider if high. <strong>pH: 3.0–3.4.</strong> Adjust with lemon juice or cider.</p>
<h3>4. Cool and Fill</h3>
<p>Cool completely to room temperature before filling molds. Fill to <strong>100 g (3.5 oz)</strong>. Tap to release air pockets. Freeze at 0–10°F for a minimum of <strong>8 hours</strong>.</p>
<h3>5. Melt Validation</h3>
<p>Pour 2 oz bourbon neat over 1–2 cubes in a rocks glass. Spiced apple aroma should be immediate. Maple sweetness emerges at 2–3 min. Full warm-spice integration at <strong>8–12 min</strong>. No additional mixers needed.</p>`,
  },
  ingredients: [
    { name: 'Fresh-pressed apple cider',      amount: 500,  unit: 'ml',  sort_order: 0 },
    { name: 'Maple syrup',                    amount: 75,   unit: 'ml',  sort_order: 1 },
    { name: 'Fresh lemon juice, strained',    amount: 25,   unit: 'ml',  sort_order: 2 },
    { name: 'Apple cider vinegar',            amount: 20,   unit: 'ml',  sort_order: 3 },
    { name: 'Cinnamon sticks (whole)',         amount: 3,    unit: 'each', sort_order: 4 },
    { name: 'Whole cloves',                   amount: 6,    unit: 'each', sort_order: 5 },
    { name: 'Star anise (whole)',              amount: 2,    unit: 'each', sort_order: 6 },
    { name: 'Allspice berries',               amount: 5,    unit: 'each', sort_order: 7 },
    { name: 'Fresh-grated nutmeg',            amount: 0.5,  unit: 'tsp', sort_order: 8 },
  ],
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')

  // Check for existing recipe with same SKU
  const existing = await getDocs(query(collection(db, 'recipes'), where('sku', '==', RECIPE.recipe.sku)))
  if (existing.size > 0) {
    console.log(`⚠️  Recipe with SKU ${RECIPE.recipe.sku} already exists (id: ${existing.docs[0].id}). Aborting.`)
    process.exit(1)
  }

  const { recipe, ingredients } = RECIPE
  const recipeRef = doc(collection(db, 'recipes'))

  if (dryRun) {
    console.log('DRY RUN — would create:')
    console.log(`  Recipe: ${recipe.expression} (${recipe.sku})`)
    console.log(`  Ingredients (${ingredients.length}):`)
    ingredients.forEach(i => console.log(`    ${i.sort_order + 1}. ${i.name} — ${i.amount} ${i.unit}`))
    process.exit(0)
  }

  const wb = writeBatch(db)
  wb.set(recipeRef, { ...recipe, notes: recipe.notes ?? null, recipe_body: recipe.recipe_body ?? null, parent_id: null, created_at: now() })
  ingredients.forEach(ing => {
    wb.set(doc(collection(db, 'recipes', recipeRef.id, 'ingredients')), {
      name: ing.name, amount: ing.amount, unit: ing.unit, sort_order: ing.sort_order,
      catalog_id: null, brand: null,
    })
  })
  await wb.commit()

  console.log(`✓ Created recipe "${recipe.expression}" (${recipe.sku}) — id: ${recipeRef.id}`)
  console.log(`  ${ingredients.length} ingredients added.`)
  process.exit(0)
}

main().catch(err => { console.error(err); process.exit(1) })
