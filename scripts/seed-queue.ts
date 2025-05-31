import { adminDb } from '../firebase/admin';

async function seedQueue() {
  const wallet = '0xabc123...';
  await adminDb.collection('airdrop/queue').doc(wallet).set({
    wallet,
    status: 'pending',
    timestamp: Date.now(),
  });
  console.log('✅ Seeded wallet into queue:', wallet);
}
seedQueue();