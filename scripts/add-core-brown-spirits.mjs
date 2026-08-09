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

// ── Hot Buttered Rum note ─────────────────────────────────────────────────────
// Butter cannot be frozen into a cube. Fat separates from the water matrix and
// releases as an oily slick when the cube melts. "Warm Spiced Cider" (BLM-WSC-001)
// captures the core HBR flavor profile — warm spice, brown sugar, apple — without
// the fat problem. It is NOT called Hot Buttered Rum since it genuinely isn't one.
// ─────────────────────────────────────────────────────────────────────────────

const RECIPES = [

  // ── Honey Deuce ─────────────────────────────────────────────────────────────
  {
    recipe: {
      sku: 'BLM-HD-001',
      expression: 'Honey Deuce',
      version: '1.0',
      status: 'seasonal',
      spirit_pairing: 'Bourbon',
      brix_min: 22, brix_max: 24,
      ph_min: 2.8, ph_max: 3.2,
      melt_min: 5, melt_max: 8,
      season_month: 8,
      notes: `August seasonal — inspired by the official US Open tennis cocktail (Grey Goose, lemonade, Chambord, honeydew melon balls). Honeydew juice provides a delicate, almost floral sweetness that bridges to bourbon. Raspberry adds the signature blush color and tartness. Honey replaces the original cocktail's simple sweetness with depth.

SPIRIT PAIRINGS
• Primary: Bourbon — wheat-forward (Weller, Maker's) or high-rye (Bulleit, Four Roses)
• Secondary: Rye — pepper note plays against melon sweetness well
• The original US Open cocktail uses vodka; this cube is engineered for brown spirits

JUICE NOTES
Honeydew: press fresh or use cold-pressed. Avoid heated concentrate — flavor degrades significantly. Target a ripe, summer honeydew (Brix 10–12 at peak). Raspberry: 100% juice or thin strained puree. Chambord can substitute 1:1 for a portion of the raspberry for authenticity.`,
      recipe_body: `<h3>1. Prepare Honey Mixture</h3>
<p>Warm <strong>75 ml raw honey</strong> until fully fluid. Add <strong>30 ml warm water</strong> and stir smooth. Cool to room temperature.</p>
<h3>2. Combine Blend</h3>
<p>In a measuring pitcher, combine:</p>
<ul>
<li><p><strong>300 ml</strong> fresh honeydew melon juice (cold-pressed or fresh-pressed)</p></li>
<li><p><strong>100 ml</strong> fresh lemon juice, strained</p></li>
<li><p><strong>45 ml</strong> raspberry juice, strained (or Chambord)</p></li>
<li><p>Honey mixture from Step 1 (full batch)</p></li>
<li><p><strong>90 ml</strong> 1:1 simple syrup</p></li>
<li><p><strong>0.1 tsp</strong> fine sea salt</p></li>
</ul>
<p>Stir gently. Blend should be pale blush-pink. Rest 3 minutes before measuring.</p>
<h3>3. Validate Brix and pH</h3>
<p><strong>Brix target: 22–24.</strong> If low, add simple syrup 1 tbsp at a time. If high, add filtered water 1 tbsp at a time. <strong>pH target: 2.8–3.2.</strong> If above 3.2, add a small splash of lemon juice.</p>
<h3>4. Fill and Freeze</h3>
<p>Fill mold cavities to <strong>100 g (3.5 oz)</strong>. Tap 3–4 times to release air. Cover with plastic wrap pressed to surface. Freeze at 0–10°F for a minimum of <strong>8 hours</strong>.</p>
<h3>5. Unmold and Validate</h3>
<p>Release with 5-second cold water over mold base. Cube should be pale blush with a subtle pink tint. <strong>Melt validation:</strong> pour 2 oz bourbon neat. Honeydew and lemon aroma bloom within 30 seconds. Honey and raspberry at 2–3 min. Full fruit-spirit balance at <strong>5–8 min</strong>.</p>`,
    },
    ingredients: [
      { name: 'Fresh honeydew melon juice (cold-pressed or fresh-pressed)', amount: 300, unit: 'ml', sort_order: 0 },
      { name: 'Fresh lemon juice, strained',                                amount: 100, unit: 'ml', sort_order: 1 },
      { name: 'Raspberry juice, strained (or Chambord)',                    amount: 45,  unit: 'ml', sort_order: 2 },
      { name: 'Raw honey',                                                  amount: 75,  unit: 'ml', sort_order: 3 },
      { name: 'Warm water (to loosen honey)',                               amount: 30,  unit: 'ml', sort_order: 4 },
      { name: '1:1 simple syrup',                                           amount: 90,  unit: 'ml', sort_order: 5 },
      { name: 'Fine sea salt',                                              amount: 0.1, unit: 'tsp', sort_order: 6 },
    ],
  },

  // ── Old Fashioned ────────────────────────────────────────────────────────────
  {
    recipe: {
      sku: 'BLM-OF-001',
      expression: 'Old Fashioned',
      version: '1.0',
      status: 'active',
      spirit_pairing: 'Bourbon',
      brix_min: 21, brix_max: 23,
      ph_min: 3.2, ph_max: 3.6,
      melt_min: 5, melt_max: 8,
      notes: `Old Fashioned-inspired cube: fresh orange juice, maraschino cherry juice, demerara simple syrup, and Angostura bitters. Designed to complement the cocktail — the cube provides the fruit, sweetness, and bitters elements while the spirit provides the backbone.

SPIRIT PAIRINGS
• Primary: Bourbon (high-proof: Buffalo Trace, Eagle Rare, Elijah Craig Small Batch)
• Secondary: Rye — pepper-spice of rye plays against orange and bitters
• Tertiary: Aged rum — demerara syrup echoes rum's native flavor profile

PROCESS NOTES
Use fresh-squeezed orange juice. Demerara (turbinado) simple syrup adds depth white sugar cannot replicate. Angostura bitters: small amount for aromatic complexity — this is not a bitters cube. Orange zest infusion: steep 4–5 strips in the finished blend for 10 minutes, then remove before filling molds. This step is critical for the characteristic orange-oil aroma.`,
      recipe_body: `<h3>1. Combine Blend</h3>
<p>In a measuring pitcher, combine:</p>
<ul>
<li><p><strong>240 ml</strong> fresh orange juice, strained</p></li>
<li><p><strong>45 ml</strong> maraschino or Luxardo cherry juice</p></li>
<li><p><strong>120 ml</strong> demerara simple syrup (1:1)</p></li>
<li><p><strong>0.5 tsp</strong> Angostura bitters</p></li>
<li><p><strong>0.1 tsp</strong> fine sea salt</p></li>
</ul>
<p>Add <strong>4–5 strips fresh orange zest</strong>. Stir gently. Steep 10 minutes. Remove zest before filling.</p>
<h3>2. Validate Brix and pH</h3>
<p><strong>Brix target: 21–23.</strong> If low, add demerara syrup 1 tbsp at a time. If high, dilute with filtered water 1 tbsp at a time. <strong>pH target: 3.2–3.6.</strong> Orange is less acidic than lemon. If below 3.2, add a small squeeze of fresh lemon juice and re-check.</p>
<h3>3. Fill and Freeze</h3>
<p>Fill mold cavities to <strong>100 g (3.5 oz)</strong>. Tap 3–4 times to release air. Cover with plastic wrap. Freeze at 0–10°F for a minimum of <strong>8 hours</strong>.</p>
<h3>4. Unmold and Validate</h3>
<p>Cube will be amber-orange, nearly transparent. <strong>Melt validation:</strong> pour 2 oz bourbon neat. Orange and bitters aroma bloom immediately. Cherry sweetness and demerara depth at 3–5 min. Full Old Fashioned profile at <strong>5–8 min</strong>.</p>`,
    },
    ingredients: [
      { name: 'Fresh orange juice, strained',              amount: 240, unit: 'ml',  sort_order: 0 },
      { name: 'Maraschino or Luxardo cherry juice',        amount: 45,  unit: 'ml',  sort_order: 1 },
      { name: 'Demerara simple syrup (1:1)',               amount: 120, unit: 'ml',  sort_order: 2 },
      { name: 'Angostura bitters',                         amount: 0.5, unit: 'tsp', sort_order: 3 },
      { name: 'Orange zest strips (steep 10 min, remove)', amount: 5,   unit: 'ct',  sort_order: 4 },
      { name: 'Fine sea salt',                             amount: 0.1, unit: 'tsp', sort_order: 5 },
    ],
  },

  // ── Warm Spiced Cider (HBR alternative) ─────────────────────────────────────
  {
    recipe: {
      sku: 'BLM-WSC-001',
      expression: 'Warm Spiced Cider',
      version: '1.0',
      status: 'active',
      spirit_pairing: 'Bourbon',
      brix_min: 21, brix_max: 23,
      ph_min: 3.2, ph_max: 3.6,
      melt_min: 5, melt_max: 8,
      notes: `Hot Buttered Rum-inspired alternative. Butter cannot be incorporated into a freezable cube — fat separates from the water phase and releases as an oily slick when melted. This formula captures the HBR flavor profile (warm spice, brown sugar, baking aromatics) using apple cider as the liquid base and demerara syrup for the brown-sugar depth.

Not marketed as Hot Buttered Rum — called what it is.

SPIRIT PAIRINGS
• Primary: Bourbon (wheated: Weller Antique, Larceny Barrel Proof)
• Secondary: Aged rum — ironically, this cube works well with actual rum for an HBR-adjacent experience
• Tertiary: Dark rye — spice load stacks with rye's natural pepper

PROCESS NOTES
Steep dry spices in warm demerara syrup at 160°F max for 15 minutes — do not boil, which drives off volatile aromatics. Strain through fine mesh before combining with cider. Fresh-pressed apple cider (not filtered juice) has more pectin and complexity.`,
      recipe_body: `<h3>1. Make Spiced Demerara Syrup</h3>
<p>Combine <strong>120 ml demerara simple syrup (1:1)</strong> with <strong>0.75 tsp ground cinnamon</strong>, <strong>0.25 tsp ground nutmeg</strong>, <strong>0.15 tsp ground cloves</strong>, and <strong>0.5 tsp vanilla extract</strong>. Warm to 160°F and steep 15 minutes. Strain through fine mesh. Cool to room temperature.</p>
<h3>2. Combine Blend</h3>
<p>In a measuring pitcher, combine:</p>
<ul>
<li><p><strong>300 ml</strong> fresh-pressed apple cider (not filtered juice)</p></li>
<li><p><strong>30 ml</strong> fresh lemon juice</p></li>
<li><p>Spiced demerara syrup from Step 1 (full batch)</p></li>
<li><p><strong>0.1 tsp</strong> fine sea salt</p></li>
</ul>
<p>Stir gently. Aroma should be warm and bakery-spice forward.</p>
<h3>3. Validate Brix and pH</h3>
<p><strong>Brix target: 21–23.</strong> If low, add plain demerara syrup 1 tbsp at a time. <strong>pH target: 3.2–3.6.</strong> If below 3.2, dilute with 1 tbsp filtered water.</p>
<h3>4. Fill and Freeze</h3>
<p>Fill mold cavities to <strong>100 g (3.5 oz)</strong>. Tap 3–4 times to release air. Cover with plastic wrap. Freeze at 0–10°F for a minimum of <strong>8 hours</strong>.</p>
<h3>5. Unmold and Validate</h3>
<p>Cube will be amber-gold, nearly clear. <strong>Melt validation:</strong> pour 2 oz bourbon neat. Cinnamon, vanilla, and apple aroma bloom within 1 minute. Full warm-spice and spirit integration at <strong>5–8 min</strong>.</p>`,
    },
    ingredients: [
      { name: 'Fresh-pressed apple cider (not filtered juice)', amount: 300,  unit: 'ml',  sort_order: 0 },
      { name: 'Fresh lemon juice',                              amount: 30,   unit: 'ml',  sort_order: 1 },
      { name: 'Demerara simple syrup (1:1)',                    amount: 120,  unit: 'ml',  sort_order: 2 },
      { name: 'Ground cinnamon',                                amount: 0.75, unit: 'tsp', sort_order: 3 },
      { name: 'Ground nutmeg',                                  amount: 0.25, unit: 'tsp', sort_order: 4 },
      { name: 'Ground cloves',                                  amount: 0.15, unit: 'tsp', sort_order: 5 },
      { name: 'Vanilla extract',                                amount: 0.5,  unit: 'tsp', sort_order: 6 },
      { name: 'Fine sea salt',                                  amount: 0.1,  unit: 'tsp', sort_order: 7 },
    ],
  },

  // ── Watermelon Honey ─────────────────────────────────────────────────────────
  {
    recipe: {
      sku: 'BLM-WM-001',
      expression: 'Watermelon Honey',
      version: '1.0',
      status: 'active',
      spirit_pairing: 'Bourbon',
      brix_min: 22, brix_max: 24,
      ph_min: 3.0, ph_max: 3.4,
      melt_min: 5, melt_max: 8,
      notes: `Fresh watermelon juice with honey and lemon — a clean summer cube for brown spirits. Watermelon's high water content (92%) and natural sweetness (9–11 Brix at peak) pair exceptionally well with honey. Lemon provides the acid lift that keeps the melon from reading as flat.

SPIRIT PAIRINGS
• Primary: Bourbon — wheated bourbons amplify melon sweetness; high-rye adds a pepper counterpoint
• Secondary: Tennessee whiskey — smooth corn-forward profile complements the melon
• Tertiary: Aged white whiskey — lighter, more refreshing result

PROCESS NOTES
Juice fresh watermelon by blending and straining through cheesecloth or fine mesh. Ripe red-flesh watermelon yields significantly more Brix than underripe — measure raw juice Brix before adding sweeteners and adjust quantities accordingly. Optional: steep 3–4 fresh basil leaves for 5 minutes for an herbaceous accent.`,
      recipe_body: `<h3>1. Press Watermelon Juice</h3>
<p>Blend <strong>~2 lbs seedless watermelon</strong> and strain through fine mesh or cheesecloth to yield <strong>360 ml clear juice</strong>. Measure Brix of raw juice — adjust sweetener quantities if it falls outside 9–11 Brix.</p>
<h3>2. Prepare Honey Mixture</h3>
<p>Warm <strong>75 ml raw honey</strong> until fluid. Add <strong>30 ml warm water</strong> and stir smooth. Cool to room temperature.</p>
<h3>3. Combine Blend</h3>
<p>In a measuring pitcher, combine:</p>
<ul>
<li><p><strong>360 ml</strong> fresh watermelon juice</p></li>
<li><p><strong>90 ml</strong> fresh lemon juice, strained</p></li>
<li><p>Honey mixture from Step 2 (full batch)</p></li>
<li><p><strong>90 ml</strong> 1:1 simple syrup</p></li>
<li><p><strong>0.1 tsp</strong> fine sea salt</p></li>
</ul>
<p>Optional: steep 3–4 fresh basil leaves 5 minutes, then remove. Stir and rest 3 minutes before measuring.</p>
<h3>4. Validate Brix and pH</h3>
<p><strong>Brix target: 22–24.</strong> Adjust with simple syrup (up) or filtered water (down). <strong>pH target: 3.0–3.4.</strong> If above 3.4, add lemon juice 1 tsp at a time.</p>
<h3>5. Fill and Freeze</h3>
<p>Fill mold cavities to <strong>100 g (3.5 oz)</strong>. Tap 3–4 times to release air. Cover with plastic wrap. Freeze at 0–10°F for a minimum of <strong>8 hours</strong>.</p>
<h3>6. Unmold and Validate</h3>
<p>Cube will be pale pink to coral, translucent. <strong>Melt validation:</strong> pour 2 oz bourbon neat. Watermelon and honey aroma at 1–2 min. Full fruit-spirit integration at <strong>5–8 min</strong>.</p>`,
    },
    ingredients: [
      { name: 'Fresh watermelon juice (pressed and strained)', amount: 360, unit: 'ml',  sort_order: 0 },
      { name: 'Fresh lemon juice, strained',                  amount: 90,  unit: 'ml',  sort_order: 1 },
      { name: 'Raw honey',                                    amount: 75,  unit: 'ml',  sort_order: 2 },
      { name: 'Warm water (to loosen honey)',                 amount: 30,  unit: 'ml',  sort_order: 3 },
      { name: '1:1 simple syrup',                            amount: 90,  unit: 'ml',  sort_order: 4 },
      { name: 'Fine sea salt',                               amount: 0.1, unit: 'tsp', sort_order: 5 },
    ],
  },

  // ── Lime Ginger ──────────────────────────────────────────────────────────────
  {
    recipe: {
      sku: 'BLM-LG-001',
      expression: 'Lime Ginger',
      version: '1.0',
      status: 'active',
      spirit_pairing: 'Bourbon',
      brix_min: 21, brix_max: 23,
      ph_min: 2.4, ph_max: 2.9,
      melt_min: 4, melt_max: 7,
      notes: `Lime-forward cube with fresh ginger, honey, and simple syrup. Inspired by the Brown Buck and Kentucky Mule — bourbon, lime, and ginger beer. The cube delivers lime acidity and ginger heat; the spirit provides the brown base.

pH note: lime runs more acidic than lemon (raw pH 2.0–2.5), so this cube has the lowest pH target in the portfolio. Monitor carefully — the dilution water is required to hit Brix without over-sweetening.

SPIRIT PAIRINGS
• Primary: Bourbon — any expression; high-rye amplifies ginger
• Secondary: Rye whiskey — ginger and rye spice stack powerfully
• Tertiary: Irish whiskey — lighter and more refreshing combination

PROCESS NOTES
Ginger juice: grate fresh ginger (unpeeled) and press through a fine cloth — approximately 60 g fresh ginger yields 45 ml juice. Do not substitute ground ginger; the heat profile is completely different and the texture affects clarity. Filtered water (90 ml) is a required dilution component, not optional.`,
      recipe_body: `<h3>1. Extract Ginger Juice</h3>
<p>Grate <strong>~60 g fresh ginger</strong> (unpeeled) and press through a fine mesh cloth to extract <strong>45 ml fresh juice</strong>. Set aside.</p>
<h3>2. Prepare Honey Mixture</h3>
<p>Warm <strong>75 ml raw honey</strong> until fluid. Add <strong>30 ml warm water</strong> and stir smooth. Cool to room temperature.</p>
<h3>3. Combine Blend</h3>
<p>In a measuring pitcher, combine:</p>
<ul>
<li><p><strong>240 ml</strong> fresh lime juice, strained</p></li>
<li><p><strong>45 ml</strong> fresh ginger juice</p></li>
<li><p>Honey mixture from Step 2 (full batch)</p></li>
<li><p><strong>90 ml</strong> 1:1 simple syrup</p></li>
<li><p><strong>90 ml</strong> filtered water (required Brix dilution)</p></li>
<li><p><strong>0.1 tsp</strong> fine sea salt</p></li>
</ul>
<p>Stir gently. Blend will be pale gold-green and intensely aromatic.</p>
<h3>4. Validate Brix and pH</h3>
<p><strong>Brix target: 21–23.</strong> If low, add simple syrup 1 tbsp at a time. <strong>pH target: 2.4–2.9</strong> — the most acidic cube in the portfolio. If below 2.4, add filtered water 1 tbsp at a time.</p>
<h3>5. Fill and Freeze</h3>
<p>Fill mold cavities to <strong>100 g (3.5 oz)</strong>. Tap 3–4 times. Cover with plastic wrap. Freeze at 0–10°F for a minimum of <strong>8 hours</strong>.</p>
<h3>6. Unmold and Validate</h3>
<p>Cube will be pale gold, nearly clear. <strong>Melt validation:</strong> pour 2 oz bourbon neat. Ginger heat and lime brightness immediate. Honey sweetness and bourbon integration at <strong>4–7 min</strong>.</p>`,
    },
    ingredients: [
      { name: 'Fresh lime juice, strained',                          amount: 240, unit: 'ml',  sort_order: 0 },
      { name: 'Fresh ginger juice (pressed from grated ginger)',     amount: 45,  unit: 'ml',  sort_order: 1 },
      { name: 'Raw honey',                                           amount: 75,  unit: 'ml',  sort_order: 2 },
      { name: 'Warm water (to loosen honey)',                        amount: 30,  unit: 'ml',  sort_order: 3 },
      { name: '1:1 simple syrup',                                    amount: 90,  unit: 'ml',  sort_order: 4 },
      { name: 'Filtered water (required Brix dilution)',             amount: 90,  unit: 'ml',  sort_order: 5 },
      { name: 'Fine sea salt',                                       amount: 0.1, unit: 'tsp', sort_order: 6 },
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
      wb.set(doc(collection(db, 'recipes', ref.id, 'ingredients')), {
        ...ing, catalog_id: null, brand: null,
      })
    })
    log.push(`${recipe.sku}  ${recipe.expression}  (${ingredients.length} ingredients)`)
  }

  await wb.commit()
  log.forEach(l => console.log('Created:', l))
  console.log(`\n${RECIPES.length} recipes written.`)
  process.exit(0)
}

seed().catch(e => { console.error(e); process.exit(1) })
