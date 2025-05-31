import admin from 'firebase-admin';

const rawKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!rawKey) {
  throw new Error("❌ FIREBASE_SERVICE_ACCOUNT_KEY is missing in .env");
}

const serviceAccount = JSON.parse(rawKey);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export const adminDb = admin.firestore();
export const db = adminDb;

/**
 * 에어드랍 대상자 등록
 */
export async function addRecipient(address: string, amount: number) {
  const ref = db.collection('airdrop').doc('recipients').collection('list').doc(address);

  await ref.set({
    airdropAmount: amount,
    claimed: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  console.log(`Recipient ${address} registered for airdrop with amount ${amount}`);
}

/**
 * 수령 여부 조회
 */
export async function checkRecipientClaimStatus(address: string): Promise<boolean | null> {
  const ref = db.collection('airdrop').doc('recipients').collection('list').doc(address);
  const doc = await ref.get();

  if (!doc.exists) {
    console.log('Recipient not found:', address);
    return null;
  }

  const data = doc.data();
  return data?.claimed ?? false;
}

/**
 * 수령 처리 및 트랜잭션 로그 기록
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
    amount,
    txHash,
    status: 'success',
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(`Claim marked and logged for ${address}`);
}

/**
 * 수령 안 한 대상자 목록 조회
 */
export async function listUnclaimedRecipients(): Promise<string[]> {
  const querySnapshot = await db.collection('airdrop').doc('recipients').collection('list')
    .where('claimed', '==', false)
    .get();

  const addresses = querySnapshot.docs.map(doc => doc.id);
  console.log('Unclaimed recipients:', addresses);
  return addresses;
}



