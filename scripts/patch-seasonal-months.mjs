import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, query, where, updateDoc } from 'firebase/firestore'

// Patches season_month on three recipes:
//   BLM-TRF-001  Transfusion   null → 3   (March)
//   BLM-BD-001   Brown Derby   3    → 9   (September)
//   BLM-HPA-001  Harvest Apple 9    → null (unassigned — displaced by Brown Derby)
//
// Safe to run multiple times — idempotent.

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

const PATCHES = [
  { sku: 'BLM-TRF-001', season_month: 3    },
  { sku: 'BLM-BD-001',  season_month: 9    },
  { sku: 'BLM-HPA-001', season_month: null },
]

async function patch() {
  for (const { sku, season_month } of PATCHES) {
    const snap = await getDocs(query(collection(db, 'recipes'), where('sku', '==', sku)))
    if (snap.empty) {
      console.warn(`SKIP  ${sku} — not found (recipe not yet seeded)`)
      continue
    }
    await updateDoc(snap.docs[0].ref, { season_month })
    console.log(`OK    ${sku}  season_month → ${season_month ?? 'null'}`)
  }
  console.log('\nDone.')
  process.exit(0)
}

patch().catch(e => { console.error(e); process.exit(1) })
