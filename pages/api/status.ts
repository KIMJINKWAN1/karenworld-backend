import { NextApiRequest, NextApiResponse } from "next";
import { admindb } from "@/firebase/admin";

// 환경변수
const COLLECTION_PATH = process.env.AIRDROP_COLLECTION_PATH || "airdrop/prod/claims";
const MAX_AIRDROP = parseInt(process.env.MAX_AIRDROP || "20000000");
const AIRDROP_AMOUNT = parseInt(process.env.AIRDROP_AMOUNT || "2000");

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // ✅ CORS 설정
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method !== "GET") {
    return res.status(405).json({ success: false, error: "Method Not Allowed" });
  }

  try {
    const snapshot = await admindb.collection(COLLECTION_PATH).get();
    const claimedCount = snapshot.size; // ✅ 청구한 지갑 수
const totalClaimed = claimedCount * 2000;
const remaining = MAX_AIRDROP - totalClaimed;

  return res.status(200).json({
  success: true,
  claimedCount,            // ✅ 지갑 수
  totalClaimed,            // ✅ 전체 수령된 토큰 수량
  remaining,               // ✅ 잔여 토큰
  total: MAX_AIRDROP,      // ✅ 전체 에어드랍 한도
  percent: (totalClaimed / MAX_AIRDROP) * 100, // ✅ 퍼센트
});

  } catch (err) {
    console.error("❌ Error in /api/status:", err);
    return res.status(500).json({ success: false, error: "Internal Server Error" });
  }
}

