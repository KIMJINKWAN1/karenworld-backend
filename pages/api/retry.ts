import type { NextApiRequest, NextApiResponse } from "next";
import { admindb } from "@/firebase/admin";
import { SUI_FAUCET_TOKEN, PRIVATE_KEY } from "@/lib/constants";
import { getFullnodeUrl, SuiClient } from "@mysten/sui.js/client";
import { Ed25519Keypair } from "@mysten/sui.js/keypairs/ed25519";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import { fromB64 } from "@mysten/sui.js/utils";

const sui = new SuiClient({ url: getFullnodeUrl("mainnet") });
const secretKey = fromB64(PRIVATE_KEY).slice(1); // remove leading byte
const keypair = Ed25519Keypair.fromSecretKey(secretKey);
const sender = keypair.getPublicKey().toSuiAddress();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { wallet } = req.body;
  if (!wallet) return res.status(400).json({ success: false, message: "No wallet provided" });

  try {
    const tx = new TransactionBlock();
    tx.transferObjects([tx.object(SUI_FAUCET_TOKEN)], tx.pure(wallet));
    tx.setGasBudget(100_000_000); // 0.1 SUI

    const result = await sui.signAndExecuteTransactionBlock({
      signer: keypair,
      transactionBlock: tx,
      options: { showEffects: true },
    });

    const digest = result.digest;
    await admindb.collection("airdrop").doc("claims").collection("logs").doc(wallet).update({
      retriedAt: Date.now(),
      retryDigest: digest,
    });

    return res.status(200).json({ success: true, digest });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}



