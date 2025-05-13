import type { VercelRequest, VercelResponse } from '@vercel/node';
import fetch from 'node-fetch';

const CLAIM_PER_USER = 2000;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { wallet } = req.body;

  if (!wallet || typeof wallet !== "string") {
    return res.status(400).json({ error: "Missing address" });
  }

  const SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID;
  const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;

  if (!SLACK_CHANNEL_ID || !SLACK_BOT_TOKEN) {
    return res.status(500).json({ error: "Slack credentials missing" });
  }

  try {
    // 1. Slack에서 해당 주소로 메시지 보낸 기록이 있는지 조회
    const historyRes = await fetch(`https://slack.com/api/conversations.history?channel=${SLACK_CHANNEL_ID}`, {
      headers: {
        Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
      },
    });

    const historyData = await historyRes.json();

    if (!historyData.ok) {
      throw new Error(historyData.error || "Failed to fetch Slack history");
    }

    const alreadyClaimed = historyData.messages?.some((msg: any) =>
      msg.text?.includes(wallet)
    );

    if (alreadyClaimed) {
      return res.status(400).json({ error: "Already claimed" });
    }

    // 2. 에어드롭 메시지 전송
    const slackRes = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channel: SLACK_CHANNEL_ID,
        text: `🎉 New Airdrop Claim!\nWallet: ${wallet}\nAmount: ${CLAIM_PER_USER} $KAREN`,
      }),
    });

    const slackData = await slackRes.json();

    if (!slackData.ok) {
      throw new Error(slackData.error || "Slack failed");
    }

    return res.status(200).json({ message: "Airdrop claimed", amount: CLAIM_PER_USER });
  } catch (error: any) {
    console.error("Slack send error:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
}