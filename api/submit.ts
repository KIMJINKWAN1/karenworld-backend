import { VercelRequest, VercelResponse } from '@vercel/node';
import fetch from 'node-fetch';

let claims: string[] = [];

const CLAIM_PER_USER = 2000;
const MAX_AIRDROP = 20000000;
const { SLACK_WEBHOOK } = process.env;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { address } = req.body;
  if (!address || !address.startsWith('0x')) {
    return res.status(400).json({ error: 'Invalid address' });
  }

  if (claims.includes(address)) {
    return res.status(403).json({ error: 'Already claimed' });
  }

  const totalClaimed = claims.length * CLAIM_PER_USER;
  if (totalClaimed >= MAX_AIRDROP) {
    return res.status(403).json({ error: 'Airdrop fully claimed' });
  }

  try {
    await fetch(SLACK_WEBHOOK || '', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: `📥 New airdrop request: ${address}` })
    });

    claims.push(address);
    res.status(200).json({ ok: true, claimAmount: CLAIM_PER_USER });
  } catch (err) {
    res.status(500).json({ error: 'Webhook error' });
  }
}