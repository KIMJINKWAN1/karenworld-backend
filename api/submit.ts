import type { VercelRequest, VercelResponse } from '@vercel/node';

const CLAIM_PER_USER = 2000;
const MAX_AIRDROP = 20000000;

const claimedWallets = new Set<string>();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { wallet } = req.body;

  if (!wallet || typeof wallet !== "string") {
    return res.status(400).json({ error: "Missing address" });
  }

  if (claimedWallets.has(wallet)) {
    return res.status(400).json({ error: "Already claimed" });
  }

  claimedWallets.add(wallet);

  try {
    const slackRes = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
      },
      body: JSON.stringify({
        channel: process.env.SLACK_CHANNEL_ID,
        text: `🎉 New Airdrop Claim!\nWallet: ${wallet}\nAmount: ${CLAIM_PER_USER} $KAREN`,
      }),
    });

    const result = await slackRes.json();
    if (!result.ok) {
      console.error("❌ Slack API error:", result);
      throw new Error("Slack failed");
    }

    return res.status(200).json({ message: "Airdrop claimed", amount: CLAIM_PER_USER });
  } catch (err: any) {
    console.error("❌ Submit handler error:", err);
    return res.status(500).json({ error: err.message || "Internal Server Error" });
  }
}