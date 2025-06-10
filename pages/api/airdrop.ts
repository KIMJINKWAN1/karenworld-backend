import type { NextApiRequest, NextApiResponse } from 'next';
import { admindb } from '@/firebase/admin';
import { sendSlackNotification } from '@/utils/slack';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    console.warn(`❌ Invalid method: ${req.method}`);
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { address } = req.body;

  // ✅ 1. 주소 유효성 검사
  if (
    typeof address !== 'string' ||
    !/^0x[a-fA-F0-9]{40,64}$/.test(address)
  ) {
    console.warn(`⚠️ Invalid address submitted: ${address}`);
    return res.status(400).json({ message: 'Invalid wallet address' });
  }

  const queueRef = admindb.collection('airdrop').doc('claims').collection('queue').doc(address);
  const claimsRef = admindb.collection('airdrop').doc('claims').collection('claims').doc(address);

  try {
    // ✅ 2. 이미 수령 or 등록 여부 확인
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

    // ✅ 3. Firestore 등록
    await queueRef.set({ address, createdAt: Date.now() });
    console.log(`✅ Queued airdrop address: ${address}`);

    // ✅ 4. Slack 알림 전송
    await sendSlackNotification(
      `📥 *New Airdrop Request* 등록됨\n• 🧾 Wallet: \`${address}\`\n• 🕓 Time: ${new Date().toISOString()}`
    );

    return res.status(200).json({ message: 'Successfully queued for airdrop' });
  } catch (err: any) {
    const errorMessage = err?.message || String(err);
    console.error(`❌ Error queuing airdrop for ${address}: ${errorMessage}`);

    await sendSlackNotification(
      `❌ *Airdrop Queue Error*\n• 🧾 Wallet: \`${address}\`\n• 💥 Error: \`${errorMessage}\`\n• 🕓 Time: ${new Date().toISOString()}`
    );

    return res.status(500).json({ message: 'Server error. Try again later.' });
  }
}

