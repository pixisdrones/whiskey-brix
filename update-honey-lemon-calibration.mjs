// Revise BLM-HL-001 recipe based on first production batch calibration
// Batch finding: base mixture (honey + lemon + 2:1 syrup) measured 42 °Bx before water dilution.
// Added 23 oz filtered water to reach 23.2 °Bx. Target is 20–22 °Bx.
// Back-calculation: base volume ≈ 28.4 oz. To hit 21 °Bx center, need ≈ 28 oz water per batch.
// Run with: node update-honey-lemon-calibration.mjs
import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore'

const app = initializeApp({
  apiKey: "AIzaSyAAK6kSWq_7AWXOOvHyOSrN9lzhCVXLDKI",
  authDomain: "whiskey-brix.firebaseapp.com",
  projectId: "whiskey-brix",
  storageBucket: "whiskey-brix.firebasestorage.app",
  messagingSenderId: "1005067574676",
  appId: "1:1005067574676:web:bea75027c55d48f9680381"
})
const db = getFirestore(app)

const updatedBody = `<ol><li>Warm raw honey to 90–100°F to reduce viscosity — do not boil. Whisk with fresh lemon juice until fully incorporated; no visible streaks or separation. Honey is dense and will resist blending if cold.</li><li>Add 2:1 simple syrup. Stir until uniform. The honey-lemon-syrup base will read approximately 40–45 °Bx at this stage — this is expected. Do not attempt to freeze without significant water dilution; the base is intentionally concentrated.</li><li>Add filtered water in stages. Start with a volume of water approximately equal to the base mixture volume (roughly 1:1 by volume). Stir thoroughly after each addition. Target: pale golden, translucent, fully uniform. The correct water volume for a standard batch is approximately 23–28 oz — begin at 20 oz, stir, measure Brix, then continue in 2 oz increments until the reading falls in range. Note: tablespoon-scale additions are insufficient at this stage.</li><li>Taste: bright lemon-forward with honey sweetness underneath — not cloying. Lemon should be the first note; honey the finish. If sweetness still dominates at target Brix, the lemon juice volume was insufficient — note for next batch rather than adjusting water further.</li><li>Validate Brix: target 20–22 °Bx. Validate pH: target 2.4–3.0. If Brix reads above 22, add water in 1 oz increments and retest. If Brix reads below 20, the water addition was excessive — note volume used and reduce by 2–3 oz on next batch. Do not proceed outside 19–23 °Bx.</li><li>Fill mold cavities to ~100g (3.5 oz). Tap 3–4 times to release air. Cover with plastic wrap. Freeze at 0–10°F for 12 hours minimum.</li><li>Unmold using cold water over mold base for 5 seconds. Melt validation: pour 2 oz bourbon — honey and lemon aroma should bloom immediately. Full expression at 8–12 min.</li></ol>`

const updatedNotes = `Batch calibration (2026-05-24): base mixture (honey + lemon juice + 2:1 simple syrup) measured 42 °Bx before water addition. Added 23 oz filtered water to yield 23.2 °Bx. Back-calculation gives base volume ≈ 28.4 oz. To hit 21 °Bx (target center), approximately 28 oz water required per standard batch. Recipe water guidance revised accordingly.`

async function update() {
  const snap = await getDocs(collection(db, 'recipes'))
  const target = snap.docs.find(d => d.data().sku === 'BLM-HL-001')
  if (!target) { console.error('[update] BLM-HL-001 not found'); process.exit(1) }

  await updateDoc(doc(db, 'recipes', target.id), {
    recipe_body: updatedBody,
    notes: updatedNotes,
  })

  console.log(`[update] BLM-HL-001 updated (doc: ${target.id})`)
  process.exit(0)
}

update().catch(e => { console.error('[update] FAILED:', e); process.exit(1) })
