// Remove batch_cubes records whose parent batch or freeze_test no longer exists
// Run with: node cleanup-orphan-cubes.mjs
import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, doc, getDoc, deleteDoc } from 'firebase/firestore'

const app = initializeApp({
  apiKey: "AIzaSyAAK6kSWq_7AWXOOvHyOSrN9lzhCVXLDKI",
  authDomain: "whiskey-brix.firebaseapp.com",
  projectId: "whiskey-brix",
  storageBucket: "whiskey-brix.firebasestorage.app",
  messagingSenderId: "1005067574676",
  appId: "1:1005067574676:web:bea75027c55d48f9680381"
})
const db = getFirestore(app)

const cubesSnap = await getDocs(collection(db, 'batch_cubes'))
const cubes = cubesSnap.docs.map(d => ({ id: d.id, ref: d.ref, ...d.data() }))
console.log(`[cleanup] ${cubes.length} batch_cubes total`)

// Check each unique batch_id
const checkedBatches = {}
let deleted = 0

for (const cube of cubes) {
  if (checkedBatches[cube.batch_id] === undefined) {
    const snap = await getDoc(doc(db, 'batches', cube.batch_id))
    checkedBatches[cube.batch_id] = snap.exists()
  }
  if (!checkedBatches[cube.batch_id]) {
    console.log(`[cleanup] deleting orphan cube ${cube.id} (batch ${cube.batch_id} not found)`)
    await deleteDoc(cube.ref)
    deleted++
  }
}

console.log(`[cleanup] done — ${deleted} orphan cube(s) deleted`)
process.exit(0)
