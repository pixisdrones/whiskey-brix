import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs } from 'firebase/firestore'

const app = initializeApp({
  apiKey: "AIzaSyAAK6kSWq_7AWXOOvHyOSrN9lzhCVXLDKI",
  authDomain: "whiskey-brix.firebaseapp.com",
  projectId: "whiskey-brix",
  storageBucket: "whiskey-brix.firebasestorage.app",
  messagingSenderId: "1005067574676",
  appId: "1:1005067574676:web:bea75027c55d48f9680381"
})
const db = getFirestore(app)

const snap = await getDocs(collection(db, 'recipes'))
console.log(`Total recipes: ${snap.size}`)
snap.docs.forEach(d => {
  const { sku, expression, ph_min, ph_max, brix_min, brix_max } = d.data()
  console.log(`${d.id}  ${sku}  "${expression}"  pH:${ph_min}-${ph_max}  Brix:${brix_min}-${brix_max}`)
})
process.exit(0)
