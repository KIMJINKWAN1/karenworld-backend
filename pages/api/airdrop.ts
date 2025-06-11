import type { NextApiRequest, NextApiResponse } from 'next';
import { admindb } from '@/firebase/admin';
import { sendSlackNotification } from '@/utils/slack';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // ✅ CORS 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    console.warn(`❌ Invalid method: ${req.method}`);
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { address } = req.body;

  // ✅ 주소 유효성 검사 (EVM or Sui)
  const isValidHex = typeof address === 'string' && /^0x[a-fA-F0-9]{40,64}$/.test(address);
  const isValidSui = typeof address === 'string' && /^[a-f0-9]{64}$/i.test(address);
  if (!isValidHex && !isValidSui) {
    console.warn(`⚠️ Invalid address submitted: ${address}`);
    return res.status(400).json({ message: 'Invalid wallet address' });
  }

  const queueRef = admindb.collection('airdrop').doc('claims').collection('queue').doc(address);
  const claimsRef = admindb.collection('airdrop').doc('claims').collection('claims').doc(address);

  try {
    const [claimedSnap, queuedSnap] = await Promise.all([
      claimsRef.get(),
      queueRef.get(),
    ]);

    if (claimedSnap.exists) {
      console.info(`ℹ️ Already claimed: ${address}`);
      return res.status(200).json({ message: 'Already claimed' });
    }

    if (queuedSnap.exists) {
      console.info(`ℹ️ Already in queue: ${address}`);
      return res.status(200).json({ message: 'Already queued' });
    }

    await queueRef.set({ address, createdAt: Date.now() });
    console.log(`✅ Queued airdrop address: ${address}`);

    await sendSlackNotification(
      `📥 *New Airdrop Request* 등록됨\n• 🧾 Wallet: \`${address}\`\n• 🌐 [조회링크](https://karenworld-clean.vercel.app/admin/airdrop-log?search=${address})\n• 🕓 ${new Date().toISOString()}`
    );

    return res.status(200).json({ message: 'Successfully queued for airdrop' });
  } catch (err: any) {
    const errorMessage = err?.message || String(err);
    console.error(`❌ Error queuing airdrop for ${address}: ${errorMessage}`);

    await sendSlackNotification(
      `❌ *Airdrop Queue Error*\n• 🧾 Wallet: \`${address}\`\n• 💥 Error: \`${errorMessage}\`\n• 🕓 ${new Date().toISOString()}`
    );

    return res.status(500).json({ message: 'Server error. Try again later.' });
  }
}


