// Template script: adds structured `steps` to Honey Lemon (BLM-HL-001).
// Run once per environment. Re-running is safe — updateDoc overwrites the steps array.
//
// DATA MODEL
// Each recipe document gets a `steps` array. Each step:
//   phase          : 'prep' | 'mix' | 'fill' | 'freeze'
//   order          : integer, sort position within the phase
//   label          : short verb phrase shown as step header in session guide
//   detail         : 1–2 sentence how-to (plain text)
//   duration_min   : (optional) time estimate for the step
//   ingredient_refs: (optional) ingredient names from the recipe — enables future
//                    cross-recipe batching ("juice all lemons at once")
//
// To add steps to a new recipe, copy this script, change the SKU constant and
// RECIPE_BODY / STEPS values, and run it.

import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, query, where, updateDoc, doc } from 'firebase/firestore'

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

const SKU = 'BLM-HL-001'

// ── Recipe body (full reference HTML) ────────────────────────────────────────

const RECIPE_BODY = `<h3>1. Juice and Strain Lemons</h3>
<p>Squeeze fresh lemons through a <strong>fine-mesh strainer</strong> to yield <strong>120 ml</strong> juice. Measure after straining — lemon Brix varies, so hitting the volume target matters more than counting fruit.</p>
<h3>2. Thin the Honey</h3>
<p>Warm <strong>80 ml raw honey</strong> in a small saucepan or microwave until fully fluid (not hot). Add <strong>40 ml warm water</strong> and stir smooth. Cool to room temperature before combining — hot honey can alter the lemon's aromatics.</p>
<h3>3. Combine Blend</h3>
<p>In a measuring pitcher, combine:</p>
<ul>
<li><p><strong>120 ml</strong> fresh lemon juice, strained</p></li>
<li><p>Honey mixture from Step 2 (full batch)</p></li>
<li><p><strong>60 ml</strong> 2:1 simple syrup</p></li>
<li><p><strong>0.1 tsp</strong> fine sea salt</p></li>
</ul>
<p>Stir gently 30 seconds. The blend should be pale gold and slightly viscous. Rest 2 minutes before measuring.</p>
<h3>4. Validate Brix and pH</h3>
<p><strong>Brix target: 20–22.</strong> If low, add simple syrup 1 tbsp at a time and re-test. If high, add filtered water 1 tbsp at a time. <strong>pH target: 2.4–3.0.</strong> Lemon juice drives acidity — if above 3.0, add a small squeeze of lemon.</p>
<h3>5. Fill Molds</h3>
<p>Fill mold cavities to <strong>100 g (3.5 oz)</strong>. Tap the mold 3–4 times on the counter to release trapped air. Cover tightly with plastic wrap pressed to the surface to prevent freezer burn and frost.</p>
<h3>6. Freeze</h3>
<p>Freeze at <strong>0–10°F</strong> for a minimum of <strong>8 hours</strong>. Longer is fine — cubes can hold up to 2 weeks in a sealed container.</p>
<h3>7. Unmold and Validate</h3>
<p>Run cold water over the mold base for 5 seconds to release. Cube should be pale gold, clear to slightly hazy. <strong>Melt validation:</strong> pour 2 oz bourbon neat. Lemon aroma blooms within 30 seconds. Honey integrates at 2–3 min. Full balance at <strong>8–12 min</strong>.</p>`

// ── Structured steps ──────────────────────────────────────────────────────────
// phase    : 'prep' | 'mix' | 'fill' | 'freeze'
// order    : sort position within the phase (0-indexed)
// label    : short verb phrase (shown as step header in session guide)
// detail   : 1–2 sentence how-to
// duration_min  : (optional) time estimate
// ingredient_refs: (optional) ingredient names for future cross-recipe batching

const STEPS = [
  {
    phase: 'prep',
    order: 0,
    label: 'Juice and strain lemons',
    detail: 'Squeeze fresh lemons through a fine-mesh strainer to yield 120 ml. Measure after straining.',
    duration_min: 5,
    ingredient_refs: ['Fresh lemon juice, strained'],
  },
  {
    phase: 'prep',
    order: 1,
    label: 'Thin the honey',
    detail: 'Warm 80 ml raw honey until fluid. Add 40 ml warm water, stir smooth, cool to room temperature.',
    duration_min: 5,
    ingredient_refs: ['Raw honey', 'Filtered water'],
  },
  {
    phase: 'mix',
    order: 0,
    label: 'Combine ingredients',
    detail: 'In a pitcher combine lemon juice, honey mixture, 2:1 simple syrup, and salt. Stir gently 30 seconds. Rest 2 minutes.',
    duration_min: 3,
    ingredient_refs: ['Fresh lemon juice, strained', 'Raw honey', 'Filtered water', '2:1 simple syrup', 'Fine sea salt'],
  },
  {
    phase: 'mix',
    order: 1,
    label: 'Validate Brix and pH',
    detail: 'Target Brix 20–22, pH 2.4–3.0. Adjust with simple syrup (Brix low) or filtered water (Brix high). Add lemon if pH is above 3.0.',
    duration_min: 3,
  },
  {
    phase: 'fill',
    order: 0,
    label: 'Fill molds',
    detail: 'Fill cavities to 100 g (3.5 oz). Tap 3–4× on the counter to release air. Cover with plastic wrap pressed to the surface.',
    duration_min: 5,
  },
  {
    phase: 'freeze',
    order: 0,
    label: 'Freeze',
    detail: 'Freeze at 0–10°F for minimum 8 hours. Holds up to 2 weeks sealed.',
    duration_min: null,
  },
]

// ── Run ───────────────────────────────────────────────────────────────────────

async function run() {
  const snap = await getDocs(query(collection(db, 'recipes'), where('sku', '==', SKU)))
  if (snap.empty) {
    console.error(`No recipe found with SKU ${SKU}`)
    process.exit(1)
  }
  if (snap.size > 1) {
    console.warn(`Warning: ${snap.size} recipes found with SKU ${SKU} — updating the first one`)
  }

  const ref = doc(db, 'recipes', snap.docs[0].id)
  await updateDoc(ref, { steps: STEPS, recipe_body: RECIPE_BODY })

  console.log(`Updated ${SKU} (${snap.docs[0].id})`)
  console.log(`  recipe_body: ${RECIPE_BODY.length} chars`)
  console.log(`  steps: ${STEPS.length} steps across ${[...new Set(STEPS.map(s => s.phase))].join(' → ')} phases`)
  process.exit(0)
}

run().catch(e => { console.error(e); process.exit(1) })
