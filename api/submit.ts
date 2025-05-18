import type { VercelRequest, VercelResponse } from '@vercel/node';

const CLAIM_PER_USER = 2000;
const MAX_AIRDROP = 20000000;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const wallet = req.body.wallet;
  if (!wallet || typeof wallet !== 'string') {
    return res.status(400).json({ error: 'Missing wallet address' });
  }

  const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
  const SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID;

  if (!SLACK_BOT_TOKEN || !SLACK_CHANNEL_ID) {
    return res.status(500).json({ error: 'Slack configuration missing' });
  }

  try {
    const historyRes = await fetch(`https://slack.com/api/conversations.history?channel=${SLACK_CHANNEL_ID}`, {
      headers: {
        Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
      },
    });
    const historyData = await historyRes.json();
    if (!historyData.ok) throw new Error(historyData.error || 'Slack API history fetch error');

    const messages = historyData.messages || [];

    const alreadyClaimed = messages.some((msg: any) => msg.text?.includes(wallet));
    if (alreadyClaimed) {
      return res.status(400).json({ error: 'Wallet already claimed' });
    }

    const claimed = messages.length * CLAIM_PER_USER;
    if (claimed + CLAIM_PER_USER > MAX_AIRDROP) {
      return res.status(400).json({ error: 'Airdrop cap reached' });
    }

    const postRes = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: SLACK_CHANNEL_ID,
        text: `🎉 New Airdrop Claim!\n\nWallet: ${wallet}\nAmount: ${CLAIM_PER_USER} $KAREN`,
      }),
    });

    const postData = await postRes.json();
    if (!postData.ok) {
      console.error('❌ Slack message error:', postData.error);
      return res.status(500).json({ error: 'Slack message failed' });
    }

    return res.status(200).json({ message: 'Airdrop claimed', amount: CLAIM_PER_USER });
  } catch (err: any) {
    console.error('❌ Slack send error:', err);
    return res.status(500).json({ error: 'Slack failed' });
  }
}