import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as dotenv from 'dotenv';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import serviceAccount from './firebase-key.json';

import { Ed25519Keypair, fromB64, RawSigner, JsonRpcProvider, Connection } from "@mysten/sui.js";

dotenv.config();

const CLAIM_PER_USER = 2000;
const MAX_AIRDROP = 20000000;

// Firebase 초기화
const app = initializeApp({
  credential: cert(serviceAccount as any),
});
const db = getFirestore(app);
const claimsRef = db.collection("airdrop").doc("claims").collection("claims");

// Sui 관련 설정
const PRIVATE_KEY = process.env.PRIVATE_KEY!;
const AIRDROP_WALLET_ADDRESS = process.env.AIRDROP_WALLET_ADDRESS!;
const AIRDROP_COIN_ID = process.env.AIR_DROP_COIN_ID!;
const KAREN_COIN_TYPE = process.env.KAREN_COIN_TYPE!;

const keypair = Ed25519Keypair.fromSecretKey(fromB64(PRIVATE_KEY));
const provider = new JsonRpcProvider(new Connection({ fullnode: "https://fullnode.mainnet.sui.io" }));
const signer = new RawSigner(keypair, provider);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const wallet = req.body.wallet;
  if (!wallet || typeof wallet !== 'string') {
    return res.status(400).json({ error: 'Missing wallet address' });
  }

  const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
  const SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID;

  if (!SLACK_BOT_TOKEN || !SLACK_CHANNEL_ID) {
    return res.status(500).json({ error: 'Slack configuration missing' });
  }

  try {
    // 중복 체크 (Slack 메시지 기록 확인)
    const historyRes = await fetch(`https://slack.com/api/conversations.history?channel=${SLACK_CHANNEL_ID}`, {
      headers: {
        Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
      },
    });
    const historyData = await historyRes.json();
    if (!historyData.ok) throw new Error(historyData.error || 'Slack API history fetch error');

    const messages = historyData.messages || [];
    const alreadyClaimed = messages.some((msg: any) => msg.text?.includes(wallet));
    if (alreadyClaimed) {
      return res.status(400).json({ error: 'Wallet already claimed' });
    }

    const claimed = messages.length * CLAIM_PER_USER;
    if (claimed + CLAIM_PER_USER > MAX_AIRDROP) {
      return res.status(400).json({ error: 'Airdrop cap reached' });
    }

    // Slack 알림 전송
    const postRes = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel: SLACK_CHANNEL_ID,
        text: `🎉 New Airdrop Claim!\n\nWallet: ${wallet}\nAmount: ${CLAIM_PER_USER} $KAREN`,
      }),
    });

    const postData = await postRes.json();
    if (!postData.ok) {
      console.error('❌ Slack message error:', postData.error);
      return res.status(500).json({ error: 'Slack message failed' });
    }

    // ✅ SUI 전송 실행
    const result = await signer.pay({
      inputCoins: [AIRDROP_COIN_ID],
      recipients: [wallet],
      amounts: [CLAIM_PER_USER],
      gasBudget: 100_000_000,
    });

    console.log("✅ Airdrop tx sent:", result.digest);

    // ✅ Firestore 기록
    await claimsRef.doc(wallet).set({
      status: "sent",
      txId: result.digest,
      amount: CLAIM_PER_USER,
      sentAt: Timestamp.now(),
    });

    console.log("✅ Firestore updated for", wallet);

    return res.status(200).json({ message: 'Airdrop claimed', amount: CLAIM_PER_USER, txId: result.digest });
  } catch (err: any) {
    console.error('❌ Submit handler error:', err);
    return res.status(500).json({ error: 'Internal error', detail: err.message });
  }
}