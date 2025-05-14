import type { VercelRequest, VercelResponse } from "@vercel/node";

const CLAIM_PER_USER = 2000;
const MAX_AIRDROP = 20000000;

const claimedWallets = new Set<string>();
let totalClaimed = 0;

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

  // ✅ Log environment variables (for debugging)
  console.log("SLACK_BOT_TOKEN:", process.env.SLACK_BOT_TOKEN);
  console.log("SLACK_CHANNEL_ID:", process.env.SLACK_CHANNEL_ID);

  try {
    // ✅ Send Slack message via Bot Token
    const slackRes = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channel: process.env.SLACK_CHANNEL_ID,
        text: `🎉 New Airdrop Claim!\n\nWallet: ${wallet}\nAmount: ${CLAIM_PER_USER} $KAREN`,
      }),
    });

    const slackData = await slackRes.json();
    if (!slackData.ok) {
      console.error("Slack send error:", slackData);
      return res.status(500).json({ error: "Slack failed" });
    }

    claimedWallets.add(wallet);
    totalClaimed += CLAIM_PER_USER;

    return res.status(200).json({ amount: CLAIM_PER_USER });
  } catch (err: any) {
    console.error("Slack send error:", err);
    return res.status(500).json({ error: "Slack failed" });
  }
}