import type { NextApiRequest, NextApiResponse } from "next";
import { admindb } from "@/firebase/admin";
import { sendSlackNotification } from "@/utils/slack";

// 🔧 상수 설정
const COLLECTION_PATH = process.env.AIRDROP_COLLECTION_PATH || "airdrop/queue/queue";
const ORIGIN = process.env.NEXT_PUBLIC_SITE_URL || "https://karen-world-clean.vercel.app";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // ✅ CORS 설정
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    console.warn(`❌ Invalid method: ${req.method}`);
    return res.status(405).json({ error: "Method not allowed" });
  }

  // ✅ 요청 본문 파싱
  const { wallet } = req.body;
  console.log("📨 /submit req.body:", req.body);

  if (!wallet || typeof wallet !== "string") {
    console.error("❌ Missing or invalid wallet:", wallet);
    return res.status(400).json({ error: "Missing wallet address" });
  }

  try {
    // 🔐 Firestore 기록
    const queueRef = admindb.collection(COLLECTION_PATH).doc(wallet);
    await queueRef.set({ wallet, timestamp: Date.now() });

    console.log(`✅ Address submitted to queue: ${wallet}`);

    // 🌐 /api/airdrop 호출
    const response = await fetch(`${ORIGIN}/api/airdrop`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet }),
    });


    // 📦 응답 파싱
    let result;
try {
  result = await response.json();
} catch (e) {
  const text = await response.text();
  console.warn("❌ JSON 파싱 실패, 원본 응답:", text);
  result = null;
}

    // ❌ 에러 응답 처리
    if (!response.ok || !result) {
      await queueRef.set(
        { wallet, timestamp: Date.now(), error: result?.error ?? "Unknown error" },
        { merge: true }
      );

      await sendSlackNotification(
        `❌ *Submit → Airdrop API Failed*\n• 🧾 \`${wallet}\`\n• 🔥 Error: \`${result?.error ?? "Unknown error"}\``
      );

      return res.status(500).json({ error: result?.error ?? "Airdrop execution failed" });
    }

    // ✅ 성공 응답
    return res.status(200).json({
      success: true,
      message: "Airdrop sent successfully",
      amount: result.amount ?? 2000,
      digest: result.digest,
    });

  } catch (err: any) {
    const errorMessage = err?.message || JSON.stringify(err) || "Unknown error";
    console.error("❌ Submit handler error:", err);

    await sendSlackNotification(
      `❌ *Submit Handler Error*\n• 🧾 Wallet: \`${wallet}\`\n• 💥 Error: \`${errorMessage}\`\n• 🕓 ${new Date().toISOString()}`
    );

    return res.status(500).json({ error: errorMessage });
  }
}









