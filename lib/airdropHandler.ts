import { admindb } from '@/firebase/admin';
import { sendSlackNotification } from '@/utils/slack';

export async function handleAirdrop(wallet: string) {
    console.log("✅ 내부 airdropHandler 호출됨:", wallet);
  // ✅ 유효성 검사
  const isValidHex = typeof wallet === 'string' && /^0x[a-fA-F0-9]{40,64}$/.test(wallet);
  const isValidSui = typeof wallet === 'string' && /^[a-f0-9]{64}$/i.test(wallet);
  if (!isValidHex && !isValidSui) {
    throw new Error('Invalid wallet address');
  }

  const queueRef = admindb.collection('airdrop').doc('claims').collection('queue').doc(wallet);
  const claimsRef = admindb.collection('airdrop').doc('claims').collection('claims').doc(wallet);

  const [claimedSnap, queuedSnap] = await Promise.all([
    claimsRef.get(),
    queueRef.get(),
  ]);

  if (claimedSnap.exists) {
    return { message: 'Already claimed' };
  }

  if (queuedSnap.exists) {
    return { message: 'Already queued' };
  }

  await queueRef.set({ wallet, createdAt: Date.now() });

  await sendSlackNotification(
    `📥 *New Airdrop Request*
• 🧾 Wallet: \`${wallet}\`
• 🌐 [조회링크](https://karenworld-clean.vercel.app/admin/airdrop-log?search=${wallet})
• 🕓 ${new Date().toISOString()}`
  );

  return { message: 'Successfully queued for airdrop' };
}
