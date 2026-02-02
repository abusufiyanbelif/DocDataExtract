import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const app = initializeApp({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
});

const db = getFirestore(app);

async function test() {
  const snap = await getDocs(collection(db, 'users'));
  console.log('Client Firestore OK, docs:', snap.size);
}

test().catch(console.error);
