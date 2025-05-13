import type { VercelRequest, VercelResponse } from '@vercel/node';

const CLAIM_PER_USER = 2000;
const claimedWallets = new Set<string>();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = req.body;
    console.log("📦 Incoming body:", body);

    const wallet = body?.wallet;

    if (!wallet || typeof wallet !== "string") {
      return res.status(400).json({ error: "Missing address" });
    }

    if (claimedWallets.has(wallet)) {
      return res.status(400).json({ error: "Already claimed" });
    }

    claimedWallets.add(wallet);

    const slackRes = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.SLACK_BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channel: process.env.SLACK_CHANNEL_ID,
        text: `🎉 New Airdrop Claim!\nWallet: ${wallet}\nAmount: ${CLAIM_PER_USER} $KAREN`,
      }),
    });

    const slackData = await slackRes.json();
    if (!slackData.ok) {
      console.error("❌ Slack error:", slackData);
      return res.status(500).json({ error: "Slack failed" });
    }

    return res.status(200).json({ message: "Airdrop claimed", amount: CLAIM_PER_USER });
  } catch (err) {
    console.error("❌ Server error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}