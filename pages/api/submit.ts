import type { NextApiRequest, NextApiResponse } from "next";
import { adminDb } from "../firebase/admin";
import { sendSlackNotification } from "../utils/slack";

const COLLECTION_PATH = "airdrop/claims/claims";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // ✅ CORS 처리
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
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
    return res.status(400).json({ error: "Already submitted" });
  }

  if (!process.env.NEXT_PUBLIC_BASE_URL) {
    return res.status(500).json({ error: "Missing NEXT_PUBLIC_BASE_URL" });
  }

  try {
    await docRef.set({ wallet, timestamp: Date.now() });

    // 🔔 Slack 알림 전송 (실패해도 무시)
    try {
      await sendSlackNotification(`📥 *Airdrop Request Submitted*\n• 🧾 Wallet: \`${wallet}\``);
    } catch (err) {
      console.warn("⚠️ Slack notification failed:", err);
    }

    // 🎯 자동 전송 트리거
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/airdrop`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet }),
    });

    const result = await response.json();

    if (!response.ok) {
      // ❗ 실패 기록 저장
      await docRef.set({ wallet, timestamp: Date.now(), error: result.error }, { merge: true });
      console.error("❌ Airdrop failed in submit.ts:", result.error);
      return res.status(500).json({ error: "Airdrop execution failed" });
    }

    return res.status(200).json({
      success: true,
      message: "Airdrop sent successfully",
      digest: result.digest,
    });
  } catch (err: any) {
    console.error("❌ Submit error:", err);
    return res.status(500).json({ error: "Submit failed" });
  }
}


