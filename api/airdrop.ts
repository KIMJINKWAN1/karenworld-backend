import { Ed25519Keypair, fromB64, RawSigner, JsonRpcProvider, Connection } from "@mysten/sui.js";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as dotenv from "dotenv";
import serviceAccount from "./firebase-key.json";

dotenv.config();

const PRIVATE_KEY = process.env.PRIVATE_KEY!;
const AIRDROP_COIN_ID = process.env.AIR_DROP_COIN_ID!;
const COIN_TYPE = process.env.KAREN_COIN_TYPE!;
const SENDER_ADDRESS = process.env.AIRDROP_WALLET_ADDRESS!;
const AMOUNT_PER_USER = Number(process.env.AIRDROP_AMOUNT || "2000");

const connection = new Connection({ fullnode: "https://fullnode.mainnet.sui.io" });
const provider = new JsonRpcProvider(connection);
const keypair = Ed25519Keypair.fromSecretKey(fromB64(PRIVATE_KEY));
const signer = new RawSigner(keypair, provider);

initializeApp({
  credential: cert(serviceAccount as any),
});
const db = getFirestore();
const claimsRef = db.collection("airdrop").doc("claims").collection("claims");

export async function sendAirdropsBatch(addresses: string[]) {
  console.log(`📦 Batch Airdrop Started. Targets: ${addresses.length}`);
  for (const addr of addresses) {
    const docRef = claimsRef.doc(addr);
    const doc = await docRef.get();

    if (doc.exists && doc.data()?.status === "sent") {
      console.log(`⛔ Already sent to ${addr}, skipping...`);
      continue;
    }

    try {
      const tx = await signer.pay({
        inputCoins: [AIRDROP_COIN_ID],
        recipients: [addr],
        amounts: [AMOUNT_PER_USER],
        gasBudget: 100_000_000,
      });

      await docRef.set({
        status: "sent",
        txId: tx.digest,
        amount: AMOUNT_PER_USER,
        timestamp: Date.now(),
      });
      console.log(`✅ Sent ${AMOUNT_PER_USER} KAREN to ${addr} | TX: ${tx.digest}`);
    } catch (err) {
      console.error(`❌ Failed to send to ${addr}:`, err);
    }

    // 안전을 위한 간단한 delay (200ms)
    await new Promise((res) => setTimeout(res, 200));
  }

  console.log("🎉 Batch airdrop complete.");
}

// 샘플 실행 예시
(async () => {
  const snapshot = await claimsRef.where("status", "!=", "sent").limit(100).get();
  const addresses = snapshot.docs.map(doc => doc.id);
  if (addresses.length > 0) {
    await sendAirdropsBatch(addresses);
  } else {
    console.log("🛑 No unsent addresses found.");
  }
})();
