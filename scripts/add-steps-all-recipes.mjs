// Bulk migration: adds structured `steps` to all 28 recipes.
// Safe to re-run — updateDoc overwrites the steps array each time.
// Recipes with no prior recipe_body (the 4 original seeds) also get one.

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

// ── Reusable step builders ────────────────────────────────────────────────────

const fillStep = { phase: 'fill', order: 0, label: 'Fill molds', detail: 'Fill cavities to 100 g (3.5 oz). Tap 3–4× to release air. Cover with plastic wrap pressed to surface.', duration_min: 5 }
const freezeStep = { phase: 'freeze', order: 0, label: 'Freeze', detail: 'Freeze at 0–10°F for minimum 8 hours. Holds up to 2 weeks in a sealed container.' }

const validateStep = (brix, ph, extra = '') => ({
  phase: 'mix', order: 99,
  label: 'Validate Brix and pH',
  detail: `Target Brix ${brix}, pH ${ph}. Adjust with simple syrup (Brix low) or filtered water (Brix high).${extra ? ' ' + extra : ''}`,
  duration_min: 3,
})

const honeyPrepStep = (honeyMl, waterMl, order = 99) => ({
  phase: 'prep', order,
  label: 'Thin the honey',
  detail: `Warm ${honeyMl} ml raw honey until fully fluid. Add ${waterMl} ml warm water, stir smooth. Cool to room temperature before combining.`,
  duration_min: 5,
  ingredient_refs: ['Raw honey'],
})

const combineStep = (detail, order = 0) => ({ phase: 'mix', order, label: 'Combine ingredients', detail, duration_min: 3 })

// ── Recipe steps ──────────────────────────────────────────────────────────────

const RECIPES = [

  // ── BLM-HL-001  Honey Lemon ──────────────────────────────────────────────
  {
    sku: 'BLM-HL-001',
    steps: [
      { phase: 'prep', order: 0, label: 'Juice and strain lemons', detail: 'Squeeze fresh lemons through a fine-mesh strainer to yield 120 ml. Measure after straining.', duration_min: 5, ingredient_refs: ['Fresh lemon juice'] },
      honeyPrepStep(80, 40, 1),
      combineStep('Combine lemon juice, honey mixture, 2:1 simple syrup, and salt in a pitcher. Stir gently 30 seconds. Rest 2 minutes.'),
      validateStep('20–22', '2.4–3.0', 'Add lemon if pH above 3.0.'),
      fillStep,
      freezeStep,
    ],
    recipe_body: `<h3>1. Juice and Strain Lemons</h3>
<p>Squeeze fresh lemons through a <strong>fine-mesh strainer</strong> to yield <strong>120 ml</strong> juice.</p>
<h3>2. Thin the Honey</h3>
<p>Warm <strong>80 ml raw honey</strong> until fully fluid. Add <strong>40 ml warm water</strong> and stir smooth. Cool to room temperature.</p>
<h3>3. Combine Blend</h3>
<ul>
<li><p><strong>120 ml</strong> fresh lemon juice, strained</p></li>
<li><p>Honey mixture (full batch)</p></li>
<li><p><strong>60 ml</strong> 2:1 simple syrup</p></li>
<li><p><strong>0.1 tsp</strong> fine sea salt</p></li>
</ul>
<p>Stir gently 30 seconds. Rest 2 minutes before measuring.</p>
<h3>4. Validate Brix and pH</h3>
<p><strong>Brix target: 20–22. pH target: 2.4–3.0.</strong> Adjust simple syrup (Brix low) or water (Brix high). Add lemon if pH above 3.0.</p>
<h3>5. Fill Molds</h3>
<p>Fill to <strong>100 g (3.5 oz)</strong> per cavity. Tap 3–4×. Cover with plastic wrap.</p>
<h3>6. Freeze</h3>
<p>Freeze at <strong>0–10°F</strong> minimum <strong>8 hours</strong>.</p>`,
  },

  // ── BLM-RLP-001  Rosemary Lemon Peel ────────────────────────────────────
  {
    sku: 'BLM-RLP-001',
    steps: [
      { phase: 'prep', order: 0, label: 'Make rosemary syrup', detail: 'Steep 4–5 fresh rosemary sprigs in hot 1:1 simple syrup for 20 minutes. Strain and cool.', duration_min: 25 },
      { phase: 'prep', order: 1, label: 'Juice lemons and peel citrus', detail: 'Juice lemons through fine-mesh strainer. Peel long strips of lemon zest using a vegetable peeler; avoid white pith.', duration_min: 5 },
      combineStep('Combine lemon juice, rosemary syrup, lemon peel (steep 10 min then remove), and remaining ingredients. Stir gently.'),
      validateStep('12–15', '2.8–3.2', 'Lower Brix target than most — this is intentionally lighter-bodied for gin.'),
      fillStep,
      freezeStep,
    ],
    recipe_body: `<h3>1. Make Rosemary Syrup</h3>
<p>Steep <strong>4–5 fresh rosemary sprigs</strong> in hot 1:1 simple syrup for 20 minutes. Strain and cool completely.</p>
<h3>2. Prep Lemon</h3>
<p>Juice lemons through a fine-mesh strainer. Peel long strips of lemon zest using a vegetable peeler, avoiding white pith.</p>
<h3>3. Combine Blend</h3>
<p>Combine lemon juice, rosemary syrup, and remaining ingredients. Add lemon peel strips; steep 10 minutes, then remove. Stir gently.</p>
<h3>4. Validate Brix and pH</h3>
<p><strong>Brix target: 12–15</strong> (intentionally lighter than other expressions). <strong>pH target: 2.8–3.2.</strong></p>
<h3>5. Fill Molds</h3>
<p>Fill to <strong>100 g (3.5 oz)</strong> per cavity. Tap 3–4×. Cover with plastic wrap.</p>
<h3>6. Freeze</h3>
<p>Freeze at <strong>0–10°F</strong> minimum <strong>8 hours</strong>.</p>`,
  },

  // ── BLM-LA-001  Lime Agave ───────────────────────────────────────────────
  {
    sku: 'BLM-LA-001',
    steps: [
      { phase: 'prep', order: 0, label: 'Juice and strain limes', detail: 'Squeeze fresh limes through a fine-mesh strainer. Yield target volume.', duration_min: 5, ingredient_refs: ['Fresh lime juice'] },
      { phase: 'prep', order: 1, label: 'Thin the agave', detail: 'Warm agave nectar until fully fluid. Stir in a small amount of warm water to loosen. Cool before combining.', duration_min: 5, ingredient_refs: ['Agave nectar'] },
      combineStep('Combine lime juice, thinned agave, and remaining ingredients. Stir gently 30 seconds. Rest 2 minutes.'),
      validateStep('20–22', '2.2–2.8', 'Most acidic pH range in portfolio alongside Lime Ginger. Do not over-sweeten.'),
      fillStep,
      freezeStep,
    ],
    recipe_body: `<h3>1. Juice Limes</h3>
<p>Squeeze fresh limes through a fine-mesh strainer to yield target volume.</p>
<h3>2. Thin Agave</h3>
<p>Warm agave nectar until fluid. Add a small amount of warm water and stir smooth. Cool before combining.</p>
<h3>3. Combine Blend</h3>
<p>Combine lime juice, thinned agave, and remaining ingredients. Stir gently. Rest 2 minutes.</p>
<h3>4. Validate Brix and pH</h3>
<p><strong>Brix target: 20–22. pH target: 2.2–2.8.</strong> One of the most acidic expressions — do not over-correct upward.</p>
<h3>5. Fill Molds</h3>
<p>Fill to <strong>100 g (3.5 oz)</strong> per cavity. Tap 3–4×. Cover with plastic wrap.</p>
<h3>6. Freeze</h3>
<p>Freeze at <strong>0–10°F</strong> minimum <strong>8 hours</strong>.</p>`,
  },

  // ── BLM-CH-001  Cranberry Hibiscus ──────────────────────────────────────
  {
    sku: 'BLM-CH-001',
    steps: [
      { phase: 'prep', order: 0, label: 'Brew hibiscus tea', detail: 'Steep dried hibiscus flowers in hot water for 10–15 minutes. Strain and cool completely before combining.', duration_min: 20 },
      { phase: 'prep', order: 1, label: 'Measure cranberry juice Brix', detail: 'Test raw cranberry juice Brix before combining — unsweetened cranberry is very low (4–6), adjust syrup accordingly.', duration_min: 2 },
      combineStep('Combine cranberry juice, hibiscus tea, sweetener, and remaining ingredients. Stir gently. Color should be deep ruby-red.'),
      validateStep('18–20', '2.8–3.4', 'Cranberry pulls pH very low — taste and adjust before filling.'),
      fillStep,
      freezeStep,
    ],
    recipe_body: `<h3>1. Brew Hibiscus Tea</h3>
<p>Steep dried hibiscus flowers in hot water for 10–15 minutes. Strain and cool completely.</p>
<h3>2. Check Cranberry Brix</h3>
<p>Measure raw cranberry juice Brix — unsweetened cranberry is very low (4–6 °Bx). Adjust sweetener quantities accordingly.</p>
<h3>3. Combine Blend</h3>
<p>Combine cranberry juice, hibiscus tea, sweetener, and remaining ingredients. Stir gently. Color: deep ruby-red.</p>
<h3>4. Validate Brix and pH</h3>
<p><strong>Brix target: 18–20. pH target: 2.8–3.4.</strong></p>
<h3>5. Fill Molds</h3>
<p>Fill to <strong>100 g (3.5 oz)</strong> per cavity. Tap 3–4×. Cover with plastic wrap.</p>
<h3>6. Freeze</h3>
<p>Freeze at <strong>0–10°F</strong> minimum <strong>8 hours</strong>.</p>`,
  },

  // ── BLM-MJ-001  Mint Julep ───────────────────────────────────────────────
  {
    sku: 'BLM-MJ-001',
    steps: [
      { phase: 'prep', order: 0, label: 'Make mint simple syrup', detail: 'Steep 17–21 fresh spearmint leaves per 100 ml of 1:1 simple syrup needed (see session total above). Use hot syrup, steep 15 minutes, then strain through fine mesh. Use within 48 hours.', duration_min: 20, ingredient_refs: ['Mint-infused simple syrup'] },
      { phase: 'prep', order: 1, label: 'Juice lemons', detail: 'Squeeze fresh lemons through a fine-mesh strainer to yield target volume.', duration_min: 5 },
      combineStep('Combine lemon juice, mint syrup, and remaining ingredients. Stir gently. Pale gold with faint green tint.'),
      validateStep('18–21', '2.8–3.2'),
      fillStep,
      freezeStep,
    ],
    recipe_body: `<h3>1. Make Mint Simple Syrup</h3>
<p>Steep <strong>20–25 fresh spearmint leaves</strong> in hot 1:1 simple syrup for 15 minutes. Strain through fine mesh. Use within 48 hours — mint syrup fades quickly.</p>
<h3>2. Juice Lemons</h3>
<p>Squeeze fresh lemons through a fine-mesh strainer to yield target volume.</p>
<h3>3. Combine Blend</h3>
<p>Combine lemon juice, mint syrup, and remaining ingredients. Stir gently. Color: pale gold with faint green tint.</p>
<h3>4. Validate Brix and pH</h3>
<p><strong>Brix target: 18–21. pH target: 2.8–3.2.</strong></p>
<h3>5. Fill Molds</h3>
<p>Fill to <strong>100 g (3.5 oz)</strong> per cavity. Tap 3–4×. Cover with plastic wrap.</p>
<h3>6. Freeze</h3>
<p>Freeze at <strong>0–10°F</strong> minimum <strong>8 hours</strong>.</p>`,
  },

  // ── BLM-HD-001  Honey Deuce ──────────────────────────────────────────────
  {
    sku: 'BLM-HD-001',
    steps: [
      { phase: 'prep', order: 0, label: 'Press honeydew juice', detail: 'Cold-press or fresh-press ripe honeydew melon to yield 300 ml. Target honeydew Brix 10–12. Avoid heated concentrate.', duration_min: 10, ingredient_refs: ['Fresh honeydew melon juice'] },
      { phase: 'prep', order: 1, label: 'Juice lemons and strain raspberry', detail: 'Juice fresh lemons through fine-mesh strainer to yield 100 ml. Strain raspberry juice to yield 45 ml.', duration_min: 5 },
      honeyPrepStep(75, 30, 2),
      combineStep('Combine honeydew juice, lemon juice, raspberry juice, honey mixture, simple syrup, and salt. Stir gently. Color: pale blush-pink. Rest 3 minutes.'),
      validateStep('22–24', '2.8–3.2', 'If above 3.2, add a small splash of lemon juice.'),
      fillStep,
      freezeStep,
    ],
  },

  // ── BLM-OF-001  Old Fashioned ────────────────────────────────────────────
  {
    sku: 'BLM-OF-001',
    steps: [
      { phase: 'prep', order: 0, label: 'Juice oranges and peel zest', detail: 'Strain fresh orange juice to yield 240 ml. Cut 5 long zest strips using a vegetable peeler, avoiding white pith.', duration_min: 5, ingredient_refs: ['Fresh orange juice'] },
      combineStep('Combine orange juice, cherry juice, demerara syrup, bitters, and salt. Add orange zest strips; steep 10 minutes then remove before filling.', 0),
      validateStep('21–23', '3.2–3.6'),
      fillStep,
      freezeStep,
    ],
  },

  // ── BLM-WSC-001  Warm Spiced Cider ──────────────────────────────────────
  {
    sku: 'BLM-WSC-001',
    steps: [
      { phase: 'prep', order: 0, label: 'Make spiced demerara syrup', detail: 'Combine demerara syrup with cinnamon, nutmeg, cloves, and vanilla. Warm to 160°F, steep 15 minutes, strain through fine mesh. Cool completely.', duration_min: 25 },
      { phase: 'prep', order: 1, label: 'Juice lemons', detail: 'Squeeze fresh lemons through fine-mesh strainer to yield 30 ml.', duration_min: 3 },
      combineStep('Combine apple cider, lemon juice, spiced demerara syrup, and salt. Stir gently. Aroma should be warm and bakery-spice.'),
      validateStep('21–23', '3.2–3.6'),
      fillStep,
      freezeStep,
    ],
  },

  // ── BLM-WM-001  Watermelon Honey ────────────────────────────────────────
  {
    sku: 'BLM-WM-001',
    steps: [
      { phase: 'prep', order: 0, label: 'Press watermelon juice', detail: 'Blend ~2 lbs seedless watermelon and strain through fine mesh to yield 360 ml. Measure raw Brix — ripe watermelon runs 8–12.', duration_min: 10, ingredient_refs: ['Fresh watermelon juice'] },
      { phase: 'prep', order: 1, label: 'Juice and strain lemons', detail: 'Squeeze fresh lemons through fine-mesh strainer to yield 90 ml.', duration_min: 5 },
      honeyPrepStep(75, 30, 2),
      combineStep('Combine watermelon juice, lemon juice, honey mixture, simple syrup, and salt. Optional: steep 3–4 fresh basil leaves 5 minutes then remove. Rest 3 minutes. Color: pale pink to coral.'),
      validateStep('22–24', '3.0–3.4'),
      fillStep,
      freezeStep,
    ],
  },

  // ── BLM-LG-001  Lime Ginger ──────────────────────────────────────────────
  {
    sku: 'BLM-LG-001',
    steps: [
      { phase: 'prep', order: 0, label: 'Extract ginger juice', detail: 'Grate ~60 g fresh ginger (unpeeled). Press through fine-mesh cloth or strainer to yield 45 ml juice. Pungent and intense.', duration_min: 10, ingredient_refs: ['Fresh ginger juice'] },
      { phase: 'prep', order: 1, label: 'Juice and strain limes', detail: 'Squeeze fresh limes through fine-mesh strainer to yield 240 ml.', duration_min: 5, ingredient_refs: ['Fresh lime juice'] },
      honeyPrepStep(75, 30, 2),
      combineStep('Combine lime juice, ginger juice, honey mixture, simple syrup, filtered water, and salt. Stir gently. Color: pale gold-green. Very aromatic.'),
      validateStep('21–23', '2.4–2.9', 'Most acidic expression in the portfolio. Dilute with water rather than correcting with sweetener if pH is below 2.4.'),
      fillStep,
      freezeStep,
    ],
  },

  // ── BLM-HTD-001  Hot Toddy ───────────────────────────────────────────────
  {
    sku: 'BLM-HTD-001',
    steps: [
      { phase: 'prep', order: 0, label: 'Make spiced honey syrup', detail: 'Warm 90 ml raw honey with cinnamon, cloves, and allspice at 150°F for 10 minutes. Add 45 ml warm water, stir smooth. Cool completely.', duration_min: 20, ingredient_refs: ['Raw honey'] },
      { phase: 'prep', order: 1, label: 'Juice and strain lemons', detail: 'Squeeze fresh lemons through fine-mesh strainer to yield 120 ml.', duration_min: 5, ingredient_refs: ['Fresh lemon juice'] },
      combineStep('Combine lemon juice, spiced honey syrup, simple syrup, filtered water, and salt. Stir gently.'),
      validateStep('21–23', '2.6–3.0'),
      fillStep,
      freezeStep,
    ],
  },

  // ── BLM-SWC-001  Sweetheart Cherry ──────────────────────────────────────
  {
    sku: 'BLM-SWC-001',
    steps: [
      honeyPrepStep(60, 30, 0),
      { phase: 'prep', order: 1, label: 'Juice and strain lemons', detail: 'Squeeze fresh lemons through fine-mesh strainer to yield 60 ml.', duration_min: 3 },
      combineStep('Combine tart cherry juice, lemon juice, honey mixture, simple syrup, vanilla extract, filtered water, and salt. Stir gently. Color: deep ruby-red.'),
      validateStep('21–23', '3.0–3.4'),
      fillStep,
      freezeStep,
    ],
  },

  // ── BLM-TRF-001  Transfusion ─────────────────────────────────────────────
  {
    sku: 'BLM-TRF-001',
    steps: [
      { phase: 'prep', order: 0, label: 'Extract ginger juice', detail: 'Grate ~60 g fresh ginger (unpeeled). Press through fine-mesh cloth to yield 45 ml.', duration_min: 10, ingredient_refs: ['Fresh ginger juice'] },
      { phase: 'prep', order: 1, label: 'Juice and strain limes', detail: 'Squeeze fresh limes through fine-mesh strainer to yield 90 ml.', duration_min: 5 },
      honeyPrepStep(60, 25, 2),
      combineStep('Combine Concord grape juice, lime juice, ginger juice, honey mixture, simple syrup, and salt. Stir gently. Color: deep purple. Rest 3 minutes. Measure grape Brix before combining — Concord varies 14–18 by brand.'),
      validateStep('22–24', '2.8–3.2'),
      fillStep,
      freezeStep,
    ],
  },

  // ── BLM-AZL-001  Azalea ──────────────────────────────────────────────────
  {
    sku: 'BLM-AZL-001',
    steps: [
      { phase: 'prep', order: 0, label: 'Measure juice Brix', detail: 'Test Brix of both pineapple juice and pomegranate juice before combining — both vary significantly by brand and batch.', duration_min: 3 },
      { phase: 'prep', order: 1, label: 'Juice and strain lemons', detail: 'Squeeze fresh lemons through fine-mesh strainer to yield 90 ml.', duration_min: 5 },
      honeyPrepStep(60, 30, 2),
      combineStep('Combine pineapple juice, lemon juice, pomegranate juice, honey mixture, simple syrup, and salt. Stir gently. Color: deep pink-red.'),
      validateStep('21–23', '2.8–3.2'),
      fillStep,
      freezeStep,
    ],
  },

  // ── BLM-GSB-001  Garden Strawberry ──────────────────────────────────────
  {
    sku: 'BLM-GSB-001',
    steps: [
      { phase: 'prep', order: 0, label: 'Make basil simple syrup', detail: 'Steep 10 fresh basil leaves in 90 ml hot 1:1 simple syrup for 20 minutes. Strain through fine mesh. Cool completely.', duration_min: 25, ingredient_refs: ['Basil-infused 1:1 simple syrup'] },
      { phase: 'prep', order: 1, label: 'Press strawberry juice', detail: 'Blend ~400 g fresh strawberries. Strain through fine-mesh to yield 300 ml. Measure raw Brix — overripe fruit runs higher.', duration_min: 10, ingredient_refs: ['Fresh strawberry juice'] },
      honeyPrepStep(60, 30, 2),
      { phase: 'prep', order: 3, label: 'Juice and strain lemons', detail: 'Squeeze fresh lemons through fine-mesh strainer to yield 75 ml.', duration_min: 3 },
      combineStep('Combine strawberry juice, lemon juice, honey mixture, basil syrup, and salt. Stir gently. Color: bright red-pink.'),
      validateStep('21–23', '2.8–3.2', 'Strawberry Brix ranges 7–9 — adjust syrup accordingly.'),
      fillStep,
      freezeStep,
    ],
  },

  // ── BLM-SBR-001  Summer Berry ────────────────────────────────────────────
  {
    sku: 'BLM-SBR-001',
    steps: [
      { phase: 'prep', order: 0, label: 'Blend and measure berry juice', detail: 'Combine blueberry (40%), blackberry (35%), and raspberry (25%) juices to yield 300 ml blend. Measure Brix before adding sweeteners.', duration_min: 5, ingredient_refs: ['Mixed berry juice'] },
      { phase: 'prep', order: 1, label: 'Juice and strain lemons', detail: 'Squeeze fresh lemons through fine-mesh strainer to yield 90 ml.', duration_min: 5 },
      honeyPrepStep(60, 30, 2),
      combineStep('Combine berry juice, lemon juice, honey mixture, simple syrup, and salt. Stir gently. Color: deep blue-purple to dark red.'),
      validateStep('21–23', '2.6–3.0'),
      fillStep,
      freezeStep,
    ],
  },

  // ── BLM-BD-001  Brown Derby ──────────────────────────────────────────────
  {
    sku: 'BLM-BD-001',
    steps: [
      { phase: 'prep', order: 0, label: 'Juice and strain grapefruit', detail: 'Juice Ruby Red grapefruit through fine-mesh strainer to yield 390 ml. Measure raw Brix first — grapefruit varies widely by season and variety.', duration_min: 10, ingredient_refs: ['Fresh grapefruit juice'] },
      { phase: 'prep', order: 1, label: 'Juice lemons', detail: 'Squeeze fresh lemons through fine-mesh strainer to yield 45 ml.', duration_min: 3 },
      honeyPrepStep(90, 45, 2),
      combineStep('Combine grapefruit juice, lemon juice, honey mixture, simple syrup, and salt. Stir gently. Color: pale gold-pink (Ruby Red) or pale amber (white grapefruit).'),
      validateStep('21–23', '3.0–3.4'),
      fillStep,
      freezeStep,
    ],
  },

  // ── BLM-HPA-001  Harvest Apple ───────────────────────────────────────────
  {
    sku: 'BLM-HPA-001',
    steps: [
      { phase: 'prep', order: 0, label: 'Measure cider Brix', detail: 'Test fresh-pressed apple cider Brix before combining — ranges 10–15+ depending on apple variety and season.', duration_min: 2 },
      honeyPrepStep(75, 30, 1),
      { phase: 'prep', order: 2, label: 'Juice lemons', detail: 'Squeeze fresh lemons through fine-mesh strainer to yield 45 ml.', duration_min: 3 },
      combineStep('Combine apple cider, lemon juice, honey mixture, cinnamon, nutmeg, and salt. Stir gently. Rest 5 minutes to hydrate spices fully before measuring.'),
      validateStep('21–23', '3.0–3.4', 'Tap molds extra firmly — spices can introduce bubbles.'),
      fillStep,
      freezeStep,
    ],
  },

  // ── BLM-SPC-001  Spiced Cider ────────────────────────────────────────────
  {
    sku: 'BLM-SPC-001',
    steps: [
      { phase: 'prep', order: 0, label: 'Make spiced demerara syrup', detail: 'Combine 120 ml demerara syrup with cinnamon, cloves, allspice, and nutmeg. Warm to 160°F, steep 15 minutes, strain through fine mesh. Cool completely.', duration_min: 25 },
      { phase: 'prep', order: 1, label: 'Juice oranges and lemons', detail: 'Juice oranges through fine-mesh strainer to yield 90 ml. Juice lemons to yield 30 ml.', duration_min: 5 },
      combineStep('Combine apple cider, orange juice, lemon juice, spiced demerara syrup, and salt. Stir gently. Color: deep amber.'),
      validateStep('21–23', '3.2–3.6'),
      fillStep,
      freezeStep,
    ],
  },

  // ── BLM-CRO-001  Cranberry Orange ───────────────────────────────────────
  {
    sku: 'BLM-CRO-001',
    steps: [
      honeyPrepStep(60, 30, 0),
      { phase: 'prep', order: 1, label: 'Juice oranges and lemons', detail: 'Juice oranges through fine-mesh strainer to yield 120 ml. Juice lemons to yield 30 ml.', duration_min: 5 },
      combineStep('Combine cranberry juice, orange juice, lemon juice, honey mixture, simple syrup, cinnamon, and salt. Stir gently. Color: deep ruby-red. Note: unsweetened cranberry Brix is very low (4–6) — do not omit simple syrup.'),
      validateStep('21–23', '2.8–3.2'),
      fillStep,
      freezeStep,
    ],
  },

  // ── BLM-WAS-001  Wassail ─────────────────────────────────────────────────
  {
    sku: 'BLM-WAS-001',
    steps: [
      { phase: 'prep', order: 0, label: 'Make holiday spiced syrup', detail: 'Combine 60 ml demerara syrup with cinnamon, cloves, allspice, and 2 whole star anise. Warm to 160°F, steep 15 minutes. Remove star anise; strain. Cool completely.', duration_min: 25 },
      honeyPrepStep(60, 30, 1),
      { phase: 'prep', order: 2, label: 'Juice oranges and lemons', detail: 'Juice oranges to yield 90 ml. Juice lemons to yield 30 ml. Strain both through fine mesh.', duration_min: 5 },
      combineStep('Combine apple cider, cranberry juice, orange juice, lemon juice, honey mixture, spiced demerara syrup, and salt. Stir gently. Color: deep garnet-red.'),
      validateStep('21–23', '3.0–3.4', 'Cranberry pulls pH down; orange and apple soften it. Taste before adjusting.'),
      fillStep,
      freezeStep,
    ],
  },

  // ── BLM-BHL-001  Blueberry Honey Lemon ──────────────────────────────────
  {
    sku: 'BLM-BHL-001',
    steps: [
      { phase: 'prep', order: 0, label: 'Juice and strain lemons', detail: 'Squeeze fresh lemons through a fine-mesh strainer to yield 268 ml.', duration_min: 8, ingredient_refs: ['Fresh lemon juice'] },
      { phase: 'prep', order: 1, label: 'Thin the honey', detail: 'Warm 268 ml raw honey gently — do not exceed 120°F. Add 101 ml warm water, stir until smooth with no streaks. Cool to room temperature.', duration_min: 8, ingredient_refs: ['Raw honey'] },
      combineStep('Combine blueberry juice, lemon juice, honey mixture, simple syrup, and salt. Stir gently. Color: deep blue-purple. Rest 3 minutes before measuring.'),
      validateStep('23–24', '2.6–3.0', 'If above Brix 25, dilute with filtered water 1 tbsp at a time.'),
      fillStep,
      freezeStep,
    ],
  },

  // ── BLM-PBS-001  Pineapple Brown Sugar ──────────────────────────────────
  {
    sku: 'BLM-PBS-001',
    steps: [
      { phase: 'prep', order: 0, label: 'Measure pineapple Brix', detail: 'Test Brix of pineapple juice before combining — not-from-concentrate varies by batch. Adjust syrup accordingly.', duration_min: 2 },
      { phase: 'prep', order: 1, label: 'Juice and strain limes', detail: 'Squeeze fresh limes through fine-mesh strainer to yield 60 ml.', duration_min: 3 },
      combineStep('Combine pineapple juice, lime juice, demerara syrup, vanilla extract, and salt. Stir gently. Color: pale gold, nearly clear. Rest 3 minutes.'),
      validateStep('21–23', '3.0–3.4', 'If below 3.0, add a small splash of filtered water.'),
      fillStep,
      freezeStep,
    ],
  },

  // ── BLM-DKS-001  Dark & Stormy ──────────────────────────────────────────
  {
    sku: 'BLM-DKS-001',
    steps: [
      { phase: 'prep', order: 0, label: 'Prepare molasses-demerara blend', detail: 'Warm 15 ml blackstrap molasses until fully pourable. Stir into 150 ml demerara syrup until fully integrated. Do not add cold molasses directly to cold juice.', duration_min: 8, ingredient_refs: ['Blackstrap molasses', 'Demerara simple syrup'] },
      { phase: 'prep', order: 1, label: 'Extract ginger juice', detail: 'Grate ~120 g fresh ginger (unpeeled) — most ginger of any recipe. Press through fine-mesh cloth to yield 90 ml.', duration_min: 15, ingredient_refs: ['Fresh ginger juice'] },
      { phase: 'prep', order: 2, label: 'Juice and strain limes', detail: 'Squeeze fresh limes through fine-mesh strainer to yield 120 ml.', duration_min: 5 },
      combineStep('Combine lime juice, ginger juice, molasses-demerara blend, filtered water, and salt. Stir gently. Color: deep amber-brown — darkest in portfolio. Rest 3 minutes.'),
      validateStep('21–23', '2.6–3.0', 'Do not add more molasses to adjust Brix — use simple syrup instead.'),
      fillStep,
      freezeStep,
    ],
  },

  // ── BLM-ML-001  Mint Lemonade ────────────────────────────────────────────
  {
    sku: 'BLM-ML-001',
    steps: [
      { phase: 'prep', order: 0, label: 'Make mint simple syrup', detail: 'Steep 17–21 fresh spearmint leaves per 100 ml of 1:1 simple syrup needed (see session total above). Use hot syrup, steep 15 minutes, then strain through fine mesh. Use within 48 hours.', duration_min: 20, ingredient_refs: ['Mint-infused 1:1 simple syrup'] },
      { phase: 'prep', order: 1, label: 'Juice and strain lemons', detail: 'Squeeze fresh lemons through fine-mesh strainer to yield 240 ml.', duration_min: 8, ingredient_refs: ['Fresh lemon juice'] },
      honeyPrepStep(45, 20, 2),
      combineStep('Combine lemon juice, mint syrup, honey mixture, filtered water, and salt. Stir gently. Color: pale yellow-green. Rest 3 minutes.'),
      validateStep('21–23', '2.4–2.8', 'If below 2.4, dilute with a small amount of water.'),
      fillStep,
      freezeStep,
    ],
  },

  // ── BLM-SLN-001  Strawberry Lemonade ────────────────────────────────────
  {
    sku: 'BLM-SLN-001',
    steps: [
      { phase: 'prep', order: 0, label: 'Press strawberry juice', detail: 'Blend ~270 g fresh strawberries. Strain through fine-mesh to yield 200 ml. Measure raw Brix — overripe fruit runs higher.', duration_min: 10, ingredient_refs: ['Fresh strawberry juice'] },
      { phase: 'prep', order: 1, label: 'Juice and strain lemons', detail: 'Squeeze fresh lemons through fine-mesh strainer to yield 150 ml.', duration_min: 5 },
      honeyPrepStep(60, 25, 2),
      combineStep('Combine strawberry juice, lemon juice, honey mixture, simple syrup, and salt. Stir gently. Color: bright coral-pink. Rest 3 minutes.'),
      validateStep('21–23', '2.8–3.2'),
      fillStep,
      freezeStep,
    ],
  },

  // ── BLM-SML-001  Strawberry Mint Lemonade ───────────────────────────────
  {
    sku: 'BLM-SML-001',
    steps: [
      { phase: 'prep', order: 0, label: 'Make mint simple syrup', detail: 'Steep 17–21 fresh spearmint leaves per 100 ml of 1:1 simple syrup needed (see session total above). Use hot syrup, steep 15 minutes, then strain through fine mesh. Use within 48 hours.', duration_min: 20, ingredient_refs: ['Mint-infused 1:1 simple syrup'] },
      { phase: 'prep', order: 1, label: 'Press strawberry juice', detail: 'Blend ~240 g fresh strawberries. Strain through fine-mesh to yield 180 ml.', duration_min: 10, ingredient_refs: ['Fresh strawberry juice'] },
      honeyPrepStep(35, 15, 2),
      { phase: 'prep', order: 3, label: 'Juice and strain lemons', detail: 'Squeeze fresh lemons through fine-mesh strainer to yield 120 ml.', duration_min: 5 },
      combineStep('Combine strawberry juice, lemon juice, mint syrup, honey mixture, and salt. Stir gently. Color: vivid rose-pink. Rest 3 minutes.'),
      validateStep('21–23', '2.6–3.0', 'If above 3.0, add lemon juice 1 tsp at a time.'),
      fillStep,
      freezeStep,
    ],
  },

  // ── BLM-HSB-001  Honey Shrub ─────────────────────────────────────────────
  {
    sku: 'BLM-HSB-001',
    steps: [
      honeyPrepStep(75, 30, 0),
      { phase: 'prep', order: 1, label: 'Juice and strain lemons', detail: 'Squeeze fresh lemons through fine-mesh strainer to yield 75 ml.', duration_min: 3 },
      combineStep('Combine lemon juice, raw apple cider vinegar, honey mixture, simple syrup, filtered water, and salt. Stir gently. Color: pale gold, slightly hazy from ACV (disappears on freezing). Rest 3 minutes.'),
      validateStep('21–23', '2.8–3.2', 'Two acid sources (lemon + ACV). If below 2.8, dilute with water rather than adding sweetener.'),
      fillStep,
      freezeStep,
    ],
  },
]

// ── Run ───────────────────────────────────────────────────────────────────────

async function run() {
  let updated = 0, skipped = 0, missing = 0

  for (const { sku, steps, recipe_body } of RECIPES) {
    const snap = await getDocs(query(collection(db, 'recipes'), where('sku', '==', sku)))
    if (snap.empty) {
      console.warn(`  MISSING: ${sku} — no document found`)
      missing++
      continue
    }
    if (snap.size > 1) {
      console.warn(`  DUPE: ${sku} has ${snap.size} documents — updating first`)
    }

    const ref = doc(db, 'recipes', snap.docs[0].id)
    const updateData = { steps }
    if (recipe_body != null) updateData.recipe_body = recipe_body

    await updateDoc(ref, updateData)
    const name = snap.docs[0].data().expression ?? sku
    console.log(`  ✓ ${sku}  ${name}  (${steps.length} steps)`)
    updated++
  }

  console.log(`\nDone. Updated: ${updated}  Skipped: ${skipped}  Missing: ${missing}`)
  process.exit(0)
}

run().catch(e => { console.error(e); process.exit(1) })
