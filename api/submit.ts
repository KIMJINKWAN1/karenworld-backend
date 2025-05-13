import type { VercelRequest, VercelResponse } from '@vercel/node';

const CLAIM_PER_USER = 2000;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { wallet } = req.body;

  if (!wallet || typeof wallet !== 'string') {
    return res.status(400).json({ error: 'Missing wallet' });
  }

  try {
    // Slack Bot Token 방식으로 메시지 전송
    const slackRes = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: 'C08PFBRD7D0', // 채널 ID 사용
        text: `🎉 New Airdrop Claim!\nWallet: ${wallet}\nAmount: ${CLAIM_PER_USER} $KAREN`,
      }),
    });

    const slackJson = await slackRes.json();

    if (!slackJson.ok) {
      console.error('❌ Slack error:', slackJson.error);
      return res.status(500).json({ error: 'Slack failed' });
    }

    return res.status(200).json({ message: 'Airdrop claimed', amount: CLAIM_PER_USER });
  } catch (error) {
    console.error('❌ Submit error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}