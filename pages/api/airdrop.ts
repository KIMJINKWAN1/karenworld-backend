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

  console.log("✅ Reached airdrop call");

  const { wallet } = req.body;
  console.log("📨 /airdrop req.body:", req.body);

  if (!wallet) {
    console.error("❌ Missing wallet in /airdrop");
    return res.status(400).json({ error: "Missing wallet" });
  }

  // ✅ 주소 유효성 검사 (EVM or Sui)
  const isValidHex = typeof wallet === 'string' && /^0x[a-fA-F0-9]{40,64}$/.test(wallet);
  const isValidSui = typeof wallet === 'string' && /^[a-f0-9]{64}$/i.test(wallet);
  if (!isValidHex && !isValidSui) {
    console.warn(`⚠️ Invalid wallet submitted: ${wallet}`);
    return res.status(400).json({ message: 'Invalid wallet address' });
  }

  const queueRef = admindb.collection('airdrop').doc('claims').collection('queue').doc(wallet);
  const claimsRef = admindb.collection('airdrop').doc('claims').collection('claims').doc(wallet);

  try {
    const [claimedSnap, queuedSnap] = await Promise.all([
      claimsRef.get(),
      queueRef.get(),
    ]);

    if (claimedSnap.exists) {
      console.info(`ℹ️ Already claimed: ${wallet}`);
      return res.status(200).json({ message: 'Already claimed' });
    }

    if (queuedSnap.exists) {
      console.info(`ℹ️ Already in queue: ${wallet}`);
      return res.status(200).json({ message: 'Already queued' });
    }

    await queueRef.set({ wallet, createdAt: Date.now() });
    console.log(`✅ Queued airdrop wallet: ${wallet}`);

    await sendSlackNotification(
      `📥 *New Airdrop Request* 등록됨\n• 🧾 Wallet: \`${wallet}\`\n• 🌐 [조회링크](https://karenworld-clean.vercel.app/admin/airdrop-log?search=${wallet})\n• 🕓 ${new Date().toISOString()}`
    );

    const responseBody = { message: 'Successfully queued for airdrop' };
    console.log("✅ Response ok:", true);
    console.log("✅ Response body:", responseBody);

    return res.status(200).json(responseBody);
  } catch (err: any) {
    const errorMessage = err?.message || String(err);
    console.error(`❌ Error queuing airdrop for ${wallet}: ${errorMessage}`);

    await sendSlackNotification(
      `❌ *Airdrop Queue Error*\n• 🧾 Wallet: \`${wallet}\`\n• 💥 Error: \`${errorMessage}\`\n• 🕓 ${new Date().toISOString()}`
    );

    const errorResponse = { message: 'Server error. Try again later.' };
    console.log("✅ Response ok:", false);
    console.log("✅ Response body:", errorResponse);

    return res.status(500).json(errorResponse);
  }
}





