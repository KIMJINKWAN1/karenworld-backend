import { NextApiRequest, NextApiResponse } from 'next';
import { fromB64 } from '@mysten/bcs';
import { Ed25519Keypair } from '@mysten/sui/cryptography';
import { getFullnodeUrl, SuiClient, TransactionBlock } from '@mysten/sui/client';
import dotenv from 'dotenv';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import serviceAccount from '../../firebase-key.json';
import fetch from 'node-fetch';

dotenv.config();

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount as any),
  });
}
const db = getFirestore();
const suiClient = new SuiClient({ url: getFullnodeUrl('testnet') });

// 슬랙 알림 전송 함수
async function sendSlackAlert(address: string, digest: string) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return;

  const text = `🎁 *Airdrop Completed!*\n📥 To: \`${address}\`\n🔗 Tx: https://suiexplorer.com/txblock/${digest}?network=testnet`;
  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { address } = req.query;
  const recipient = typeof address === 'string' ? address : null;

  const {
    PRIVATE_KEY,
    AIRDROP_WALLET_ADDRESS,
    KAREN_COIN_OBJECT_ID,
    KAREN_COIN_TYPE,
  } = process.env;

  if (!PRIVATE_KEY || !recipient || !KAREN_COIN_OBJECT_ID || !KAREN_COIN_TYPE) {
    return res.status(400).json({ error: 'Missing required env or address query' });
  }

  try {
    // 중복 수령 방지
    const claimRef = db
      .collection('airdrop')
      .doc('claims')
      .collection('claims')
      .doc(recipient);

    const doc = await claimRef.get();
    if (doc.exists) {
      return res.status(200).json({ status: 'already_claimed' });
    }

    // 트랜잭션 구성
    const secretKey = fromB64(PRIVATE_KEY);
    const keypair = Ed25519Keypair.fromSecretKey(secretKey);
    const tx = new TransactionBlock();

    tx.transferObjects([tx.object(KAREN_COIN_OBJECT_ID)], tx.pure.address(recipient));

    const result = await suiClient.signAndExecuteTransactionBlock({
      signer: keypair,
      transactionBlock: tx,
      options: {
        showEffects: true,
        showObjectChanges: true,
      },
    });

    const digest = result.digest;

    // DB 기록
    await claimRef.set({
      txHash: digest,
      sender: AIRDROP_WALLET_ADDRESS,
      timestamp: Date.now(),
    });

    // 슬랙 알림
    await sendSlackAlert(recipient, digest);

    return res.status(200).json({ status: 'success', txHash: digest });
  } catch (err: any) {
    console.error('❌ Airdrop error:', err);
    return res.status(500).json({ status: 'error', message: err.message });
  }
}

main().catch(console.error);
