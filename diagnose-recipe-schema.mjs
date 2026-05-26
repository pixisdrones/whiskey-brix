import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore'

const app = initializeApp({
  apiKey: "AIzaSyAAK6kSWq_7AWXOOvHyOSrN9lzhCVXLDKI",
  authDomain: "whiskey-brix.firebaseapp.com",
  projectId: "whiskey-brix",
  storageBucket: "whiskey-brix.firebasestorage.app",
  messagingSenderId: "1005067574676",
  appId: "1:1005067574676:web:bea75027c55d48f9680381"
})
const db = getFirestore(app)

const snap = await getDocs(query(collection(db, 'recipes'), where('sku', '==', 'BLM-LA-001')))
const recipe = snap.docs[0]
console.log('Recipe fields:', JSON.stringify(recipe.data(), null, 2))

const ingSnap = await getDocs(collection(db, 'recipes', recipe.id, 'ingredients'))
console.log('\nIngredients:')
ingSnap.docs.forEach(d => console.log(' ', JSON.stringify(d.data())))

// Also check catalog for matching items
const catSnap = await getDocs(collection(db, 'ingredients_catalog'))
console.log('\nCatalog (name, unit):')
catSnap.docs.forEach(d => console.log(` ${d.id}: ${d.data().name} (${d.data().unit})`))

process.exit(0)
