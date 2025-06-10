import type { NextApiRequest, NextApiResponse } from "next";
import { getFirestore } from "firebase-admin/firestore";
import { admindb } from "@/firebase/admin";
import { logger, logAirdropResult } from "@/utils/logger";
import { sendSlackNotification } from "@/utils/slack";

import { SuiClient, getFullnodeUrl } from "@mysten/sui.js/client";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import { Ed25519Keypair } from "@mysten/sui.js/keypairs/ed25519";
import { fromB64, normalizeSuiAddress } from "@mysten/sui.js/utils";

const db = getFirestore();
const client = new SuiClient({ url: getFullnodeUrl(process.env.SUI_NETWORK as any) });

const AIRDROP_AMOUNT = Number(process.env.AIRDROP_AMOUNT || "2000");
const MAX_AIRDROP = Number(process.env.MAX_AIRDROP || "20000000");
const COLLECTION_PATH = process.env.AIRDROP_COLLECTION_PATH!;
const PRIVATE_KEY = process.env.SUI_PRIVKEY!;
const COIN_TYPE = process.env.KAREN_COIN_TYPE!;
const COIN_OBJECT_ID = process.env.KAREN_COIN_OBJECT_ID!;

const PACKAGE_ID = process.env.KAREN_COIN_PACKAGE_ID!;
const MODULE_NAME = "karen_world";
const TARGET = `${PACKAGE_ID}::${MODULE_NAME}::transfer`;

export const config = {
  api: {
    bodyParser: true,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', ['POST']);
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { address } = req.body;

    if (
      !address ||
      typeof address !== "string" ||
      !address.startsWith("0x") ||
      !/^[0-9a-fA-F]+$/.test(address.slice(2))
    ) {
      return res.status(400).json({ error: "Invalid wallet address" });
    }

    const recipient = normalizeSuiAddress(address);
    const snapshot = await db.collection(COLLECTION_PATH).doc(recipient).get();

    if (snapshot.exists) {
      return res.status(409).json({ error: "Already claimed" });
    }

    const current = await db.collection(COLLECTION_PATH).count().get();
    const currentCount = current.data().count || 0;

    if (currentCount * AIRDROP_AMOUNT >= MAX_AIRDROP) {
      return res.status(403).json({ error: "Airdrop quota exceeded" });
    }

    const tx = new TransactionBlock();

    tx.moveCall({
      target: `${process.env.KAREN_COIN_PACKAGE_ID!}::karen_world::transfer`,
      typeArguments: [COIN_TYPE],
      arguments: [
        tx.object(COIN_OBJECT_ID),
        tx.pure(recipient),
        tx.pure(Number(AIRDROP_AMOUNT), "u64"),
      ],
    });

    const keypair = Ed25519Keypair.fromSecretKey(fromB64(PRIVATE_KEY));

    const result = await client.signAndExecuteTransactionBlock({
      transactionBlock: tx,
      signer: keypair,
      options: { showEffects: true },
    });

    const timestamp = Date.now();

    await db.collection(COLLECTION_PATH).doc(recipient).set({
      address: recipient,
      txDigest: result.digest,
      timestamp,
    });

    await logAirdropResult({
      wallet: recipient,
      status: "success",
      digest: result.digest,
      timestamp,
    });

    return res.status(200).json({ success: true, digest: result.digest });

  } catch (err: any) {
    const timestamp = Date.now();

    const message = err?.message || "Unknown error";
    const stack = err?.stack || "";
    const code = err?.code || "UNKNOWN_CODE";
    const kind = err?.kind || "UnknownKind";

    console.error("❌ Airdrop transaction failed");
    console.error("🔎 Error Message:", message);
    console.error("🧩 Kind:", kind);
    console.error("🔐 Code:", code);
    console.error("📦 Stack:", stack.split("\n")[0]);
    console.log("🔥 METHOD:", req.method);
    console.log("🔥 HEADERS:", req.headers);

    await logAirdropResult({
      wallet: req.body?.address || "unknown",
      status: "error",
      error: `[${code}] ${message} | ${stack.split("\n")[0]}`,
      timestamp,
    });

    await sendSlackNotification(
      `❌ *Airdrop Failed*\n• 🧾 Wallet: \`${req.body?.address || "unknown"}\`\n• 💥 Error: \`${message}\`\n• 🧩 Code: \`${code}\`\n• 🧠 Kind: \`${kind}\``
    );

    return res.status(500).json({ error: "Airdrop failed", detail: message });
  }
}
