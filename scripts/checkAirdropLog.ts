import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

// Firebase 초기화 (이미 초기화되어 있다면 생략)
if (!admin.apps.length) {
  const serviceAccount = require('./firebase-key.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = getFirestore();

async function checkAirdropStatus(address: string) {
  try {
    const docRef = db.collection('airdrop').doc('claims').collection('claims').doc(address);
    const doc = await docRef.get();

    if (!doc.exists) {
      console.log(`❌ No airdrop record found for ${address}`);
      return;
    }

    const data = doc.data();
    console.log(`✅ Airdrop record for ${address}:`);
    console.log(`Status: ${data?.status}`);
    console.log(`TxID: ${data?.txId}`);
    console.log(`Sent At: ${data?.sentAt?.toDate()}`);
  } catch (error) {
    console.error('🔥 Error fetching airdrop status:', error);
  }
}