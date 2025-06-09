import type { NextApiRequest, NextApiResponse } from "next";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { fromB64 } from "@mysten/bcs";
import { sendSlackNotification } from "@/utils/slack";
import dotenv from "dotenv";

dotenv.config();

const PRIVATE_KEY = process.env.PRIVATE_KEY!;
const AIRDROP_WALLET_ADDRESS = process.env.AIRDROP_WALLET_ADDRESS!;
const KAREN_COIN_TYPE = process.env.KAREN_COIN_TYPE!;
const AIRDROP_AMOUNT = parseInt(process.env.AIRDROP_AMOUNT || "2000");
const SUI_NETWORK = process.env.SUI_NETWORK || "mainnet";

const client = new SuiClient({ url: getFullnodeUrl(SUI_NETWORK) });
const keypair = Ed25519Keypair.fromSecretKey(fromB64(PRIVATE_KEY).slice(1));

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  res.setHeader("Access-Control-Allow-Origin", "*");

  const { wallet } = req.body;

  if (!wallet || typeof wallet !== "string") {
    return res.status(400).json({ error: "Missing wallet address" });
  }

  try {
    const tx = await client.transactionBlock();
    tx.setSender(keypair.getPublicKey().toSuiAddress());
    tx.setGasBudget(100_000_000);

    tx.moveCall({
      target: `${process.env.KAREN_COIN_OBJECT_ID}::airdrop::send_to`,
      arguments: [
        tx.object(AIRDROP_WALLET_ADDRESS),
        tx.pure(wallet),
        tx.pure(KAREN_COIN_TYPE),
        tx.pure(AIRDROP_AMOUNT.toString()),
      ],
    });

    const result = await client.signAndExecuteTransactionBlock({
      signer: keypair,
      transactionBlock: tx,
    });

    await sendSlackNotification(`✅ *Airdrop Sent!*\n• 🧾 Wallet: \`${wallet}\`\n• 🔁 Tx: ${result.digest}`);

    return res.status(200).json({
      success: true,
      digest: result.digest,
      amount: AIRDROP_AMOUNT,
    });
  } catch (err: any) {
    console.error("❌ Airdrop Error:", err.message || err);
    return res.status(500).json({ error: err.message || "Airdrop execution failed" });
  }
}













