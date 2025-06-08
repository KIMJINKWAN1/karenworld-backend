import type { NextApiRequest, NextApiResponse } from "next";
import { getFullnodeUrl, SuiClient } from "@mysten/sui.js/client";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import { fromB64 } from "@mysten/sui.js/utils";
import { Ed25519Keypair } from "@mysten/sui.js/keypairs/ed25519";

const PRIVATE_KEY = process.env.PRIVATE_KEY!;
const TOKEN_TYPE = process.env.KAREN_COIN_TYPE!;
const CLAIM_AMOUNT = Number(process.env.AIRDROP_AMOUNT ?? 2000);
const DISTRIBUTOR = process.env.AIRDROP_WALLET_ADDRESS!;
const client = new SuiClient({ url: getFullnodeUrl("mainnet") });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const { wallet } = req.body;

  if (!wallet || typeof wallet !== "string") {
    return res.status(400).json({ error: "Invalid wallet address" });
  }

  try {
    const keypair = Ed25519Keypair.fromSecretKey(fromB64(PRIVATE_KEY!).slice(1));
    const tx = new TransactionBlock();

    const coin = tx.splitCoins(tx.object(DISTRIBUTOR!), [tx.pure(CLAIM_AMOUNT)]);
    tx.transferObjects([coin], tx.pure(wallet));

    const result = await client.signAndExecuteTransactionBlock({
      signer: keypair,
      transactionBlock: tx,
      options: {
        showEffects: true,
      },
    });

    const digest = result.digest;
    return res.status(200).json({ success: true, digest, amount: CLAIM_AMOUNT });
  } catch (err: any) {
    console.error("❌ Airdrop error:", err.message || err);
    return res.status(500).json({ error: "Airdrop failed" });
  }
}





