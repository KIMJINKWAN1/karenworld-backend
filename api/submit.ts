import type { VercelRequest, VercelResponse } from '@vercel/node';

const CLAIM_PER_USER = 2000;
const MAX_AIRDROP = 20000000;

// 글로벌 상태 (서버리스 환경에서는 매 호출마다 초기화됨 - 추후 DB 또는 KV Store 필요)
let claimedWallets = new Set<string>();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { wallet } = req.body;

  if (!wallet || typeof wallet !== "string") {
    return res.status(400).json({ error: "Invalid wallet address" });
  }

  if (claimedWallets.has(wallet)) {
    return res.status(400).json({ error: "Already claimed" });
  }

  // ✅ 에어드랍 처리
  claimedWallets.add(wallet);

  try {
    // ✅ Slack Webhook 메시지 전송 (text 필드만 필요함)
    const webhookUrl = process.env.SLACK_WEBHOOK;
    if (!webhookUrl) {
      throw new Error("Missing SLACK_WEBHOOK in environment variables");
    }

    const payload = {
      text: `🎉 New Airdrop Claim!\n\n👛 Wallet: ${wallet}\n🎁 Amount: ${CLAIM_PER_USER} $KAREN`,
    };

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Slack webhook failed: ${errorText}`);
    }

    return res.status(200).json({ message: "Airdrop claimed", amount: CLAIM_PER_USER });
  } catch (error: any) {
    console.error("❌ Slack Webhook Error:", error.message || error);
    return res.status(500).json({ error: "Failed to process airdrop" });
  }
}