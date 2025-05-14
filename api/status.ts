import type { VercelRequest, VercelResponse } from '@vercel/node';
import fetch from 'node-fetch';

const CLAIM_PER_USER = 2000;
const MAX_SUPPLY = 20000000;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
  const SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID;

  if (!SLACK_BOT_TOKEN || !SLACK_CHANNEL_ID) {
    return res.status(500).json({ error: "Slack environment variables are missing" });
  }

  try {
    // Slack 메시지 조회
    const slackHistoryRes = await fetch(
      `https://slack.com/api/conversations.history?channel=${SLACK_CHANNEL_ID}`,
      {
        headers: {
          Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
        },
      }
    );

    const history = await slackHistoryRes.json();

    if (!history.ok) {
      console.error("Slack history error:", history.error);
      return res.status(500).json({ error: "Slack history fetch failed" });
    }

    const claimMessages = history.messages?.filter((msg: any) =>
      msg.text?.includes("🎉 New Airdrop Claim!")
    ) || [];

    const claimed = claimMessages.length * CLAIM_PER_USER;
    const remaining = MAX_SUPPLY - claimed;
    const percent = ((claimed / MAX_SUPPLY) * 100).toFixed(2);

    const wallet = req.query.wallet as string;
    let claimedByWallet = false;

    if (wallet) {
      claimedByWallet = claimMessages.some((msg: any) =>
        msg.text?.includes(wallet)
      );
    }

    return res.status(200).json({
      status: "ok",
      total: MAX_SUPPLY,
      claimed,
      remaining,
      percent,
      ...(wallet && { claimedByWallet }),
    });
  } catch (err) {
    console.error("Slack fetch error:", err);
    return res.status(500).json({ error: "Slack fetch error" });
  }
}