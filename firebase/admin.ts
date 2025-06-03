import admin from 'firebase-admin';

const {
  FIREBASE_PROJECT_ID,
  FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY,
} = process.env;

if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
  throw new Error('❌ Firebase 환경 변수가 누락되었습니다.');
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: FIREBASE_PROJECT_ID,
      clientEmail: FIREBASE_CLIENT_EMAIL,
      privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
}

export const adminDb = admin.firestore();
export const db = adminDb;

/**
 * 🔹 수령 대상 등록
 */
export async function addRecipient(address: string, amount: number) {
  const ref = db.collection('airdrop').doc('recipients').collection('list').doc(address);

  await ref.set({
    airdropAmount: Math.floor(amount), // 정수 보장
    claimed: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  console.log(`📩 Registered recipient: ${address} (${amount} tokens)`);
}

/**
 * 🔹 수령 여부 확인
 */
export async function checkRecipientClaimStatus(address: string): Promise<boolean | null> {
  const ref = db.collection('airdrop').doc('recipients').collection('list').doc(address);
  const doc = await ref.get();

  if (!doc.exists) {
    console.log(`🛑 Not found: ${address}`);
    return null;
  }

  return doc.data()?.claimed ?? false;
}

/**
 * 🔹 수령 완료 처리 및 로그 저장
 */
export async function markClaimed(address: string, txHash: string, amount: number) {
  const recipientRef = db.collection('airdrop').doc('recipients').collection('list').doc(address);
  const logsRef = db.collection('airdrop').doc('logs').collection('history').doc();

  await recipientRef.update({
    claimed: true,
    claimedAt: admin.firestore.FieldValue.serverTimestamp(),
    txHash,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await logsRef.set({
    address,
    amount: Math.floor(amount),
    txHash,
    status: 'success',
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(`✅ Claimed and logged: ${address}`);
}

/**
 * 🔹 미수령 대상 목록 조회
 */
export async function listUnclaimedRecipients(): Promise<string[]> {
  const snapshot = await db
    .collection('airdrop')
    .doc('recipients')
    .collection('list')
    .where('claimed', '==', false)
    .get();

  const addresses = snapshot.docs.map(doc => doc.id);
  console.log(`🔍 Unclaimed recipients (${addresses.length}):`, addresses);
  return addresses;
}




