import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Timestamp, getFirestore } from 'firebase-admin/firestore';
import { getFirebaseApp } from '@/lib/firebase-admin';
import { Ed25519Keypair, fromB64 } from '@mysten/sui.js/keypairs/ed25519';
import { SuiClient, getFullnodeUrl } from '@mysten/sui.js/client';
import { TransactionBlock } from '@mysten/sui.js/transactions';

const app = getFirebaseApp();
const db = getFirestore(app);

const CLAIM_PER_USER = 2000;
const MAX_AIRDROP = 20000000;

const PRIVATE_KEY = process.env.PRIVATE_KEY!;
const AIRDROP_COIN_ID = process.env.AIR_DROP_COIN_ID!;
const COIN_TYPE = process.env.KAREN_COIN_TYPE!;
const SENDER_ADDRESS = process.env.AIRDROP_WALLET_ADDRESS!;

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID;

const keypair = Ed25519Keypair.fromSecretKey(fromB64(PRIVATE_KEY).slice(1));
const sui = new SuiClient({ url: getFullnodeUrl('mainnet') });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const wallet = req.body.wallet?.toLowerCase();
  if (!wallet || !/^0x[0-9a-f]{40,64}$/.test(wallet)) {
    return res.status(400).json({ error: 'Invalid wallet address' });
  }

  const claimsRef = db.collection('airdrop').doc('claims').collection('claims');
  const docRef = claimsRef.doc(wallet);
  const docSnap = await docRef.get();

  if (docSnap.exists && docSnap.data()?.status === 'sent') {
    return res.status(400).json({ error: 'Already claimed' });
  }

  const allClaims = await claimsRef.get();
  const totalClaimed = allClaims.docs.filter(d => d.data()?.status === 'sent').length * CLAIM_PER_USER;
  if (totalClaimed + CLAIM_PER_USER > MAX_AIRDROP) {
    return res.status(400).json({ error: 'Airdrop cap reached' });
  }

  // ✅ 트랜잭션 생성 및 서명
  const tx = new TransactionBlock();
  const [coin] = tx.splitCoins(tx.object(AIRDROP_COIN_ID), [tx.pure(CLAIM_PER_USER)]);
  tx.transferObjects([coin], tx.pure(wallet));
  tx.setSender(SENDER_ADDRESS);

  const result = await sui.signAndExecuteTransactionBlock({
    transactionBlock: tx,
    signer: keypair,
    options: { showEffects: true },
  });

  if (result.effects?.status.status !== 'success') {
    return res.status(500).json({ error: 'Airdrop transfer failed' });
  }

  // ✅ Firestore 기록
  await docRef.set({
    status: 'sent',
    txId: result.digest,
    amount: CLAIM_PER_USER,
    sentAt: Timestamp.now(),
  });

  // ✅ Slack 알림 유지
  if (SLACK_BOT_TOKEN && SLACK_CHANNEL_ID) {
    await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: SLACK_CHANNEL_ID,
        text: `🎁 Airdrop sent!\nWallet: ${wallet}\nAmount: ${CLAIM_PER_USER} $KAREN\nTxID: ${result.digest}`,
      }),
    }).then(res => res.json())
      .then(data => {
        if (!data.ok) {
          console.error('❌ Slack message failed:', data.error);
        }
      });
  }

  return res.status(200).json({
    message: 'Airdrop sent',
    amount: CLAIM_PER_USER,
    txId: result.digest,
  });
}