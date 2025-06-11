import type { NextApiRequest, NextApiResponse } from "next";
import { admindb } from "@/firebase/admin";
import { sendSlackNotification } from "@/utils/slack";

const COLLECTION_PATH = process.env.AIRDROP_COLLECTION_PATH || "airdrop/queue/queue";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // ✅ CORS 설정
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") {
    console.warn(`❌ Invalid method: ${req.method}`);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { wallet } = req.body;
  if (!wallet || typeof wallet !== "string") {
    const msg = `❗ Missing or invalid wallet: ${wallet}`;
    console.warn(msg);
    await sendSlackNotification(`❗ *Submit Error*: ${msg}`);
    return res.status(400).json({ error: "Missing wallet address" });
  }

  try {
    const db = admindb;
    const docRef = db.collection(COLLECTION_PATH).doc(wallet);

    // 🔹 Firestore 기록
    await docRef.set({ wallet, timestamp: Date.now() });

    // 🔔 Slack 알림
    await sendSlackNotification(
      `📥 *Airdrop Request Submitted*\n• 🧾 Wallet: \`${wallet}\`\n• 🌐 [조회](https://karenworld-clean.vercel.app/admin/airdrop-log?search=${wallet})\n• 🕓 ${new Date().toISOString()}`
    );

    // 🔄 자동 에어드랍 트리거
    const origin = "https://karen-world-clean.vercel.app";
    const response = await fetch(`${origin}/api/airdrop`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: wallet }),
    });

    let result: any = null;
    try {
      result = await response.json();
    } catch (err) {
      const errorText = await response.text();
      console.warn("❌ Failed to parse JSON response:", errorText);
      await sendSlackNotification(
        `❌ *Airdrop Response JSON 파싱 실패*\n• Wallet: \`${wallet}\`\n• Response: \n\`\`\`${errorText}\`\`\``
      );
      result = null;
    }

    if (!response.ok || !result) {
      const errMsg = result?.error ?? "Airdrop execution failed";
      await docRef.set(
        { wallet, timestamp: Date.now(), error: errMsg },
        { merge: true }
      );
      await sendSlackNotification(
        `❌ *Airdrop Execution Failed*\n• Wallet: \`${wallet}\`\n• Error: \`${errMsg}\`\n• Status: ${response.status}`
      );
      return res.status(500).json({ error: errMsg });
    }

    return res.status(200).json({
      success: true,
      message: "Airdrop sent successfully",
      amount: result.amount ?? 2000,
      digest: result.digest,
    });
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    console.error("❌ Submit handler error:", errMsg);

    await sendSlackNotification(
      `❌ *Submit API Error*\n• Wallet: \`${wallet}\`\n• 💥 Error: \`${errMsg}\`\n• 🕓 ${new Date().toISOString()}`
    );

    return res.status(500).json({ error: "Submit failed" });
  }
}








