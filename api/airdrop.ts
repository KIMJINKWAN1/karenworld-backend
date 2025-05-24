import { SuiClient, getFullnodeUrl, TransactionBlock } from "@mysten/sui.js/client";
import { Ed25519Keypair } from "@mysten/sui.js/keypairs/ed25519";
import { fromB64 } from "@mysten/bcs";
import { adminDb } from "../firebase/admin";
import { Timestamp } from "firebase-admin/firestore";
import { sendSlackNotification } from "../utils/slack";
import type { NextApiRequest, NextApiResponse } from "next";

// Constants
const COLLECTION_PATH = "airdrop/claims/claims";
const CLAIM_PER_USER = 2_000_000_000_000; // 2,000 KAREN with 9 decimals
const MAX_AIRDROP = 42_069_000_000_000;   // 42,069,000 KAREN total

const COIN_OBJECT_ID = process.env.AIRDROP_COIN_ID!;
const PRIVATE_KEY = process.env.PRIVATE_KEY!;
const PACKAGE_ID = process.env.PACKAGE_ID!;
const MODULE_NAME = process.env.MODULE_NAME || "karen_airdrop";

const keypair = Ed25519Keypair.fromSecretKey(fromB64(PRIVATE_KEY));
const sui = new SuiClient({ url: getFullnodeUrl("testnet") });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { wallet } = req.body;
  if (!wallet || typeof wallet !== "string" || !/^0x[0-9a-fA-F]{40,64}$/.test(wallet)) {
    return res.status(400).json({ error: "Invalid wallet address" });
  }

  const docRef = adminDb.collection(COLLECTION_PATH).doc(wallet);
  const docSnap = await docRef.get();
  if (docSnap.exists) {
    return res.status(400).json({ error: "Airdrop already claimed" });
  }

  try {
    const tx = new TransactionBlock();
    tx.moveCall({
      target: `${PACKAGE_ID}::${MODULE_NAME}::claim_airdrop`,
      arguments: [
        tx.object(COIN_OBJECT_ID),
        tx.pure(wallet),
      ],
    });

    const result = await sui.signAndExecuteTransactionBlock({
      signer: keypair,
      transactionBlock: tx,
      options: { showEffects: true },
    });

    const success = result.effects?.status.status === "success";
    if (!success) {
      return res.status(500).json({ error: "Airdrop transaction failed" });
    }

    const digest = result.digest;

    await docRef.set({
      wallet,
      claimedAt: Timestamp.now(),
      txDigest: digest,
    });

    await sendSlackNotification(`🎉 Airdrop claimed by ${wallet}\n🔗 Tx: https://suiexplorer.com/txblock/${digest}?network=testnet`);

    return res.status(200).json({ success: true, amount: CLAIM_PER_USER, digest });
  } catch (err) {
    console.error("❌ Airdrop error:", err);
    return res.status(500).json({ error: "Failed to process airdrop" });
  }
}