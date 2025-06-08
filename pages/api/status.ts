import type { NextApiRequest, NextApiResponse } from "next";
import { admindb } from "@/firebase/admin";

// 환경 변수에서 최대 에어드랍 수량 가져오기
const MAX_AIRDROP = parseInt(process.env.MAX_AIRDROP || "20000000", 10);
const COLLECTION_PATH = process.env.AIRDROP_COLLECTION_PATH || "airdrop/prod/claims";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // ✅ CORS 처리
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const snapshot = await admindb.collection(COLLECTION_PATH).get();
    const totalClaims = snapshot.size;

    const claimed = totalClaims * 2000;
    const remaining = Math.max(0, MAX_AIRDROP - claimed);
    const percent = MAX_AIRDROP > 0 ? claimed / MAX_AIRDROP : 0;

    return res.status(200).json({
      claimed,
      remaining,
      total: MAX_AIRDROP,
      percent,
    });
  } catch (err: any) {
    console.error("❌ Status handler error:", err.message || err);
    return res.status(500).json({ error: "Failed to fetch status" });
  }
}
