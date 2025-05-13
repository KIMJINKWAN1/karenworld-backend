import type { VercelRequest, VercelResponse } from '@vercel/node';

const CLAIM_PER_USER = 2000;

// ✅ 중복 방지를 위한 전역 저장소 (런타임 간 지속되지 않음 - 참고용)
const claimedWallets = new Set<string>();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log("🔥 Incoming request to /submit");

  if (req.method !== "POST") {
    console.warn("❌ Invalid method:", req.method);
    return res.status(405).json({ error: "Method not allowed" });
  }

  // 🔍 요청 본문 확인
  const { wallet } = req.body;
  console.log("📦 Received wallet:", wallet);

  if (!wallet || typeof wallet !== "string") {
    console.error("❌ Missing or invalid wallet");
    return res.status(400).json({ error: "Missing wallet" });
  }

  // ✅ 중복 체크 (런타임 한정)
  if (claimedWallets.has(wallet)) {
    console.warn("⚠️ Already claimed:", wallet);
    return res.status(400).json({ error: "Already claimed" });
  }

  claimedWallets.add(wallet);

  // 🛠️ Slack 메시지 전송
  try {
    const slackToken = process.env.SLACK_BOT_TOKEN;
    const slackChannel = process.env.SLACK_CHANNEL_ID;

    if (!slackToken || !slackChannel) {
      console.error("❌ Missing Slack token or channel ID");
      return res.status(500).json({ error: "Slack config error" });
    }

    const slackRes = await fetch("https://slack.com/api/chat.postMessage", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${process.env.SLACK_BOT_TOKEN}`,
  },
  body: JSON.stringify({
    channel: process.env.SLACK_CHANNEL_ID,
    text: `🎉 New Airdrop Claim!\n\nWallet: ${wallet}\nAmount: ${CLAIM_PER_USER} $KAREN`,
  }),
});
    });

    const slackData = await slackRes.json();
    console.log("📡 Slack response:", slackData);

    if (!slackData.ok) {
      throw new Error(slackData.error || "Slack failed");
    }

    return res.status(200).json({ message: "Airdrop claimed", amount: CLAIM_PER_USER });
  } catch (err: any) {
    console.error("❌ Slack send error:", err);
    return res.status(500).json({ error: "Slack failed" });
  }
}