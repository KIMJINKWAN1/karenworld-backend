import type { NextApiRequest, NextApiResponse } from "next";
import { adminDb } from "../firebase/admin.ts";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { wallet } = req.body;

  if (!wallet || typeof wallet !== "string") {
    return res.status(400).json({ error: "Invalid or missing wallet address" });
  }

  try {
    // 중복 여부 확인
    const snapshot = await adminDb
      .collection("airdrop/claims/queue")
      .where("wallet", "==", wallet)
      .get();

    if (!snapshot.empty) {
      return res.status(200).json({ success: false, message: "Already in queue" });
    }

    // 큐에 등록
    await adminDb.collection("airdrop/claims/queue").add({
      wallet,
      timestamp: Date.now(),
    });

    return res.status(200).json({ success: true, message: "Wallet added to queue" });
  } catch (error: any) {
    console.error("🔥 Queue insert failed:", error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
}
