import { SuiClient, getFullnodeUrl, TransactionBlock } from "@mysten/sui.js/client";
import { Ed25519Keypair } from "@mysten/sui.js/keypairs/ed25519";
import { fromB64 } from "@mysten/sui.js/utils";
import { Firestore } from "firebase-admin/firestore";
import type { NextApiRequest, NextApiResponse } from "next";
import fetch from "node-fetch";

const sui = new SuiClient({ url: getFullnodeUrl("testnet") });

const keypair = Ed25519Keypair.fromSecretKey(fromB64(process.env.PRIVATE_KEY as string));
const COIN_OBJECT_ID = process.env.AIRDROP_COIN_ID!;
const CLAIM_PER_USER = 2000;
const MAX_AIRDROP = 20000000;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const db = new Firestore();
  const { wallet } = req.body;

  if (!wallet || !/^0x[a-fA-F0-9]{40,64}$/.test(wallet)) {
    return res.status(400).json({ error: "Invalid wallet address" });
  }

  const docRef = db.collection("claims").doc(wallet);
  const doc = await docRef.get();

  if (doc.exists) {
    return res.status(409).json({ error: "This wallet already claimed the airdrop." });
  }

  const snapshot = await db.collection("claims").get();
  const claimedAmount = snapshot.size * CLAIM_PER_USER;

  if (claimedAmount + CLAIM_PER_USER > MAX_AIRDROP) {
    return res.status(400).json({ error: "Airdrop limit exceeded" });
  }

  const tx = new TransactionBlock();
  const coin = tx.splitCoins(tx.object(COIN_OBJECT_ID), [tx.pure(CLAIM_PER_USER)]);
  tx.transferObjects([coin], tx.pure(wallet));

  try {
    const result = await sui.signAndExecuteTransactionBlock({
      signer: keypair,
      transactionBlock: tx,
      options: { showEffects: true },
    });

    if (result.effects?.status.status !== "success") {
      return res.status(500).json({ error: "Airdrop transfer failed" });
    }

    await docRef.set({
      status: "sent",
      txId: result.digest,
      amount: CLAIM_PER_USER,
      sentAt: new Date(),
    });

    // ✅ 슬랙 알림 전송
    const slackRes = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channel: process.env.SLACK_CHANNEL_ID,
        text: `🎉 *New Airdrop Sent!*\n• Wallet: \`${wallet}\`\n• Amount: ${CLAIM_PER_USER} $KAREN\n• Tx: https://explorer.sui.io/txblock/${result.digest}?network=mainnet`,
      }),
    });

    const slackResult = await slackRes.json();
    if (!slackResult.ok) {
      console.error("❌ Slack error:", slackResult.error);
    }

    return res.status(200).json({ success: true, txId: result.digest });
  } catch (error) {
    console.error("❌ Airdrop transfer error:", error);
    return res.status(500).json({ error: "Airdrop transfer exception" });
  }
}