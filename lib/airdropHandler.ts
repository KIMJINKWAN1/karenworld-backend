import { admindb } from '@/firebase/admin';
import { sendSlackNotification } from '@/utils/slack';

export async function handleAirdrop(wallet: string) {
  console.log('✅ 내부 airdropHandler 호출됨:', wallet);

  const isValidHex = typeof wallet === 'string' && /^0x[a-fA-F0-9]{40,64}$/.test(wallet);
  const isValidSui = typeof wallet === 'string' && /^[a-f0-9]{64}$/i.test(wallet);
  if (!isValidHex && !isValidSui) {
    throw new Error('Invalid wallet address');
  }

  const queueRef = admindb
    .collection('airdrop')
    .doc('queue')
    .collection('queue')
    .doc(wallet);
  const claimsRef = admindb
    .collection('airdrop')
    .doc('prod')
    .collection('claims')
    .doc(wallet);

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

  const now = new Date().toISOString();

  await sendSlackNotification(
    [
      '📥 *New Airdrop Request* 등록됨',
      `• 🧾 Wallet: \`${wallet}\``,
      '• 🕶️ 네트워크: `Sui Mainnet`',
      '• 📦 패키지: `KAREN_WORLD`',
      '• 🔐 에어드랍 지갑: `0x654ed0...a0df`',
      `• 🌐 [🔍 관리자 조회 링크](https://karenworld-clean.vercel.app/admin/airdrop-log?search=${wallet})`,
      `• 🕓 요청 시간: \`${now}\``,
    ].join('\n')
  );

  return { message: 'Successfully queued for airdrop' };
}
