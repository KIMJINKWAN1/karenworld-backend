import admin from 'firebase-admin';
import serviceAccount from './firebase-key.json';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
  });
}

export const adminDb = admin.firestore();

/**
 * 에어드랍 대상자 등록
 * @param address 수령자 지갑 주소 (string)
 * @param amount 에어드랍 토큰 수량 (number)
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
 * @param address 수령자 지갑 주소
 * @returns claimed 여부 (boolean) 또는 null (없을 경우)
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
 * 에어드랍 수령 처리 및 트랜잭션 로그 기록
 * @param address 수령자 지갑 주소
 * @param txHash 트랜잭션 해시
 * @param amount 전송 토큰 수량
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
 * 아직 수령하지 않은 대상자 목록 조회
 * @returns 수령 안 한 수령자 주소 배열
 */
export async function listUnclaimedRecipients(): Promise<string[]> {
  const querySnapshot = await db.collection('airdrop').doc('recipients').collection('list')
    .where('claimed', '==', false)
    .get();

  const addresses = querySnapshot.docs.map(doc => doc.id);
  console.log('Unclaimed recipients:', addresses);
  return addresses;
}

export { db };
