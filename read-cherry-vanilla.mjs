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
const cherry = snap.docs.find(d => d.data().expression?.toLowerCase().includes('cherry'))
if (!cherry) { console.log('No cherry recipe found'); process.exit(0) }
const data = cherry.data()
console.log('ID:', cherry.id)
console.log('SKU:', data.sku)
console.log('Expression:', data.expression)
console.log('ph_min:', data.ph_min)
console.log('ph_max:', data.ph_max)
console.log('brix_min:', data.brix_min)
console.log('brix_max:', data.brix_max)
console.log('notes:', data.notes)
process.exit(0)
