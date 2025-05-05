import { VercelRequest, VercelResponse } from '@vercel/node';
import fetch from 'node-fetch';

const { SLACK_CHANNEL_ID, SLACK_TOKEN } = process.env;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { address } = req.body;

  if (!address || !address.startsWith('0x')) {
    return res.status(400).json({ error: 'Invalid address' });
  }

  try {
    const result = await fetch(`https://slack.com/api/conversations.history?channel=${SLACK_CHANNEL_ID}`, {
      headers: { Authorization: `Bearer ${SLACK_TOKEN}` }
    });

    const json = await result.json();
    const alreadySubmitted = json.messages?.some((msg: any) => msg.text.includes(address));
    res.status(200).json({ alreadySubmitted });
  } catch (err) {
    res.status(500).json({ error: 'Slack check error' });
  }
}