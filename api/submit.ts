import type { Request, Response } from "express";
import { SuiClient, getFullnodeUrl } from "@mysten/sui.js";
import { Ed25519Keypair } from "@mysten/sui.js/keypairs/ed25519";
import { fromB64 } from "@mysten/bcs";
import { adminDb } from "../firebase/admin";
import { sendSlackNotification } from "../utils/slack";

const CLAIM_AMOUNT = 2_000_000_000_000; // 2,000 KAREN with 9 decimals
const COIN_OBJECT_ID = process.env.AIR_DROP_COIN_ID!;
const PRIVATE_KEY = process.env.PRIVATE_KEY!;
const COLLECTION_PATH = "airdrop/claims/claims";

const sui = new SuiClient({ url: getFullnodeUrl("testnet") });
const keypair = Ed25519Keypair.fromSecretKey(fromB64(PRIVATE_KEY));

export default async function handler(req: Request, res: Response) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const { wallet } = req.body;
  if (!wallet || typeof wallet !== "string") {
    return res.status(400).json({ error: "Invalid wallet address" });
  }

  const docRef = adminDb.collection(COLLECTION_PATH).doc(wallet);
  const existing = await docRef.get();
  if (existing.exists) {
    return res.status(200).json({ error: "This wallet already claimed the airdrop." });
  }

  try {
    const tx = await sui.pay({
      signer: keypair,
      inputCoins: [COIN_OBJECT_ID],
      recipients: [wallet],
      amounts: [CLAIM_AMOUNT],
    });

    const effects = await sui.getTransactionBlock({
      digest: tx.digest,
      options: { showEffects: true },
    });

    if (effects.effects?.status.status !== "success") {
      await sendSlackNotification(`❌ TX Failed: ${tx.digest}`);
      return res.status(500).json({ error: "Transaction failed", digest: tx.digest });
    }

    await docRef.set({
      status: "sent",
      txId: tx.digest,
      amount: CLAIM_AMOUNT,
      sentAt: new Date(),
    });

    await sendSlackNotification(`✅ Airdropped to ${wallet}\nTx: ${tx.digest}`);

    return res.status(200).json({ success: true, amount: CLAIM_AMOUNT });
  } catch (err) {
    await sendSlackNotification(`🚨 Error during airdrop to ${wallet}: ${(err as Error).message}`);
    return res.status(500).json({ error: "Airdrop failed", detail: (err as Error).message });
  }
}
module.exports = handler;