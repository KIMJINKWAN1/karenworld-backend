import type { NextApiRequest, NextApiResponse } from "next";
import { admindb } from "@/firebase/admin";

const COLLECTION_PATH = "airdrop/prod/claims";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // ✅ CORS 헤더 설정
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // ✅ OPTIONS preflight 요청 처리
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const snapshot = await admindb.collection(COLLECTION_PATH).get();

    const total = Number(process.env.MAX_AIRDROP || 20000000);
    const amountPerClaim = Number(process.env.AIRDROP_AMOUNT || 2000);
    const claimCount = snapshot.size;
    const claimedAmount = claimCount * amountPerClaim;
    const remaining = total - claimedAmount;

    return res.status(200).json({
      claimed: claimedAmount,
      remaining,
      total,
      percent: Number(((claimedAmount / total) * 100).toFixed(2)),
    });
  } catch (err: any) {
    console.error("❌ status.ts error:", err);
    return res.status(500).json({ error: "Failed to load airdrop status" });
  }
}
