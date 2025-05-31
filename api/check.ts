import { VercelRequest, VercelResponse } from '@vercel/node';
import { adminDb } from "../../firebase/admin";
import fetch from 'node-fetch';

const { SLACK_CHANNEL_ID, SLACK_BOT_TOKEN } = process.env;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const { address } = req.body;
  if (!address || typeof address !== 'string' || !address.startsWith('0x')) {
    return res.status(400).json({ error: 'Invalid address' });
  }

  try {
    // 🔎 1. Firestore에서 중복 수령 여부 확인
    const doc = await adminDb.collection("airdrop/claims/claims").doc(address).get();
    const alreadyClaimed = doc.exists;

    // 🔎 2. Slack 제출 여부 확인
    let alreadySubmitted = false;
    if (SLACK_CHANNEL_ID && SLACK_BOT_TOKEN) {
      const slackRes = await fetch(
        `https://slack.com/api/conversations.history?channel=${SLACK_CHANNEL_ID}&limit=1000`,
        {
          headers: {
            Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
          },
        }
      );

      const slackJson = await slackRes.json();
      if (slackJson.ok) {
        alreadySubmitted = slackJson.messages?.some(
          (msg: any) => typeof msg.text === 'string' && msg.text.includes(address)
        );
      } else {
        console.warn('Slack API error:', slackJson.error);
      }
    }

    return res.status(200).json({
      alreadyClaimed,
      alreadySubmitted,
    });
  } catch (err) {
    console.error('❌ check.ts error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
