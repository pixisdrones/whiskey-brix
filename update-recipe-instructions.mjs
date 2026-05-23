// Update recipe instructions for BLM-HL-001, BLM-RLP-001, BLM-LA-001, BLM-CH-001
// Run with: node update-recipe-instructions.mjs
import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore'

const app = initializeApp({
  apiKey: "AIzaSyAAK6kSWq_7AWXOOvHyOSrN9lzhCVXLDKI",
  authDomain: "whiskey-brix.firebaseapp.com",
  projectId: "whiskey-brix",
  storageBucket: "whiskey-brix.firebasestorage.app",
  messagingSenderId: "1005067574676",
  appId: "1:1005067574676:web:bea75027c55d48f9680381"
})
const db = getFirestore(app)

const instructions = {
  'BLM-HL-001': `<ol><li>Warm raw honey to 90–100°F to reduce viscosity — do not boil. Whisk with fresh lemon juice until fully incorporated; no visible streaks or separation. Honey is dense and will resist blending if cold.</li><li>Add 2:1 simple syrup and filtered water. Stir gently until fully combined. Blend should be pale golden, translucent, and uniform throughout.</li><li>Taste: bright lemon-forward with honey sweetness underneath — not cloying. Lemon should be the first note; honey the finish. Adjust with up to 1 tbsp additional water if the sweetness dominates.</li><li>Validate Brix: target 20–22 °Bx. Validate pH: target 2.4–3.0. If Brix reads high, add water in 1 tbsp increments and retest. Do not proceed outside 19–23 °Bx.</li><li>Fill mold cavities to ~100g (3.5 oz). Tap 3–4 times to release air. Cover with plastic wrap. Freeze at 0–10°F for 12 hours minimum.</li><li>Unmold using cold water over mold base for 5 seconds. Melt validation: pour 2 oz bourbon — honey and lemon aroma should bloom immediately. Full expression at 8–12 min.</li></ol>`,

  'BLM-RLP-001': `<ol><li>Heat 4 cups filtered water to 170–180°F — do not boil. Add rosemary sprigs and steep 15 minutes. Infusion should be pale gold with a clean herbal aroma — not woody, not medicinal. If it smells resinous or bitter, steep time was too long; discard and restart.</li><li>Strain rosemary completely. Press sprigs gently once to extract oils — do not squeeze hard or the flavor turns bitter. Cool infusion to room temperature; do not refrigerate to accelerate cooling as rapid temperature drop mutes the herbal character.</li><li>Combine rosemary infusion, fresh lemon juice, and simple syrup. Whisk until fully uniform. Color should be pale straw-yellow. Taste: herbal and citrus should be in balance — rosemary is the top note, lemon provides the body.</li><li>Validate Brix: target 12–15 °Bx. This is the lowest-Brix SKU in the portfolio by design — do not attempt to increase it. Validate pH: target 2.8–3.2. Do not proceed outside 11–16 °Bx.</li><li>Fill mold cavities to ~100g (3.5 oz). Tap 3–4 times to release air. Cover with plastic wrap. Freeze at 0–10°F for 12 hours minimum.</li><li>Unmold using cold water over mold base for 5 seconds. Melt validation: pour 2 oz gin — rosemary and citrus lift immediately and integrate with the botanical profile of the spirit. Full expression at 8–12 min.</li></ol>`,

  'BLM-LA-001': `<ol><li>Juice enough limes to yield 4 cups fresh lime juice, strained. Do not use bottled juice — volatile citrus oils dissipate during processing and are essential to this SKU's aroma on melt.</li><li>Combine lime juice, light agave syrup, and filtered water. Whisk vigorously until agave is fully dissolved. Agave is viscous and settles — confirm no streaks remain at the bottom of the vessel before measuring Brix.</li><li>Add fine kosher salt. Stir until completely dissolved — zero grit. Taste: the profile should be bright, citrus-forward, with a clean mineral finish. "Salty" is wrong; "bright with a savory edge" is the target. Salt elevates the lime; it should not be perceptible as a standalone flavor.</li><li>Validate Brix: target 20–22 °Bx. Validate pH: target 2.2–2.8. This SKU runs the lowest pH in the portfolio — if below 2.0, add filtered water in 1 tbsp increments and retest. Do not proceed outside 19–23 °Bx.</li><li>Fill mold cavities to ~100g (3.5 oz). Tap 3–4 times to release air. Cover with plastic wrap. Freeze at 0–10°F for 12 hours minimum.</li><li>Unmold using cold water over mold base for 5 seconds. Melt validation: pour 2 oz blanco tequila — lime and agave bloom immediately, with salt emerging at 3–5 min. Full expression at 6–10 min.</li></ol>`,

  'BLM-CH-001': `<ol><li>Brew hibiscus tea strong: steep 3–4 tbsp dried hibiscus flowers in 3 cups water at 195°F (just off boiling) for 8–10 minutes. Strain completely. Tea should be a deep ruby-red — if it reads pink or pale, steep time was too short or hibiscus quantity too low; do not use. Cool fully to room temperature before blending.</li><li>Combine unsweetened cranberry juice, cooled hibiscus tea, and simple syrup. Whisk until uniform. Blend should be a deep, saturated ruby-red throughout — the most visually dramatic color in the portfolio. Any brown or purple tint indicates oxidized cranberry juice; use a fresh bottle.</li><li>Taste for balance: tart but not sharp, with a light floral note from hibiscus behind the cranberry. No single element should dominate. If the blend is too tart, add up to 2 tbsp additional simple syrup. If hibiscus is muted, the tea was too dilute — note for next batch.</li><li>Validate Brix: target 18–20 °Bx. Validate pH: target 2.8–3.4. Cranberry juice Brix varies significantly by brand — if using a new source, measure the juice alone first. Do not proceed outside 17–21 °Bx.</li><li>Fill mold cavities to ~100g (3.5 oz). Tap 3–4 times to release air. Cover with plastic wrap. Freeze at 0–10°F for 12 hours minimum.</li><li>Unmold using cold water over mold base for 5 seconds. Melt validation: pour 2 oz vodka — color bloom in the glass should be immediate and dramatic. Tart-floral aroma develops fully at 8–12 min.</li></ol>`,
}

async function updateInstructions() {
  const snap = await getDocs(collection(db, 'recipes'))
  const skusToUpdate = Object.keys(instructions)
  let updated = 0

  for (const d of snap.docs) {
    const sku = d.data().sku
    if (skusToUpdate.includes(sku)) {
      console.log(`[update] updating ${sku}...`)
      await updateDoc(doc(db, 'recipes', d.id), { recipe_body: instructions[sku] })
      updated++
    }
  }

  console.log(`[update] done — ${updated} recipes updated`)
  process.exit(0)
}

updateInstructions().catch(e => { console.error('[update] FAILED:', e); process.exit(1) })
