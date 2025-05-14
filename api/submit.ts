import type { VercelRequest, VercelResponse } from '@vercel/node';
import fetch from 'node-fetch';

const CLAIM_PER_USER = 2000;
const MAX_SUPPLY = 20000000;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { wallet } = req.body;

  if (!wallet || typeof wallet !== 'string') {
    return res.status(400).json({ error: 'Missing wallet address' });
  }

  const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
  const SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID;

  if (!SLACK_BOT_TOKEN || !SLACK_CHANNEL_ID) {
    return res.status(500).json({ error: 'Slack configuration missing' });
  }

  try {
    // 1️⃣ 슬랙 메시지 기록 가져오기
    const historyRes = await fetch(
      `https://slack.com/api/conversations.history?channel=${SLACK_CHANNEL_ID}`,
      {
        headers: {
          Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
        },
      }
    );

    const history = await historyRes.json();

    if (!history.ok) {
      console.error('❌ Slack history error:', history.error);
      return res.status(500).json({ error: 'Slack history failed' });
    }

    const claimedMessages = history.messages?.filter((msg: any) =>
      msg.text?.includes('🎉 New Airdrop Claim!')
    ) || [];

    const totalClaimed = claimedMessages.length * CLAIM_PER_USER;

    // 2️⃣ 최대 수량 초과 시 차단
    if (totalClaimed + CLAIM_PER_USER > MAX_SUPPLY) {
      return res.status(400).json({ error: 'Airdrop supply exhausted' });
    }

    // 3️⃣ 중복 체크
    const alreadyClaimed = claimedMessages.some((msg: any) =>
      msg.text?.includes(wallet)
    );

    if (alreadyClaimed) {
      return res.status(400).json({ error: 'Already claimed' });
    }

    // 4️⃣ Slack 메시지 전송
    const slackRes = await fetch('https://slack.com/api/chat.postMessage', {
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

    const result = await slackRes.json();

    if (!result.ok) {
      console.error('❌ Slack message error:', result.error);
      return res.status(500).json({ error: 'Slack message failed' });
    }

    return res.status(200).json({ message: 'Airdrop claimed', amount: CLAIM_PER_USER });
  } catch (err) {
    console.error('❌ Slack send error:', err);
    return res.status(500).json({ error: 'Slack failed' });
  }
}