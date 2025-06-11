import type { NextApiRequest, NextApiResponse } from "next";
import { admindb } from "@/firebase/admin";
import { sendSlackNotification } from "@/utils/slack";

const COLLECTION_PATH = process.env.AIRDROP_COLLECTION_PATH || "airdrop/queue/queue"; // ✅ 경로 재확인

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // ✅ CORS 설정
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  let wallet: string | undefined;
  try {
    wallet = req.body.wallet;
  } catch (err: any) {
    console.error("❌ Body parse error:", err);
    await sendSlackNotification(`❌ *Submit API 오류*\n• 📩 본문 파싱 실패: \`${err.message}\``);
    return res.status(400).json({ error: "Invalid request body" });
  }

  if (!wallet || typeof wallet !== "string") {
    await sendSlackNotification(`⚠️ *지갑 주소 누락 또는 잘못됨*\n• Payload: \`${JSON.stringify(req.body)}\``);
    return res.status(400).json({ error: "Missing wallet address" });
  }

  try {
    const docRef = admindb.collection(COLLECTION_PATH).doc(wallet);
    await docRef.set({ wallet, timestamp: Date.now() });

    const response = await fetch(`${req.headers.origin || "https://karen-world-clean.vercel.app"}/api/airdrop`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: wallet }),
    });

    let result: any = null;
    try {
      result = await response.json();
    } catch (err) {
      const fallback = await response.text();
      console.warn("❌ 응답 JSON 파싱 실패:", fallback);
      await sendSlackNotification(`❌ *Airdrop 응답 오류*\n• 📩 파싱 실패: \`${fallback}\``);
    }

    if (!response.ok || !result) {
      await docRef.set(
        { wallet, timestamp: Date.now(), error: result?.error ?? "Unknown error" },
        { merge: true }
      );

      await sendSlackNotification(`❌ *Airdrop 실행 실패*\n• 🧾 \`${wallet}\`\n• 오류: ${result?.error || "Unknown error"}`);
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
    await sendSlackNotification(`❌ *Submit API 예외 발생*\n• 🧾 Wallet: \`${wallet}\`\n• ⚠️ ${err.message}`);
    return res.status(500).json({ error: "Submit failed" });
  }
}








