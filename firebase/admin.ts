import admin from "firebase-admin";

const serviceAccount = {
  type: process.env.FIREBASE_TYPE,
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: process.env.FIREBASE_AUTH_URI,
  token_uri: process.env.FIREBASE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_CERT_URL,
  client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL,
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
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








