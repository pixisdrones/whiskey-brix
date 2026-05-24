import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore'

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
const cubes = cubesSnap.docs.map(d => ({ id: d.id, ...d.data() }))
console.log(`\nTotal batch_cubes: ${cubes.length}`)

// Group by batch_id
const byBatch = {}
for (const c of cubes) {
  if (!byBatch[c.batch_id]) byBatch[c.batch_id] = []
  byBatch[c.batch_id].push(c)
}

for (const [batchId, group] of Object.entries(byBatch)) {
  // Fetch the batch record
  const batchSnap = await getDoc(doc(db, 'batches', batchId))
  const batch = batchSnap.exists() ? batchSnap.data() : null
  console.log(`\nBatch ${batchId} (${batch?.batch_id ?? 'unknown'} | ${batch?.sku ?? '?'} | ${batch?.date ?? '?'}):`)
  console.log(`  ${group.length} cube(s), created: ${group[0].created_at?.slice(0,19) ?? 'unknown'}`)
  console.log(`  status: ${[...new Set(group.map(c => c.status))].join(', ')}`)
  console.log(`  freeze_test_id: ${group[0].freeze_test_id ?? 'null'}`)
}

process.exit(0)
