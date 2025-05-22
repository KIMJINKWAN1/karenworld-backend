import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getOrCreateClient } from "./_suiClient";
import { PRIVATE_KEY, AIRDROP_WALLET_ADDRESS, AIR_DROP_COIN_ID, KAREN_COIN_TYPE } from "./_env";

const CLAIM_PER_USER = 2000;

export async function sendAirdropToWallet(address: string) {
  const db = getFirestore();
  const claimsRef = db.collection("airdrop").doc("claims").collection("claims");
  const docRef = claimsRef.doc(address);
  const doc = await docRef.get();

  if (doc.exists && doc.data()?.status === "sent") {
    console.log("⚠️ 이미 전송된 지갑입니다:", address);
    return;
  }

  const sui = await getOrCreateClient(PRIVATE_KEY);
  const tx = await sui.pay({
    inputCoins: [AIRDROP_COIN_ID],
    recipients: [address],
    amounts: [CLAIM_PER_USER],
    gasBudget: 100000000,
  });

  console.log("✅ 전송 완료:", tx.digest);

  await docRef.set({
    status: "sent",
    txId: tx.digest,
    amount: CLAIM_PER_USER,
    sentAt: Timestamp.now(),
  });

  console.log("✅ Firestore 기록 완료:", address);
}