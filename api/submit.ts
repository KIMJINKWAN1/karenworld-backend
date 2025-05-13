import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import fetch from 'node-fetch';

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
    const slackBotToken = process.env.SLACK_BOT_TOKEN;
    const slackChannelId = process.env.SLACK_CHANNEL_ID;

    if (!slackBotToken || !slackChannelId) {
      throw new Error("Missing Slack credentials");
    }

    const slackRes = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${slackBotToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channel: slackChannelId,
        text: `🎉 New Airdrop Claim!\n\nWallet: ${wallet}\nAmount: ${CLAIM_PER_USER} $KAREN`,
      }),
    });

    const slackData = await slackRes.json();

    if (!slackData.ok) {
      throw new Error(`Slack API Error: ${slackData.error}`);
    }

    return res.status(200).json({ message: "Airdrop claimed", amount: CLAIM_PER_USER });
  } catch (error: any) {
    console.error("Slack send error:", error);
    return res.status(500).json({ error: "Slack failed" });
  }
}