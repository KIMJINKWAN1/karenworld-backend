import type { VercelRequest, VercelResponse } from '@vercel/node';
import fetch from 'node-fetch';

const CLAIM_PER_USER = 2000;
const MAX_AIRDROP = 20000000;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
  const SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID;

  if (!SLACK_BOT_TOKEN || !SLACK_CHANNEL_ID) {
    return res.status(500).json({ error: 'Slack configuration missing' });
  }

  try {
    const slackRes = await fetch(`https://slack.com/api/conversations.history?channel=${SLACK_CHANNEL_ID}`, {
      headers: {
        Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
      },
    });

    const slackData = await slackRes.json();
    if (!slackData.ok) throw new Error(slackData.error || 'Failed to fetch Slack messages');

    const messages = slackData.messages || [];
    const totalClaims = messages.length;
    const claimed = totalClaims * CLAIM_PER_USER;
    const remaining = Math.max(0, MAX_AIRDROP - claimed);
    const percent = ((claimed / MAX_AIRDROP) * 100).toFixed(2);

    // ✅ 추가: 특정 지갑의 수령 여부 확인
    const wallet = req.query.address as string;
    let alreadyClaimed = false;
    if (wallet) {
      alreadyClaimed = messages.some((msg: any) => msg.text?.includes(wallet));
    }

    return res.status(200).json({
      status: 'ok',
      total: MAX_AIRDROP,
      claimed,
      remaining,
      percent,
      ...(wallet && { wallet, alreadyClaimed }),
    });
  } catch (err: any) {
    console.error('❌ Error fetching airdrop status:', err);
    return res.status(500).json({ error: 'Failed to fetch airdrop status' });
  }
}c