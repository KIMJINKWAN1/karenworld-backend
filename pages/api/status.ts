import { VercelRequest, VercelResponse } from '@vercel/node';

let claims: string[] = [];

const CLAIM_PER_USER = 2000;
const MAX_AIRDROP = 20000000;

export default function handler(req: VercelRequest, res: VercelResponse) {
  const totalClaimed = claims.length * CLAIM_PER_USER;
  const remaining = Math.max(0, MAX_AIRDROP - totalClaimed);
  const percent = Math.min(100, ((totalClaimed / MAX_AIRDROP) * 100).toFixed(1));
  res.status(200).json({ totalClaimed, remaining, max: MAX_AIRDROP, percent });
}