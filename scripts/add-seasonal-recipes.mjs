import { initializeApp } from 'firebase/app'
import { getFirestore, collection, doc, writeBatch, getDocs, query, where, updateDoc } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyAAK6kSWq_7AWXOOvHyOSrN9lzhCVXLDKI",
  authDomain: "whiskey-brix.firebaseapp.com",
  projectId: "whiskey-brix",
  storageBucket: "whiskey-brix.firebasestorage.app",
  messagingSenderId: "1005067574676",
  appId: "1:1005067574676:web:bea75027c55d48f9680381"
}

// Seasonal calendar summary:
// Jan  BLM-HTD-001  Hot Toddy               (this script)
// Feb  BLM-SWC-001  Sweetheart Cherry        (this script)
// Mar  BLM-TRF-001  Transfusion              (add-transfusion.mjs)
// Sep  BLM-BD-001   Brown Derby              (this script — moved from Mar)
// Apr  BLM-AZL-001  Azalea                   (this script)
// May  BLM-MJ-001   Mint Julep               (UPDATE existing doc → seasonal)
// Jun  BLM-GSB-001  Garden Strawberry        (this script)
// Jul  BLM-SBR-001  Summer Berry             (this script)
// Aug  BLM-HD-001   Honey Deuce              (created in add-core-brown-spirits.mjs)
// Sep  BLM-BD-001   Brown Derby              (moved here from Mar — see above)
// ---  BLM-HPA-001  Harvest Apple            (this script — seasonal, no specific month)
// Oct  BLM-SPC-001  Spiced Cider             (this script)
// Nov  BLM-CRO-001  Cranberry Orange         (this script)
// Dec  BLM-WAS-001  Wassail                  (this script)

const app = initializeApp(firebaseConfig)
const db  = getFirestore(app)
const now = () => new Date().toISOString()

const SEASONAL = [

  // ── January: Hot Toddy ───────────────────────────────────────────────────────
  {
    recipe: {
      sku: 'BLM-HTD-001', expression: 'Hot Toddy',
      version: '1.0', status: 'seasonal', spirit_pairing: 'Bourbon',
      brix_min: 21, brix_max: 23, ph_min: 2.6, ph_max: 3.0,
      melt_min: 5, melt_max: 8, season_month: 1,
      notes: `January seasonal. Classic cold-weather cocktail reimagined as a cube: lemon, honey, and warming spices. The spiced syrup is steeped rather than infused raw to extract aromatics cleanly without bitterness.

SPIRIT PAIRINGS: Bourbon (primary), Irish whiskey (secondary, lighter and more traditional to the original drink), Scotch (tertiary — smoky-spice combination).`,
      recipe_body: `<h3>1. Make Spiced Honey Syrup</h3>
<p>Warm <strong>90 ml raw honey</strong> with <strong>0.5 tsp ground cinnamon</strong>, <strong>0.15 tsp ground cloves</strong>, and <strong>0.1 tsp ground allspice</strong> at 150°F for 10 minutes. Add <strong>45 ml warm water</strong>, stir smooth, and cool to room temperature.</p>
<h3>2. Combine Blend</h3>
<ul>
<li><p><strong>120 ml</strong> fresh lemon juice, strained</p></li>
<li><p>Spiced honey syrup from Step 1</p></li>
<li><p><strong>45 ml</strong> 1:1 simple syrup</p></li>
<li><p><strong>150 ml</strong> filtered water</p></li>
<li><p><strong>0.1 tsp</strong> fine sea salt</p></li>
</ul>
<h3>3. Validate</h3>
<p><strong>Brix: 21–23.</strong> Add simple syrup if low; add water if high. <strong>pH: 2.6–3.0.</strong> Adjust with lemon juice or water.</p>
<h3>4. Fill and Freeze</h3>
<p>Fill to <strong>100 g (3.5 oz)</strong>. Tap to release air. Freeze at 0–10°F for a minimum of <strong>8 hours</strong>.</p>
<h3>5. Melt Validation</h3>
<p>Pour 2 oz bourbon neat. Honey-spice aroma immediate. Lemon brightness at 2–3 min. Full integration at <strong>5–8 min</strong>.</p>`,
    },
    ingredients: [
      { name: 'Fresh lemon juice, strained',              amount: 120,  unit: 'ml',  sort_order: 0 },
      { name: 'Raw honey',                                amount: 90,   unit: 'ml',  sort_order: 1 },
      { name: 'Warm water (to loosen honey)',             amount: 45,   unit: 'ml',  sort_order: 2 },
      { name: '1:1 simple syrup',                         amount: 45,   unit: 'ml',  sort_order: 3 },
      { name: 'Filtered water',                           amount: 150,  unit: 'ml',  sort_order: 4 },
      { name: 'Ground cinnamon',                          amount: 0.5,  unit: 'tsp', sort_order: 5 },
      { name: 'Ground cloves',                            amount: 0.15, unit: 'tsp', sort_order: 6 },
      { name: 'Ground allspice',                          amount: 0.1,  unit: 'tsp', sort_order: 7 },
      { name: 'Fine sea salt',                            amount: 0.1,  unit: 'tsp', sort_order: 8 },
    ],
  },

  // ── February: Sweetheart Cherry ──────────────────────────────────────────────
  {
    recipe: {
      sku: 'BLM-SWC-001', expression: 'Sweetheart Cherry',
      version: '1.0', status: 'seasonal', spirit_pairing: 'Bourbon',
      brix_min: 21, brix_max: 23, ph_min: 3.0, ph_max: 3.4,
      melt_min: 5, melt_max: 8, season_month: 2,
      notes: `February seasonal — Valentine's Day. Tart cherry juice, honey, lemon, and vanilla. Tart cherry (not sweet/maraschino) provides a complex fruit base with natural acidity. Vanilla bridges the cherry and bourbon.

SPIRIT PAIRINGS: Bourbon (primary — cherry and vanilla are classic bourbon companions), Aged brandy (secondary), Rye (tertiary).

JUICE NOTES: Use 100% tart (Montmorency) cherry juice — not sweet cherry, not cherry cocktail. Lakewood, Knudsen, or Dynamic Health are reliable options.`,
      recipe_body: `<h3>1. Prepare Honey Mixture</h3>
<p>Warm <strong>60 ml raw honey</strong> until fluid. Add <strong>30 ml warm water</strong>, stir smooth, and cool.</p>
<h3>2. Combine Blend</h3>
<ul>
<li><p><strong>240 ml</strong> 100% tart cherry juice (Montmorency, unsweetened)</p></li>
<li><p><strong>60 ml</strong> fresh lemon juice, strained</p></li>
<li><p>Honey mixture from Step 1</p></li>
<li><p><strong>60 ml</strong> 1:1 simple syrup</p></li>
<li><p><strong>0.5 tsp</strong> vanilla extract</p></li>
<li><p><strong>90 ml</strong> filtered water (Brix dilution)</p></li>
<li><p><strong>0.1 tsp</strong> fine sea salt</p></li>
</ul>
<h3>3. Validate</h3>
<p><strong>Brix: 21–23.</strong> <strong>pH: 3.0–3.4.</strong></p>
<h3>4. Fill and Freeze</h3>
<p>Fill to <strong>100 g (3.5 oz)</strong>. Freeze at 0–10°F for a minimum of <strong>8 hours</strong>. Cube will be deep ruby-red.</p>
<h3>5. Melt Validation</h3>
<p>Pour 2 oz bourbon neat. Cherry and vanilla bloom immediately. Full fruit-honey-spirit balance at <strong>5–8 min</strong>.</p>`,
    },
    ingredients: [
      { name: '100% tart cherry juice (Montmorency, unsweetened)', amount: 240, unit: 'ml',  sort_order: 0 },
      { name: 'Fresh lemon juice, strained',                       amount: 60,  unit: 'ml',  sort_order: 1 },
      { name: 'Raw honey',                                         amount: 60,  unit: 'ml',  sort_order: 2 },
      { name: 'Warm water (to loosen honey)',                      amount: 30,  unit: 'ml',  sort_order: 3 },
      { name: '1:1 simple syrup',                                  amount: 60,  unit: 'ml',  sort_order: 4 },
      { name: 'Vanilla extract',                                   amount: 0.5, unit: 'tsp', sort_order: 5 },
      { name: 'Filtered water (Brix dilution)',                    amount: 90,  unit: 'ml',  sort_order: 6 },
      { name: 'Fine sea salt',                                     amount: 0.1, unit: 'tsp', sort_order: 7 },
    ],
  },

  // ── March: Brown Derby ───────────────────────────────────────────────────────
  {
    recipe: {
      sku: 'BLM-BD-001', expression: 'Brown Derby',
      version: '1.0', status: 'seasonal', spirit_pairing: 'Bourbon',
      brix_min: 21, brix_max: 23, ph_min: 3.0, ph_max: 3.4,
      melt_min: 5, melt_max: 8, season_month: 9,
      notes: `March seasonal. Inspired by the Brown Derby — a classic bourbon cocktail from the 1930s: bourbon, fresh grapefruit juice, honey. One of the few classic cocktails built expressly around bourbon and citrus. Grapefruit peaks in winter/early spring; this cube aligns with peak citrus season.

SPIRIT PAIRINGS: Bourbon (primary — this is its native spirit), Rye (secondary), Tennessee whiskey (tertiary).

JUICE NOTES: Fresh-squeezed grapefruit only. Ruby Red grapefruit yields a beautiful pink color; white grapefruit is slightly more bitter and less sweet. Do not use bottled — flavor degrades significantly.`,
      recipe_body: `<h3>1. Prepare Honey Mixture</h3>
<p>Warm <strong>90 ml raw honey</strong> until fluid. Add <strong>45 ml warm water</strong>, stir smooth, and cool.</p>
<h3>2. Combine Blend</h3>
<ul>
<li><p><strong>390 ml</strong> fresh grapefruit juice, strained</p></li>
<li><p><strong>45 ml</strong> fresh lemon juice, strained</p></li>
<li><p>Honey mixture from Step 1</p></li>
<li><p><strong>60 ml</strong> 1:1 simple syrup</p></li>
<li><p><strong>0.1 tsp</strong> fine sea salt</p></li>
</ul>
<h3>3. Validate</h3>
<p><strong>Brix: 21–23.</strong> Grapefruit Brix varies widely by variety and ripeness — measure raw juice before combining and adjust honey/syrup. <strong>pH: 3.0–3.4.</strong></p>
<h3>4. Fill and Freeze</h3>
<p>Fill to <strong>100 g (3.5 oz)</strong>. Freeze at 0–10°F for a minimum of <strong>8 hours</strong>. Cube will be pale gold-pink (Ruby Red) or pale amber (white grapefruit).</p>
<h3>5. Melt Validation</h3>
<p>Pour 2 oz bourbon neat. Grapefruit and honey bloom immediately. Full Brown Derby profile at <strong>5–8 min</strong>.</p>`,
    },
    ingredients: [
      { name: 'Fresh grapefruit juice, strained (Ruby Red preferred)', amount: 390, unit: 'ml',  sort_order: 0 },
      { name: 'Fresh lemon juice, strained',                           amount: 45,  unit: 'ml',  sort_order: 1 },
      { name: 'Raw honey',                                             amount: 90,  unit: 'ml',  sort_order: 2 },
      { name: 'Warm water (to loosen honey)',                          amount: 45,  unit: 'ml',  sort_order: 3 },
      { name: '1:1 simple syrup',                                      amount: 60,  unit: 'ml',  sort_order: 4 },
      { name: 'Fine sea salt',                                         amount: 0.1, unit: 'tsp', sort_order: 5 },
    ],
  },

  // ── April: Azalea ────────────────────────────────────────────────────────────
  {
    recipe: {
      sku: 'BLM-AZL-001', expression: 'Azalea',
      version: '1.0', status: 'seasonal', spirit_pairing: 'Bourbon',
      brix_min: 21, brix_max: 23, ph_min: 2.8, ph_max: 3.2,
      melt_min: 5, melt_max: 8, season_month: 4,
      notes: `April seasonal — inspired by the Azalea cocktail served at The Masters golf tournament at Augusta National. The traditional Azalea: gin, lemon, pineapple juice, grenadine/pomegranate. Reimagined here for bourbon, replacing the spirit with the cube medium and shifting the gin-citrus profile toward brown-spirit-compatible fruit.

Pomegranate gives a deep pink-red color that mirrors azalea blooms. Pineapple provides tropical brightness without dominating.

SPIRIT PAIRINGS: Bourbon (primary), Rye (secondary), Tennessee whiskey (tertiary).`,
      recipe_body: `<h3>1. Prepare Honey Mixture</h3>
<p>Warm <strong>60 ml raw honey</strong> until fluid. Add <strong>30 ml warm water</strong>, stir smooth, and cool.</p>
<h3>2. Combine Blend</h3>
<ul>
<li><p><strong>200 ml</strong> 100% pineapple juice (not from concentrate)</p></li>
<li><p><strong>90 ml</strong> fresh lemon juice, strained</p></li>
<li><p><strong>90 ml</strong> 100% pomegranate juice (POM or equivalent)</p></li>
<li><p>Honey mixture from Step 1</p></li>
<li><p><strong>45 ml</strong> 1:1 simple syrup</p></li>
<li><p><strong>0.1 tsp</strong> fine sea salt</p></li>
</ul>
<h3>3. Validate</h3>
<p><strong>Brix: 21–23.</strong> Pineapple and pomegranate Brix vary by brand — measure before combining. <strong>pH: 2.8–3.2.</strong></p>
<h3>4. Fill and Freeze</h3>
<p>Fill to <strong>100 g (3.5 oz)</strong>. Freeze at 0–10°F for a minimum of <strong>8 hours</strong>. Cube will be deep pink-red, reminiscent of azalea petals.</p>
<h3>5. Melt Validation</h3>
<p>Pour 2 oz bourbon neat. Pineapple and pomegranate aroma immediate. Lemon brightness and honey at 2–3 min. Full tropical-citrus integration at <strong>5–8 min</strong>.</p>`,
    },
    ingredients: [
      { name: '100% pineapple juice (not from concentrate)',  amount: 200, unit: 'ml',  sort_order: 0 },
      { name: 'Fresh lemon juice, strained',                  amount: 90,  unit: 'ml',  sort_order: 1 },
      { name: '100% pomegranate juice',                       amount: 90,  unit: 'ml',  sort_order: 2 },
      { name: 'Raw honey',                                    amount: 60,  unit: 'ml',  sort_order: 3 },
      { name: 'Warm water (to loosen honey)',                 amount: 30,  unit: 'ml',  sort_order: 4 },
      { name: '1:1 simple syrup',                            amount: 45,  unit: 'ml',  sort_order: 5 },
      { name: 'Fine sea salt',                               amount: 0.1, unit: 'tsp', sort_order: 6 },
    ],
  },

  // ── June: Garden Strawberry ──────────────────────────────────────────────────
  {
    recipe: {
      sku: 'BLM-GSB-001', expression: 'Garden Strawberry',
      version: '1.0', status: 'seasonal', spirit_pairing: 'Bourbon',
      brix_min: 21, brix_max: 23, ph_min: 2.8, ph_max: 3.2,
      melt_min: 5, melt_max: 8, season_month: 6,
      notes: `June seasonal — peak strawberry season, also Wimbledon (late June). Strawberry juice, lemon, honey, and fresh basil simple syrup. Basil is optional but elevates the profile from fruit-sweet to herb-fruit, which pairs more interestingly with bourbon.

SPIRIT PAIRINGS: Bourbon (primary — strawberry and honey are natural bourbon companions), Tennessee whiskey (secondary), Aged rum (tertiary).

PROCESS NOTES: Press fresh strawberries by blending and straining through fine mesh. Overripe strawberries actually yield better flavor and higher Brix. Basil simple syrup: steep 10 fresh basil leaves in hot 1:1 syrup for 20 minutes, strain. Makes the syrup fragrant without being aggressively herbal.`,
      recipe_body: `<h3>1. Make Basil Simple Syrup (optional but recommended)</h3>
<p>Steep <strong>10 fresh basil leaves</strong> in <strong>90 ml hot 1:1 simple syrup</strong> for 20 minutes. Strain and cool. (Substitute plain 1:1 syrup if skipping.)</p>
<h3>2. Press Strawberry Juice</h3>
<p>Blend <strong>~400 g fresh strawberries</strong> and strain through fine mesh to yield <strong>300 ml juice</strong>.</p>
<h3>3. Prepare Honey Mixture</h3>
<p>Warm <strong>60 ml raw honey</strong> until fluid. Add <strong>30 ml warm water</strong>, stir smooth, and cool.</p>
<h3>4. Combine Blend</h3>
<ul>
<li><p><strong>300 ml</strong> fresh strawberry juice</p></li>
<li><p><strong>75 ml</strong> fresh lemon juice, strained</p></li>
<li><p>Honey mixture from Step 3</p></li>
<li><p><strong>90 ml</strong> basil simple syrup (or plain)</p></li>
<li><p><strong>0.1 tsp</strong> fine sea salt</p></li>
</ul>
<h3>5. Validate</h3>
<p><strong>Brix: 21–23.</strong> <strong>pH: 2.8–3.2.</strong> Strawberry Brix ranges 7–9 depending on ripeness; adjust syrup accordingly.</p>
<h3>6. Fill and Freeze</h3>
<p>Fill to <strong>100 g (3.5 oz)</strong>. Freeze at 0–10°F for a minimum of <strong>8 hours</strong>. Cube will be bright red-pink.</p>
<h3>7. Melt Validation</h3>
<p>Pour 2 oz bourbon neat. Strawberry and basil bloom at 1 min. Full herb-fruit-spirit balance at <strong>5–8 min</strong>.</p>`,
    },
    ingredients: [
      { name: 'Fresh strawberry juice (pressed and strained)', amount: 300, unit: 'ml',  sort_order: 0 },
      { name: 'Fresh lemon juice, strained',                  amount: 75,  unit: 'ml',  sort_order: 1 },
      { name: 'Raw honey',                                    amount: 60,  unit: 'ml',  sort_order: 2 },
      { name: 'Warm water (to loosen honey)',                 amount: 30,  unit: 'ml',  sort_order: 3 },
      { name: 'Basil-infused 1:1 simple syrup (or plain)',   amount: 90,  unit: 'ml',  sort_order: 4 },
      { name: 'Fine sea salt',                               amount: 0.1, unit: 'tsp', sort_order: 5 },
    ],
  },

  // ── July: Summer Berry ───────────────────────────────────────────────────────
  {
    recipe: {
      sku: 'BLM-SBR-001', expression: 'Summer Berry',
      version: '1.0', status: 'seasonal', spirit_pairing: 'Bourbon',
      brix_min: 21, brix_max: 23, ph_min: 2.6, ph_max: 3.0,
      melt_min: 5, melt_max: 8, season_month: 7,
      notes: `July seasonal — Fourth of July, peak summer berry season. Mixed berry blend (blueberry + blackberry + raspberry) with lemon and honey. The blend ratio can be adjusted based on availability; blueberry provides body, blackberry adds depth, raspberry adds brightness and tartness.

SPIRIT PAIRINGS: Bourbon (primary), Rye (secondary), Tennessee whiskey (tertiary).

JUICE NOTES: Target roughly 40% blueberry / 35% blackberry / 25% raspberry by volume. Use 100% juices — not berry cocktails with added sugar. Adjust simple syrup based on the inherent sweetness of the berry blend used.`,
      recipe_body: `<h3>1. Prepare Honey Mixture</h3>
<p>Warm <strong>60 ml raw honey</strong> until fluid. Add <strong>30 ml warm water</strong>, stir smooth, and cool.</p>
<h3>2. Combine Blend</h3>
<ul>
<li><p><strong>300 ml</strong> mixed berry juice (blueberry + blackberry + raspberry blend, 100% juice)</p></li>
<li><p><strong>90 ml</strong> fresh lemon juice, strained</p></li>
<li><p>Honey mixture from Step 1</p></li>
<li><p><strong>60 ml</strong> 1:1 simple syrup</p></li>
<li><p><strong>0.1 tsp</strong> fine sea salt</p></li>
</ul>
<h3>3. Validate</h3>
<p><strong>Brix: 21–23.</strong> Mixed berry Brix varies significantly by blend — always measure the blend before adding sweeteners. <strong>pH: 2.6–3.0.</strong></p>
<h3>4. Fill and Freeze</h3>
<p>Fill to <strong>100 g (3.5 oz)</strong>. Freeze at 0–10°F for a minimum of <strong>8 hours</strong>. Cube will be deep blue-purple to dark red.</p>
<h3>5. Melt Validation</h3>
<p>Pour 2 oz bourbon neat. Berry and honey aroma bloom at 1 min. Full summer fruit and spirit balance at <strong>5–8 min</strong>.</p>`,
    },
    ingredients: [
      { name: 'Mixed berry juice (blueberry + blackberry + raspberry, 100%)', amount: 300, unit: 'ml',  sort_order: 0 },
      { name: 'Fresh lemon juice, strained',                                  amount: 90,  unit: 'ml',  sort_order: 1 },
      { name: 'Raw honey',                                                    amount: 60,  unit: 'ml',  sort_order: 2 },
      { name: 'Warm water (to loosen honey)',                                 amount: 30,  unit: 'ml',  sort_order: 3 },
      { name: '1:1 simple syrup',                                             amount: 60,  unit: 'ml',  sort_order: 4 },
      { name: 'Fine sea salt',                                                amount: 0.1, unit: 'tsp', sort_order: 5 },
    ],
  },

  // ── September: Harvest Apple ─────────────────────────────────────────────────
  {
    recipe: {
      sku: 'BLM-HPA-001', expression: 'Harvest Apple',
      version: '1.0', status: 'seasonal', spirit_pairing: 'Bourbon',
      brix_min: 21, brix_max: 23, ph_min: 3.0, ph_max: 3.4,
      melt_min: 5, melt_max: 8, season_month: null,
      notes: `September seasonal — apple harvest begins, Labor Day, early autumn. Fresh-pressed apple cider with honey, lemon, and a light touch of cinnamon. Lighter and brighter than October's Spiced Cider — this is early fall, not Halloween.

SPIRIT PAIRINGS: Bourbon (primary — apple and bourbon is a natural pairing), Rye (secondary), Applejack or apple brandy (tertiary).

PROCESS NOTES: Use fresh-pressed apple cider from a local orchard if possible — the difference in complexity versus grocery store cider is significant. Heirloom varieties (Honeycrisp, Fuji, Cortland blends) will read differently from commodity cider. Measure Brix of raw cider — it ranges from 10 to 15+ depending on the apple variety and processing.`,
      recipe_body: `<h3>1. Prepare Honey Mixture</h3>
<p>Warm <strong>75 ml raw honey</strong> until fluid. Add <strong>30 ml warm water</strong>, stir smooth, and cool.</p>
<h3>2. Combine Blend</h3>
<ul>
<li><p><strong>300 ml</strong> fresh-pressed apple cider</p></li>
<li><p><strong>45 ml</strong> fresh lemon juice, strained</p></li>
<li><p>Honey mixture from Step 1</p></li>
<li><p><strong>0.5 tsp</strong> ground cinnamon</p></li>
<li><p><strong>0.15 tsp</strong> ground nutmeg</p></li>
<li><p><strong>0.1 tsp</strong> fine sea salt</p></li>
</ul>
<p>Stir gently and rest 5 minutes to allow spices to hydrate.</p>
<h3>3. Validate</h3>
<p><strong>Brix: 21–23.</strong> Apple cider Brix varies widely — measure before combining and adjust honey/simple syrup accordingly. <strong>pH: 3.0–3.4.</strong></p>
<h3>4. Fill and Freeze</h3>
<p>Fill to <strong>100 g (3.5 oz)</strong>. Tap to release air (spices may introduce bubbles). Freeze at 0–10°F for a minimum of <strong>8 hours</strong>.</p>
<h3>5. Melt Validation</h3>
<p>Pour 2 oz bourbon neat. Apple and cinnamon bloom at 1 min. Honey and nutmeg at 3 min. Full harvest profile at <strong>5–8 min</strong>.</p>`,
    },
    ingredients: [
      { name: 'Fresh-pressed apple cider',    amount: 300,  unit: 'ml',  sort_order: 0 },
      { name: 'Fresh lemon juice, strained',  amount: 45,   unit: 'ml',  sort_order: 1 },
      { name: 'Raw honey',                    amount: 75,   unit: 'ml',  sort_order: 2 },
      { name: 'Warm water (to loosen honey)', amount: 30,   unit: 'ml',  sort_order: 3 },
      { name: 'Ground cinnamon',              amount: 0.5,  unit: 'tsp', sort_order: 4 },
      { name: 'Ground nutmeg',               amount: 0.15, unit: 'tsp', sort_order: 5 },
      { name: 'Fine sea salt',               amount: 0.1,  unit: 'tsp', sort_order: 6 },
    ],
  },

  // ── October: Spiced Cider ────────────────────────────────────────────────────
  {
    recipe: {
      sku: 'BLM-SPC-001', expression: 'Spiced Cider',
      version: '1.0', status: 'seasonal', spirit_pairing: 'Bourbon',
      brix_min: 21, brix_max: 23, ph_min: 3.2, ph_max: 3.6,
      melt_min: 5, melt_max: 8, season_month: 10,
      notes: `October seasonal — Halloween, peak harvest, apple cider season. Deeper and more spice-forward than September's Harvest Apple: apple cider + orange + demerara + cloves + allspice. Demerara syrup adds the brown-sugar depth that reads as autumn.

SPIRIT PAIRINGS: Bourbon (primary), Rye (secondary — the spice-on-spice is compelling), Aged rum (tertiary — demerara is rum's native sugar).

DIFFERENTIATION FROM HARVEST APPLE (Sep): Harvest Apple is bright and honey-forward. Spiced Cider is darker, drier, more complex, and more heavily spiced — think cider house vs. harvest picnic.`,
      recipe_body: `<h3>1. Make Spiced Demerara Syrup</h3>
<p>Combine <strong>120 ml demerara simple syrup (1:1)</strong> with <strong>0.75 tsp ground cinnamon</strong>, <strong>0.2 tsp ground cloves</strong>, <strong>0.15 tsp ground allspice</strong>, and <strong>0.15 tsp ground nutmeg</strong>. Warm to 160°F and steep 15 minutes. Strain through fine mesh and cool.</p>
<h3>2. Combine Blend</h3>
<ul>
<li><p><strong>240 ml</strong> fresh-pressed apple cider</p></li>
<li><p><strong>90 ml</strong> fresh orange juice, strained</p></li>
<li><p><strong>30 ml</strong> fresh lemon juice, strained</p></li>
<li><p>Spiced demerara syrup from Step 1</p></li>
<li><p><strong>0.1 tsp</strong> fine sea salt</p></li>
</ul>
<h3>3. Validate</h3>
<p><strong>Brix: 21–23.</strong> <strong>pH: 3.2–3.6.</strong> Orange and apple together sit naturally in this pH range.</p>
<h3>4. Fill and Freeze</h3>
<p>Fill to <strong>100 g (3.5 oz)</strong>. Tap to release air. Freeze at 0–10°F for a minimum of <strong>8 hours</strong>. Cube will be deep amber.</p>
<h3>5. Melt Validation</h3>
<p>Pour 2 oz bourbon neat. Spice and orange bloom immediately. Demerara and apple at 3 min. Full autumn harvest integration at <strong>5–8 min</strong>.</p>`,
    },
    ingredients: [
      { name: 'Fresh-pressed apple cider',           amount: 240,  unit: 'ml',  sort_order: 0 },
      { name: 'Fresh orange juice, strained',        amount: 90,   unit: 'ml',  sort_order: 1 },
      { name: 'Fresh lemon juice, strained',         amount: 30,   unit: 'ml',  sort_order: 2 },
      { name: 'Demerara simple syrup (1:1)',         amount: 120,  unit: 'ml',  sort_order: 3 },
      { name: 'Ground cinnamon',                     amount: 0.75, unit: 'tsp', sort_order: 4 },
      { name: 'Ground cloves',                       amount: 0.2,  unit: 'tsp', sort_order: 5 },
      { name: 'Ground allspice',                     amount: 0.15, unit: 'tsp', sort_order: 6 },
      { name: 'Ground nutmeg',                      amount: 0.15, unit: 'tsp', sort_order: 7 },
      { name: 'Fine sea salt',                      amount: 0.1,  unit: 'tsp', sort_order: 8 },
    ],
  },

  // ── November: Cranberry Orange ───────────────────────────────────────────────
  {
    recipe: {
      sku: 'BLM-CRO-001', expression: 'Cranberry Orange',
      version: '1.0', status: 'seasonal', spirit_pairing: 'Bourbon',
      brix_min: 21, brix_max: 23, ph_min: 2.8, ph_max: 3.2,
      melt_min: 5, melt_max: 8, season_month: 11,
      notes: `November seasonal — Thanksgiving. Unsweetened cranberry juice, fresh orange, honey, and a touch of cinnamon. Cranberry's natural tartness and cranberry-orange's status as a classic Thanksgiving combination make this a natural fit.

SPIRIT PAIRINGS: Bourbon (primary), Rye (secondary), Cognac or brandy (tertiary — very Thanksgiving).

JUICE NOTES: Use 100% unsweetened cranberry juice (not cranberry cocktail, which is heavily sweetened). Ocean Spray 100%, Lakewood, or Knudsen pure cranberry. Raw cranberry is extremely tart — the honey and orange are required balance, not optional.`,
      recipe_body: `<h3>1. Prepare Honey Mixture</h3>
<p>Warm <strong>60 ml raw honey</strong> until fluid. Add <strong>30 ml warm water</strong>, stir smooth, and cool.</p>
<h3>2. Combine Blend</h3>
<ul>
<li><p><strong>240 ml</strong> 100% unsweetened cranberry juice</p></li>
<li><p><strong>120 ml</strong> fresh orange juice, strained</p></li>
<li><p><strong>30 ml</strong> fresh lemon juice, strained</p></li>
<li><p>Honey mixture from Step 1</p></li>
<li><p><strong>75 ml</strong> 1:1 simple syrup</p></li>
<li><p><strong>0.25 tsp</strong> ground cinnamon</p></li>
<li><p><strong>0.1 tsp</strong> fine sea salt</p></li>
</ul>
<h3>3. Validate</h3>
<p><strong>Brix: 21–23.</strong> Unsweetened cranberry is very low Brix (4–6) and very high acid — do not omit the simple syrup. <strong>pH: 2.8–3.2.</strong></p>
<h3>4. Fill and Freeze</h3>
<p>Fill to <strong>100 g (3.5 oz)</strong>. Freeze at 0–10°F for a minimum of <strong>8 hours</strong>. Cube will be deep ruby-red.</p>
<h3>5. Melt Validation</h3>
<p>Pour 2 oz bourbon neat. Cranberry and orange bloom immediately. Honey and cinnamon at 2–3 min. Full Thanksgiving fruit-spirit balance at <strong>5–8 min</strong>.</p>`,
    },
    ingredients: [
      { name: '100% unsweetened cranberry juice',   amount: 240,  unit: 'ml',  sort_order: 0 },
      { name: 'Fresh orange juice, strained',       amount: 120,  unit: 'ml',  sort_order: 1 },
      { name: 'Fresh lemon juice, strained',        amount: 30,   unit: 'ml',  sort_order: 2 },
      { name: 'Raw honey',                          amount: 60,   unit: 'ml',  sort_order: 3 },
      { name: 'Warm water (to loosen honey)',       amount: 30,   unit: 'ml',  sort_order: 4 },
      { name: '1:1 simple syrup',                  amount: 75,   unit: 'ml',  sort_order: 5 },
      { name: 'Ground cinnamon',                   amount: 0.25, unit: 'tsp', sort_order: 6 },
      { name: 'Fine sea salt',                     amount: 0.1,  unit: 'tsp', sort_order: 7 },
    ],
  },

  // ── December: Wassail ────────────────────────────────────────────────────────
  {
    recipe: {
      sku: 'BLM-WAS-001', expression: 'Wassail',
      version: '1.0', status: 'seasonal', spirit_pairing: 'Bourbon',
      brix_min: 21, brix_max: 23, ph_min: 3.0, ph_max: 3.4,
      melt_min: 5, melt_max: 8, season_month: 12,
      notes: `December seasonal — Christmas/Yule. Inspired by the traditional wassail: a hot spiced cider punch served in medieval England, traditionally associated with carol singing and midwinter celebration. Apple cider + cranberry + orange + demerara + full warm spice blend.

More complex than October's Spiced Cider: cranberry adds depth and tartness, orange adds festivity, and the full spice array (cinnamon, cloves, allspice, star anise) is the holiday profile.

SPIRIT PAIRINGS: Bourbon (primary), Rye (secondary), Aged rum (tertiary — demerara is rum's native sugar and the combination is deeply satisfying).

PROCESS NOTES: Star anise is steeped in the syrup and removed — do not leave in the blend, as it will overpower. Whole cloves can substitute for ground; if using whole, steep in the syrup and strain.`,
      recipe_body: `<h3>1. Make Holiday Spiced Syrup</h3>
<p>Combine <strong>60 ml demerara simple syrup (1:1)</strong> with <strong>0.5 tsp ground cinnamon</strong>, <strong>0.15 tsp ground cloves</strong>, <strong>0.1 tsp ground allspice</strong>, and <strong>2 whole star anise</strong>. Warm to 160°F and steep 15 minutes. Remove star anise, strain, and cool.</p>
<h3>2. Prepare Honey Mixture</h3>
<p>Warm <strong>60 ml raw honey</strong> until fluid. Add <strong>30 ml warm water</strong>, stir smooth, and cool.</p>
<h3>3. Combine Blend</h3>
<ul>
<li><p><strong>180 ml</strong> fresh-pressed apple cider</p></li>
<li><p><strong>120 ml</strong> 100% cranberry juice (unsweetened)</p></li>
<li><p><strong>90 ml</strong> fresh orange juice, strained</p></li>
<li><p><strong>30 ml</strong> fresh lemon juice, strained</p></li>
<li><p>Honey mixture from Step 2</p></li>
<li><p>Spiced demerara syrup from Step 1</p></li>
<li><p><strong>0.1 tsp</strong> fine sea salt</p></li>
</ul>
<h3>4. Validate</h3>
<p><strong>Brix: 21–23.</strong> <strong>pH: 3.0–3.4.</strong> The cranberry pulls pH down; orange and apple soften it.</p>
<h3>5. Fill and Freeze</h3>
<p>Fill to <strong>100 g (3.5 oz)</strong>. Freeze at 0–10°F for a minimum of <strong>8 hours</strong>. Cube will be deep garnet-red.</p>
<h3>6. Melt Validation</h3>
<p>Pour 2 oz bourbon neat. Spice and citrus bloom immediately. Apple, cranberry, and honey at 2–3 min. Full holiday-spirit integration at <strong>5–8 min</strong>.</p>`,
    },
    ingredients: [
      { name: 'Fresh-pressed apple cider',             amount: 180,  unit: 'ml',  sort_order: 0 },
      { name: '100% unsweetened cranberry juice',      amount: 120,  unit: 'ml',  sort_order: 1 },
      { name: 'Fresh orange juice, strained',          amount: 90,   unit: 'ml',  sort_order: 2 },
      { name: 'Fresh lemon juice, strained',           amount: 30,   unit: 'ml',  sort_order: 3 },
      { name: 'Raw honey',                             amount: 60,   unit: 'ml',  sort_order: 4 },
      { name: 'Warm water (to loosen honey)',          amount: 30,   unit: 'ml',  sort_order: 5 },
      { name: 'Demerara simple syrup (1:1)',           amount: 60,   unit: 'ml',  sort_order: 6 },
      { name: 'Ground cinnamon',                       amount: 0.5,  unit: 'tsp', sort_order: 7 },
      { name: 'Ground cloves',                         amount: 0.15, unit: 'tsp', sort_order: 8 },
      { name: 'Ground allspice',                       amount: 0.1,  unit: 'tsp', sort_order: 9 },
      { name: 'Whole star anise (steep in syrup, remove)', amount: 2, unit: 'ct', sort_order: 10 },
      { name: 'Fine sea salt',                         amount: 0.1,  unit: 'tsp', sort_order: 11 },
    ],
  },
]

async function seed() {
  // Update Mint Julep (May) to seasonal
  const mjSnap = await getDocs(query(collection(db, 'recipes'), where('sku', '==', 'BLM-MJ-001')))
  if (!mjSnap.empty) {
    await updateDoc(mjSnap.docs[0].ref, { status: 'seasonal', season_month: 5 })
    console.log('Updated  BLM-MJ-001  Mint Julep → seasonal (May)')
  } else {
    console.warn('WARNING: BLM-MJ-001 (Mint Julep) not found — run the initial seed first')
  }

  // Create 10 new seasonal recipes in one batch
  const wb = writeBatch(db)
  const log = []

  for (const { recipe, ingredients } of SEASONAL) {
    const ref = doc(collection(db, 'recipes'))
    wb.set(ref, { ...recipe, created_at: now() })
    ingredients.forEach(ing => {
      wb.set(doc(collection(db, 'recipes', ref.id, 'ingredients')), {
        ...ing, catalog_id: null, brand: null,
      })
    })
    log.push(`${recipe.sku}  ${recipe.expression}  (${ingredients.length} ingredients, month ${recipe.season_month})`)
  }

  await wb.commit()
  log.forEach(l => console.log('Created:', l))
  console.log(`\n${SEASONAL.length} seasonal recipes written.`)
  process.exit(0)
}

seed().catch(e => { console.error(e); process.exit(1) })
