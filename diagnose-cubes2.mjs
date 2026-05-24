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

// Check the batch record
const batchSnap = await getDoc(doc(db, 'batches', 'uPKsI8AsPkC4sjDhNvnl'))
console.log('Batch exists:', batchSnap.exists())
if (batchSnap.exists()) console.log('Batch data:', JSON.stringify(batchSnap.data(), null, 2))

// Check the freeze test record
const ftSnap = await getDoc(doc(db, 'freeze_tests', '1Tz0wK8bFYytG8QaIMuU'))
console.log('\nFreeze test exists:', ftSnap.exists())
if (ftSnap.exists()) console.log('Freeze test data:', JSON.stringify(ftSnap.data(), null, 2))

// Check all batches
const batchesSnap = await getDocs(collection(db, 'batches'))
console.log('\nAll batches:')
batchesSnap.docs.forEach(d => {
  const data = d.data()
  console.log(`  ${d.id}: batch_id=${data.batch_id}, sku=${data.sku}, date=${data.date}, created=${data.created_at?.slice(0,19)}`)
})

process.exit(0)
