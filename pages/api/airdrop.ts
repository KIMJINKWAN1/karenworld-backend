import type { NextApiRequest, NextApiResponse } from "next";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Transaction } from "@mysten/sui/transactions";
import { fromB64 } from "@mysten/bcs";
import { adminDb } from "../firebase/admin";
import { logAirdropEvent } from "../utils/logger";

// Base64 URL-safe → 표준 Base64
function base64UrlToBase64(base64url: string): string {
  return base64url.replace(/-/g, '+').replace(/_/g, '/').padEnd(base64url.length + (4 - base64url.length % 4) % 4, '=');
}

// 환경 설정
const CLAIM_PER_USER = 2000n;
const COLLECTION_PATH = "airdrop/claims/claims";
const KAREN_OBJECT_ID = process.env.KAREN_COIN_OBJECT_ID!;
const rawKey = process.env.PRIVATE_KEY!;
const fixedKey = base64UrlToBase64(rawKey);
const fullSecret = fromB64(fixedKey);
const secretKey = fullSecret.slice(1);
const keypair = Ed25519Keypair.fromSecretKey(secretKey);

const client = new SuiClient({ url: getFullnodeUrl("testnet") });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const { wallet } = req.body;
  if (!wallet || typeof wallet !== "string" || !wallet.startsWith("0x")) {
    return res.status(400).json({ error: "Invalid wallet address" });
  }

  const docRef = adminDb.collection(COLLECTION_PATH).doc(wallet);
  const existing = await docRef.get();
  if (existing.exists) {
    await logAirdropEvent({ wallet, status: "error", error: "Already claimed" });
    return res.status(400).json({ error: "Already claimed" });
  }

  // 가스 코인 조회
  const address = keypair.getPublicKey().toSuiAddress();
  const owned = await client.getOwnedObjects({
    owner: address,
    options: { showType: true, showContent: true },
  });

  const gas = owned.data.find((o) => o.data?.type?.includes("0x2::coin::Coin<0x2::sui::SUI>"))?.data;
  if (!gas) {
    await logAirdropEvent({ wallet, status: "error", error: "No gas coin available" });
    return res.status(500).json({ error: "No gas coin available" });
  }

  try {
    const tx = new Transaction();
    tx.setSender(address);
    tx.setGasPayment([
      {
        objectId: gas.objectId,
        version: gas.version.toString(),
        digest: gas.digest,
      },
    ]);
    tx.setGasBudget(10_000_000);

    const [coinToSend] = tx.splitCoins(tx.object(KAREN_OBJECT_ID), [tx.pure("u64", CLAIM_PER_USER)]);
    tx.transferObjects([coinToSend], wallet);

    const result = await client.signAndExecuteTransaction({
      signer: keypair,
      transaction: tx,
      options: { showEffects: true },
    });

    if (result.effects?.status?.status !== "success") {
      await logAirdropEvent({
        wallet,
        status: "error",
        error: "Transaction failed",
      });
      return res.status(500).json({ error: "Transaction failed" });
    }

    await docRef.set({ wallet, timestamp: Date.now() });
    await logAirdropEvent({
      wallet,
      status: "success",
      digest: result.digest,
    });

    return res.status(200).json({
      success: true,
      digest: result.digest,
      amount: CLAIM_PER_USER,
    });
  } catch (err) {
    await logAirdropEvent({
      wallet,
      status: "error",
      error: (err as Error).message,
    });
    return res.status(500).json({ error: "Airdrop failed" });
  }
}


