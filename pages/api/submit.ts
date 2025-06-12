import type { NextApiRequest, NextApiResponse } from "next";
import { admindb } from "@/firebase/admin";
import { sendSlackNotification } from "@/utils/slack";
import { handleAirdrop } from "@/lib/airdropHandler"; // ✅ 핵심 변경

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { wallet } = req.body;
  console.log("📨 /submit req.body:", req.body);

  if (!wallet || typeof wallet !== "string") {
    return res.status(400).json({ error: "Missing wallet address" });
  }

 try {
    const result = await handleAirdrop(wallet); // ✅ Firestore + Slack 모두 내부 처리
    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (err: any) {
    const errorMessage = err?.message || "Unknown error";

    console.error("❌ Submit handler error:", err);

    await sendSlackNotification(
      `❌ *Submit Handler Error*\n• 🧾 Wallet: \`${wallet}\`\n• 💥 Error: \`${errorMessage}\`\n• 🕓 ${new Date().toISOString()}`
    );

    return res.status(500).json({ error: errorMessage });
  }
}











