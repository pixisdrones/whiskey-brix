import { initializeApp } from 'firebase/app'
import { getFirestore, doc, updateDoc } from 'firebase/firestore'

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

// Tiptap-compatible HTML (StarterKit): h3 headings, p paragraphs, ul/li/p bullets
const recipe_body = `<h3>1. Loosen Honey</h3>
<p>Warm <strong>268 ml raw or wildflower honey</strong> gently — just enough to make it fully fluid and pourable. Do not heat above 120°F or you'll drive off the aromatic compounds that make honey a flavor asset rather than just a sweetener.</p>
<p>Add <strong>101 ml warm water</strong> and stir until the mixture is completely smooth with no streaks. Let cool to room temperature before adding to the blend.</p>
<h3>2. Combine the Final Blend</h3>
<p>In a large measuring pitcher, combine:</p>
<ul>
<li><p><strong>503 ml</strong> unsweetened blueberry juice (100% — not blueberry cocktail)</p></li>
<li><p><strong>268 ml</strong> fresh lemon juice, strained</p></li>
<li><p>Honey mixture from Step 1 (full batch)</p></li>
<li><p><strong>168 ml</strong> 1:1 simple syrup (Brix adjustment)</p></li>
<li><p><strong>0.15 tsp</strong> fine sea salt</p></li>
</ul>
<p>Stir gently until fully combined. The blend should be a deep blue-purple. Let rest 3 minutes before measuring.</p>
<h3>3. Validate Brix and pH</h3>
<p><strong>Brix target: 23–24.</strong> Blueberry juice contributes ~12–14 Brix of its own, lemon juice ~7–8 Brix, and honey is the primary Brix driver at ~80 Brix neat. If the reading is low, add simple syrup in 1 tbsp increments and re-measure. If above 25, dilute with 1 tbsp filtered water at a time.</p>
<p><strong>pH target: 2.6–3.0.</strong> Lemon juice is handling the acid load. If above 3.0, add a small splash of lemon juice and re-check.</p>
<h3>4. Fill Molds and Freeze</h3>
<p>Fill each mold cavity to approximately <strong>100 g (3.5 oz)</strong>. Tap firmly 3–4 times to release air pockets. Cover with plastic wrap pressed to the surface. Freeze at 0–10°F for a minimum of <strong>480 minutes (8 hours)</strong>.</p>
<h3>5. Unmold and Validate</h3>
<p>Release using cold water over the mold base for 5 seconds. The frozen cube should be deep blue-purple — the most distinctly colored cube in the portfolio alongside Blackberry Brown Sugar.</p>
<p><strong>Melt validation:</strong> pour 2 oz bourbon over one cube, neat. Honey and blueberry aroma bloom should be immediate. First flavor integration at 2–3 min. Full fruit-honey-spirit balance at <strong>4–7 min</strong>.</p>`

async function patch() {
  await updateDoc(doc(db, 'recipes', 'WBmp9TnE5m0rPz1e0uU3'), { recipe_body })
  console.log('recipe_body updated on WBmp9TnE5m0rPz1e0uU3')
  process.exit(0)
}

patch().catch(e => { console.error(e); process.exit(1) })
