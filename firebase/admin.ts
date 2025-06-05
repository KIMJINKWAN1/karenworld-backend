// firebase/admin.ts
import admin from 'firebase-admin';

const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!admin.apps?.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey,
    }),
  });
}

export const db = admin.firestore();
export const admindb = db;

/**
 * 수령 여부 확인 (중복 방지)
 */
export async function checkRecipientClaimStatus(address: string) {
  const doc = await db.doc(`${process.env.AIRDROP_COLLECTION_PATH}/${address}`).get();
  return doc.exists;
}

/**
 * 수령 기록 저장
 */
export async function markClaimed(address: string, txDigest: string, amount?: number) {
  await db.doc(`${process.env.AIRDROP_COLLECTION_PATH}/${address}`).set({
    address,
    txDigest,
    amount,
    claimedAt: Date.now(),
  });
}

/**
 * 중복 수령 방지용 리스트
 */
export async function listUnclaimedRecipients(): Promise<string[]> {
  const snapshot = await admindb
    .collection('airdrop')
    .doc('queue')
    .collection('queue')
    .get();

  const list: string[] = [];
  snapshot.forEach((doc) => {
    if (doc.exists) list.push(doc.id);
  });

  return list;
}

/**
 * Firestore에 수령 대상 추가
 */
export async function addRecipient(address: string, amount: number) {
  const ref = admindb
    .collection('airdrop')
    .doc('recipients')
    .collection('list')
    .doc(address);

  await ref.set({
    airdropAmount: Math.floor(amount),
    addedAt: Date.now(),
  });
}








