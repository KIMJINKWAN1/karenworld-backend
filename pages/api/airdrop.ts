import type { NextApiRequest, NextApiResponse } from "next";
import { Ed25519Keypair } from "@mysten/sui.js/keypairs/ed25519";
import { fromB64 } from "@mysten/sui.js/utils";
import { SuiClient, getFullnodeUrl } from "@mysten/sui.js/client";
import { TransactionBlock } from "@mysten/sui.js/transactions";
import { admindb } from "@/firebase/admin";

const COLLECTION_PATH = process.env.AIRDROP_COLLECTION_PATH || "airdrop/prod/claims";
const airdropAmount = Number(process.env.AIRDROP_AMOUNT || 2000);
const maxAirdrop = Number(process.env.MAX_AIRDROP || 20000000);
const airdropWallet = process.env.AIRDROP_WALLET_ADDRESS!;
const privateKey = process.env.SUI_PRIVKEY!;
const tokenId = process.env.KAREN_COIN_OBJECT_ID!;
const tokenType = process.env.KAREN_COIN_TYPE!;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // ✅ CORS 설정
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end(); // preflight 처리
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const { wallet } = req.body;

  if (!wallet || typeof wallet !== "string") {
    return res.status(400).json({ error: "Invalid wallet" });
  }

  const docRef = admindb.collection(COLLECTION_PATH).doc(wallet);
  const existing = await docRef.get();

  if (existing.exists && existing.data()?.digest) {
    return res.status(400).json({ error: "Already claimed" });
  }

  // 누적 지급량 확인
  const snapshot = await admindb.collection(COLLECTION_PATH).get();
  const totalClaimed = snapshot.docs.length * airdropAmount;
  if (totalClaimed + airdropAmount > maxAirdrop) {
    return res.status(400).json({ error: "Airdrop limit reached" });
  }

  // 트랜잭션 블록 생성
  const tx = new TransactionBlock();
  tx.transferObjects(
    [tx.object(tokenId)],
    tx.pure(wallet)
  );

  // Sui 클라이언트 및 키페어 초기화
  const keypair = Ed25519Keypair.fromSecretKey(fromB64(privateKey).slice(1));
  const network = (process.env.SUI_NETWORK || "mainnet") as "mainnet" | "testnet" | "devnet" | "localnet";
  const client = new SuiClient({ url: getFullnodeUrl(network) });

  try {
    const result = await client.signAndExecuteTransactionBlock({
      transactionBlock: tx,
      signer: keypair,
      options: { showEffects: true },
    });

    if (result.effects?.status.status !== "success") {
      throw new Error("Transaction failed");
    }

    await docRef.set({ wallet, timestamp: Date.now(), digest: result.digest });

    return res.status(200).json({ success: true, amount: airdropAmount, digest: result.digest });
  } catch (err: any) {
    console.error("❌ Airdrop error:", err.message || err);
    await docRef.set({ wallet, timestamp: Date.now(), error: err.message || "Failed" }, { merge: true });
    return res.status(500).json({ error: err.message || "Airdrop failed" });
  }
}







