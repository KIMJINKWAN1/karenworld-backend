import type { NextApiRequest, NextApiResponse } from 'next';
import { sendSlackNotification } from '@/utils/slack';
import { handleAirdrop } from '@/lib/airdropHandler'; // ✅ 추가

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    console.warn(`❌ Invalid method: ${req.method}`);
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { wallet } = req.body;
  console.log("📨 /airdrop req.body:", req.body);

  if (!wallet) {
    console.error("❌ Missing wallet in /airdrop");
    return res.status(400).json({ error: "Missing wallet" });
  }

  try {
    const result = await handleAirdrop(wallet); // ✅ 핵심 변경
    console.log("✅ handleAirdrop 결과:", result);
    return res.status(200).json({ message: 'Successfully queued for airdrop' });
  } catch (err: any) {
    const errorMessage = err?.message || String(err);
    console.error(`❌ Error in /airdrop: ${errorMessage}`);

    await sendSlackNotification(
      `❌ *Airdrop Error (direct)*\n• 🧾 Wallet: \`${wallet}\`\n• 💥 Error: \`${errorMessage}\`\n• 🕓 ${new Date().toISOString()}`
    );

    return res.status(500).json({ message: 'Server error. Try again later.' });
  }
}





