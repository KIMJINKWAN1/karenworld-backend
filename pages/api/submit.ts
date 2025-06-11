import type { NextApiRequest, NextApiResponse } from "next";
import { getFirestore } from "firebase-admin/firestore";
import { admindb } from "@/firebase/admin";
import { sendSlackNotification } from "@/utils/slack";

const COLLECTION_PATH = process.env.AIRDROP_COLLECTION_PATH || "airdrop/claims/claims";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // ✅ CORS 설정
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const { wallet } = req.body;
  if (!wallet || typeof wallet !== "string") {
    return res.status(400).json({ error: "Missing wallet address" });
  }

    try {
    const db = admindb;  // ✅ 수정 완료
    const docRef = db.collection(COLLECTION_PATH).doc(wallet);

    // 🔹 Firestore 기록
    await docRef.set({ wallet, timestamp: Date.now() });

    // 🔔 Slack 알림 (optional)
    try {
      await sendSlackNotification(`📥 *Airdrop Request Submitted*\n• 🧾 Wallet: \`${wallet}\``);
    } catch (err) {
      console.warn("⚠️ Slack notification failed:", (err as Error).message);
    }

// 🔄 자동 에어드랍 트리거 (절대 경로 fallback 포함)
const origin = "https://karen-world-clean.vercel.app";
const response = await fetch(`${origin}/api/airdrop`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ wallet }),
});

let result: any = null;
try {
  result = await response.json();
} catch (err) {
  console.warn("❌ Failed to parse JSON response:", await response.text());
  result = null;
}

if (!response.ok || !result) {
  await docRef.set(
    { wallet, timestamp: Date.now(), error: result?.error ?? "Unknown error" },
    { merge: true }
  );
  return res.status(500).json({ error: result?.error ?? "Airdrop execution failed" });
}

    return res.status(200).json({
      success: true,
      message: "Airdrop sent successfully",
      amount: result.amount ?? 2000,
      digest: result.digest,
    });
  } catch (err: any) {
    console.error("❌ Submit handler error:", err.message || err);
    return res.status(500).json({ error: "Submit failed" });
  }
}

console.log("🔥 submit API called");







