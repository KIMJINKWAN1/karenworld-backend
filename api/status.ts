import type { VercelRequest, VercelResponse } from '@vercel/node';
import fetch from 'node-fetch';

const CLAIM_PER_USER = 2000;
const MAX_AIRDROP = 20000000;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID;
  const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;

  if (!SLACK_CHANNEL_ID || !SLACK_BOT_TOKEN) {
    return res.status(500).json({ error: "Missing Slack credentials" });
  }

  try {
    // Slack API에서 메시지 수를 가져옴
    const response = await fetch(`https://slack.com/api/conversations.history?channel=${SLACK_CHANNEL_ID}`, {
      headers: {
        Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
      },
    });

    const data = await response.json();

    if (!data.ok) {
      throw new Error(data.error || "Slack API error");
    }

    const messageCount = data.messages?.length || 0;
    const claimed = messageCount * CLAIM_PER_USER;
    const remaining = MAX_AIRDROP - claimed;

    return res.status(200).json({
      status: "ok",
      claimed,
      remaining,
      total: MAX_AIRDROP,
      percent: ((claimed / MAX_AIRDROP) * 100).toFixed(2),
    });

  } catch (error) {
    console.error("Slack fetch error:", error);
    return res.status(500).json({ error: "Failed to fetch from Slack" });
  }
}