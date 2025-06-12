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

// ✅ 아직 에어드랍 처리되지 않은 대기열 주소 리스트 조회
export const listUnclaimedRecipients = async (): Promise<string[]> => {
  const snapshot = await db
    .collection('airdrop')
    .doc('claims')
    .collection('queue')
    .get();
  return snapshot.docs.map((doc) => doc.id);
};

// ✅ 이미 에어드랍 처리되었는지 확인
export const checkRecipientClaimStatus = async (wallet: string): Promise<boolean> => {
  const doc = await db
    .collection('airdrop')
    .doc('claims')
    .collection('claims')
    .doc(wallet)
    .get();
  return doc.exists;
};

// ✅ 에어드랍 완료로 기록 및 대기열 제거
export const markClaimed = async (wallet: string, txDigest: string, amount: number) => {
  const claimsRef = db.collection('airdrop').doc('prod').collection('claims').doc(wallet);
  await claimsRef.set({
    wallet,
    txDigest,
    amount,
    claimedAt: Date.now(),
    claimedAt_iso: new Date().toISOString(),
    note: [
      '📥 수동 처리된 자동 에어드랍 기록입니다.',
      '🔐 지갑 주소는 Sui Mainnet 기준입니다.',
      '📦 프로젝트: KAREN_WORLD',
    ].join('\n'),
  });

  // 대기열에서 제거
  await db
    .collection('airdrop')
    .doc('claims')
    .collection('queue')
    .doc(wallet)
    .delete();
};
