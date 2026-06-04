import { initializeApp } from 'firebase/app'
import { getFirestore, doc, updateDoc } from 'firebase/firestore'

const app = initializeApp({
  apiKey: "AIzaSyAAK6kSWq_7AWXOOvHyOSrN9lzhCVXLDKI",
  authDomain: "whiskey-brix.firebaseapp.com",
  projectId: "whiskey-brix",
  storageBucket: "whiskey-brix.firebasestorage.app",
  messagingSenderId: "1005067574676",
  appId: "1:1005067574676:web:bea75027c55d48f9680381"
})
const db = getFirestore(app)

await updateDoc(doc(db, 'recipes', 'uube7bSxxVb2yQGnkA8n'), {
  ph_min: 3.2,
  ph_max: 3.6,
})
console.log('BLM-CV-001 Cherry Vanilla pH updated to 3.2–3.6')
process.exit(0)
