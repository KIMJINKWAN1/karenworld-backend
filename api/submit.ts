import type { VercelRequest, VercelResponse } from '@vercel/node';
import admin from 'firebase-admin';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { Ed25519Keypair, fromExportedKeypair } from '@mysten/sui.js/keypairs/ed25519';
import { getFullnodeUrl, SuiClient } from '@mysten/sui.js/client';
import { TransactionBlock } from '@mysten/sui.js/transactions';

// ✅ Firestore 초기화
if (!getApps().length) {
  initializeApp({
    credential: cert(JSON.parse(process.env.FIREBASE_KEY as string)),
  });
}
const db = getFirestore();
const claimsRef = db.collection('airdrop').doc('claims').collection('claims');

// ✅ 환경변수
const CLAIM_PER_USER = 2000;
const MAX_AIRDROP = 20000000;
const PRIVATE_KEY = process.env.PRIVATE_KEY!;
const AIRDROP_COIN_ID = process.env.AIR_DROP_COIN_ID!;
const COIN_TYPE = process.env.KAREN_COIN_TYPE!;
const SENDER_ADDRESS = process.env.AIRDROP_WALLET_ADDRESS!;
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN!;
const SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID!;

// ✅ SUI 클라이언트 초기화
const sui = new SuiClient({ url: getFullnodeUrl('mainnet') });
const keypair = fromExportedKeypair({
  schema: 'ED25519',
  privateKey: PRIVATE_KEY,
}) as Ed25519Keypair;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const wallet = req.body.wallet;
  if (!wallet || typeof wallet !== 'string') {
    return res.status(400).json({ error: 'Missing wallet address' });
  }

  try {
    // ✅ 중복 수령 체크
    const doc = await claimsRef.doc(wallet).get();
    if (doc.exists) {
      return res.status(400).json({ error: 'Already claimed' });
    }

    // ✅ 총 발행량 체크
    const snapshot = await claimsRef.get();
    const totalClaimed = snapshot.size * CLAIM_PER_USER;
    if (totalClaimed + CLAIM_PER_USER > MAX_AIRDROP) {
      return res.status(400).json({ error: 'Airdrop cap reached' });
    }

    // ✅ 전송 트랜잭션 실행
    const tx = new TransactionBlock();
    const [coin] = tx.splitCoins(tx.object(AIRDROP_COIN_ID), [tx.pure(CLAIM_PER_USER)]);
    tx.transferObjects([coin], tx.pure(wallet));

    const result = await sui.signAndExecuteTransactionBlock({
      transactionBlock: tx,
      signer: keypair,
      options: { showEffects: true },
    });

    if (!result?.digest) {
      console.error("❌ No tx digest returned from transfer");
      return res.status(500).json({ error: 'Transaction failed', detail: 'No txId' });
    }

    // ✅ Firestore 기록
    await claimsRef.doc(wallet).set({
      status: "sent",
      txId: result.digest,
      amount: CLAIM_PER_USER,
      sentAt: Timestamp.now(),
    });
    console.log("✅ Firestore updated for", wallet);

    // ✅ Slack 알림 전송
    const slackRes = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: SLACK_CHANNEL_ID,
        text: `🎉 Airdrop Sent!\nWallet: ${wallet}\nAmount: ${CLAIM_PER_USER} $KAREN\nTxID: ${result.digest}`,
      }),
    });

    const slackData = await slackRes.json();
    if (!slackData.ok) {
      console.error('❌ Slack post error:', slackData.error);
    }

    return res.status(200).json({
      message: 'Airdrop claimed',
      amount: CLAIM_PER_USER,
      txId: result.digest,
    });
  } catch (err: any) {
    console.error('❌ Submit handler error:', err);
    return res.status(500).json({ error: 'Internal error', detail: err.message });
  }
}