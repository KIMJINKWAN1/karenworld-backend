import { NextApiRequest, NextApiResponse } from "next";
import { SuiClient, getFullnodeUrl, SuiTransactionBlock } from "@mysten/sui/client";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { fromB64 } from "@mysten/bcs";
import { adminDb } from "../firebase/admin";
import { sendSlackNotification } from "../utils/slack";

const CLAIM_PER_USER = 2_000_000_000_000; // 2,000 KAREN (RAW)
const MAX_AIRDROP = 20_000_000_000_000_000; // 20,000,000 KAREN (RAW)
const COLLECTION_PATH = "airdrop/claims/claims";

const sui = new SuiClient({ url: getFullnodeUrl("testnet") });
const keypair = Ed25519Keypair.fromSecretKey(fromB64(process.env.PRIVATE_KEY!));
const KAREN_COIN_OBJECT_ID = process.env.KAREN_COIN_OBJECT_ID!;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { wallet } = req.body;
  if (!wallet || typeof wallet !== "string" || !wallet.startsWith("0x")) {
    return res.status(400).json({ error: "Invalid wallet address" });
  }

  const docRef = adminDb.collection(COLLECTION_PATH).doc(wallet);
  const existing = await docRef.get();
  if (existing.exists) {
    return res.status(400).json({ error: "Already claimed" });
  }

  try {
    const tx = new TransactionBlock();
    tx.pay({
      inputCoins: [KAREN_COIN_OBJECT_ID],
      recipients: [wallet],
      amounts: [CLAIM_PER_USER],
    });

    const result = await sui.signAndExecuteTransactionBlock({
      signer: keypair,
      transactionBlock: tx,
      options: {
        showEffects: true,
        showEvents: true,
      },
    });

    const status = result.effects?.status?.status;
    if (status !== "success") {
      console.error("❌ Transaction failed:", result.effects?.status);
      return res.status(500).json({ error: "Transaction failed" });
    }

    await docRef.set({ wallet, timestamp: Date.now() });

    await sendSlackNotification(`🎉 Airdrop sent to ${wallet}`);

    return res.status(200).json({
      success: true,
      digest: result.digest,
      amount: CLAIM_PER_USER / 1_000_000_000, // 표시용 KAREN 단위
    });
  } catch (err: any) {
    console.error("❌ Error during airdrop:", err);
    return res.status(500).json({ error: "Airdrop failed" });
  }
}