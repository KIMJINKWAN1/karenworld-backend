import { NextApiRequest, NextApiResponse } from "next";
import { SuiClient, getFullnodeUrl } from "@mysten/sui.js";
import { Ed25519Keypair } from "@mysten/sui.js/keypairs/ed25519";
import { fromB64 } from "@mysten/bcs";
import { adminDb } from "../firebase/admin";
import { sendSlackNotification } from "../utils/slack";

const CLAIM_PER_USER = 2_000_000_000_000; // 2,000 KAREN with 9 decimals
const COLLECTION_PATH = "airdrop/claims/claims";
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
  const snapshot = await docRef.get();
  if (snapshot.exists) {
    return res.status(200).json({ error: "This wallet already claimed the airdrop." });
  }

  try {
    const keypair = Ed25519Keypair.fromSecretKey(fromB64(process.env.PRIVATE_KEY!));
    const result = await sui.pay({
      signer: keypair,
      inputCoins: [process.env.AIR_DROP_COIN_ID!],
      recipients: [wallet],
      amounts: [CLAIM_PER_USER],
      gasBudget: 100_000_000,
    });

    const tx = await sui.waitForTransactionBlock({ digest: result.digest, options: { showEffects: true } });
    const success = tx.effects?.status.status === "success";

    if (!success) {
      await sendSlackNotification(`❌ Airdrop TX Failed: ${wallet}\nTX: ${result.digest}`);
      return res.status(500).json({ error: "Airdrop transaction failed" });
    }

    await docRef.set({
      status: "sent",
      txId: result.digest,
      amount: CLAIM_PER_USER,
      sentAt: new Date(),
    });

    await sendSlackNotification(`✅ Airdrop sent to ${wallet}\nTX: ${result.digest}`);
    return res.status(200).json({ success: true, amount: CLAIM_PER_USER });

  } catch (err) {
    console.error("❌ TX Error:", err);
    await sendSlackNotification(`❌ Airdrop Error: ${wallet}\n${err}`);
    return res.status(500).json({ error: "Airdrop failed" });
  }
}
module.exports = handler;