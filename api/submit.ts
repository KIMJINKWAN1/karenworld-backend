import { NextApiRequest, NextApiResponse } from "next";
import { SuiClient, getFullnodeUrl } from "@mysten/sui.js/client";
import { Ed25519Keypair } from "@mysten/sui.js/keypairs/ed25519";
import { fromB64 } from "@mysten/bcs";
import { adminDb } from "../../firebase/admin";
import { sendSlackNotification } from "../../utils/slack";

const CLAIM_PER_USER = 2_000_000_000_000; // 2,000 KAREN in raw (decimals = 9)
const COLLECTION_PATH = "airdrop/claims/claims";

const sui = new SuiClient({ url: getFullnodeUrl("testnet") });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { wallet } = req.body;
  if (!wallet || typeof wallet !== "string") {
    return res.status(400).json({ error: "Invalid wallet address" });
  }

  const docRef = adminDb.collection(COLLECTION_PATH).doc(wallet);
  const doc = await docRef.get();

  if (doc.exists) {
    return res.status(400).json({ error: "This wallet already claimed the airdrop." });
  }

  try {
    const keypair = Ed25519Keypair.fromSecretKey(fromB64(process.env.PRIVATE_KEY!));
    const result = await sui.pay({
      signer: keypair,
      inputCoins: [process.env.AIR_DROP_COIN_ID!],
      recipients: [wallet],
      amounts: [CLAIM_PER_USER],
      options: { showEffects: true },
    });

    const status = result.effects?.status?.status;
    if (status !== "success") {
      console.error("❌ SUI Tx Failed:", result.effects?.status?.error ?? "Unknown error");
      return res.status(500).json({ error: "SUI transaction failed", detail: result.effects?.status?.error });
    }

    await docRef.set({
      status: "sent",
      txId: result.digest,
      amount: CLAIM_PER_USER,
      sentAt: new Date(),
    });

    await sendSlackNotification(
      `✅ Airdrop Success\nWallet: ${wallet}\nAmount: ${CLAIM_PER_USER}\nTx: ${result.digest}`
    );

    return res.status(200).json({ success: true, amount: CLAIM_PER_USER });
  } catch (error: any) {
    console.error("Airdrop failed:", error);
    return res.status(500).json({ error: "Internal server error", detail: error.message });
  }
}