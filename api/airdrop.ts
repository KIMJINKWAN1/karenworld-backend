import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import { getFullnodeUrl, SuiClient } from "@mysten/sui.js/client";
import { fromB64, Ed25519Keypair } from "@mysten/sui.js/keypairs";
import { execSync } from "child_process";
import * as dotenv from "dotenv";
import key from "../firebase-key.json";

dotenv.config();

initializeApp({
  credential: cert(key as any),
});

const db = getFirestore();
const claimsRef = db.collection("airdrop").doc("claims").collection("claims");

const PRIVATE_KEY = process.env.PRIVATE_KEY!;
const AIRDROP_COIN_ID = process.env.AIR_DROP_COIN_ID!;
const COIN_TYPE = process.env.KAREN_COIN_TYPE!;
const SENDER_ADDRESS = process.env.AIRDROP_WALLET_ADDRESS!;
const SEND_AMOUNT = Number(process.env.AIRDROP_AMOUNT || 2_000);

const keypair = Ed25519Keypair.fromSecretKey(fromB64(PRIVATE_KEY).slice(1));
const suiClient = new SuiClient({ url: getFullnodeUrl("mainnet") });

export async function sendToken(recipient: string): Promise<{ txId: string }> {
  const tx = new TransactionBlock();
  const [coin] = tx.splitCoins(tx.object(AIRDROP_COIN_ID), [tx.pure(SEND_AMOUNT)]);
  tx.transferObjects([coin], tx.pure(recipient));
  tx.setGasBudget(100_000_000);

  const result = await suiClient.signAndExecuteTransactionBlock({
    transactionBlock: tx,
    signer: keypair,
    options: { showEffects: true },
  });

  if (result.effects?.status.status !== "success") {
    throw new Error("TX Failed");
  }

  return { txId: result.digest };
}

export async function sendAirdropsBatch(addresses: string[]) {
  for (const address of addresses) {
    const docRef = claimsRef.doc(address);

    const snapshot = await docRef.get();
    if (!snapshot.exists) continue;

    const data = snapshot.data();
    if (data?.status === "sent") {
      console.log(`🚫 Already sent to ${address}, skipping.`);
      continue;
    }

    try {
      const result = await sendToken(address);
      console.log("✅ TX sent:", result.txId);

      console.log("Updating Firestore for", address);
      await docRef.update({
        status: "sent",
        txId: result.txId,
        sentAt: Timestamp.now(),
      });
      console.log("✅ Firestore updated for", address);
    } catch (err) {
      console.error("❌ Failed to send to", address, err);
    }
  }
}